// src/utils/BackupManager.ts
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { SecurityManager } from './SecurityManager';
import { Platform } from 'react-native';

export interface BackupData {
  version: string;
  timestamp: string;
  userId: string;
  userData: any;
  chatHistory: any[];
  settings: any;
  mediaReferences: string[];
}

export interface BackupOptions {
  includeMedia: boolean;
  includeSettings: boolean;
  includeChatHistory: boolean;
  encryptBackup: boolean;
  compressionLevel: 'none' | 'low' | 'medium' | 'high';
}

export interface RestoreOptions {
  mergeWithExisting: boolean;
  restoreMedia: boolean;
  restoreSettings: boolean;
  restoreChatHistory: boolean;
}

class BackupManager {
  private static instance: BackupManager;
  private readonly BACKUP_VERSION = '1.0.0';
  private readonly BACKUP_EXTENSION = '.fmb'; // Family Messenger Backup
  private readonly MAX_BACKUP_SIZE = 500 * 1024 * 1024; // 500MB limit

  static getInstance(): BackupManager {
    if (!BackupManager.instance) {
      BackupManager.instance = new BackupManager();
    }
    return BackupManager.instance;
  }

  async createBackup(options: BackupOptions = {
    includeMedia: false,
    includeSettings: true,
    includeChatHistory: true,
    encryptBackup: true,
    compressionLevel: 'medium'
  }): Promise<string | null> {
    try {
      console.log('🔄 Starting backup creation...');
      
      // Collect backup data
      const backupData = await this.collectBackupData(options);
      
      // Validate backup size
      const dataSize = JSON.stringify(backupData).length;
      if (dataSize > this.MAX_BACKUP_SIZE) {
        throw new Error(`Backup size (${(dataSize / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size`);
      }

      // Generate backup file
      const backupFileName = await this.generateBackupFile(backupData, options);
      
      console.log('✅ Backup created successfully:', backupFileName);
      return backupFileName;
    } catch (error) {
      console.error('❌ Backup creation failed:', error);
      return null;
    }
  }

  private async collectBackupData(options: BackupOptions): Promise<BackupData> {
    const userId = await SecurityManager.getToken('user_id') || 'unknown';
    
    const backupData: BackupData = {
      version: this.BACKUP_VERSION,
      timestamp: new Date().toISOString(),
      userId,
      userData: {},
      chatHistory: [],
      settings: {},
      mediaReferences: []
    };

    // Collect user data
    try {
      const userDataStr = await SecurityManager.getToken('user_data');
      if (userDataStr) {
        backupData.userData = JSON.parse(userDataStr);
        // Remove sensitive fields
        delete backupData.userData.password;
        delete backupData.userData.refreshToken;
      }
    } catch (error) {
      console.warn('Failed to collect user data:', error);
    }

    // Collect chat history
    if (options.includeChatHistory) {
      try {
        const chatHistoryStr = await SecurityManager.getToken('chat_history');
        if (chatHistoryStr) {
          let chatHistory = JSON.parse(chatHistoryStr);
          
          // Sanitize chat history
          chatHistory = chatHistory.map((message: any) => ({
            id: message.id,
            text: options.encryptBackup ? SecurityManager.encrypt(message.text) : message.text,
            timestamp: message.timestamp,
            senderId: message.senderId,
            chatId: message.chatId,
            type: message.type,
            // Exclude file data, keep only references
            mediaUrl: message.mediaUrl ? 'MEDIA_REFERENCE' : undefined
          }));

          backupData.chatHistory = chatHistory;
        }
      } catch (error) {
        console.warn('Failed to collect chat history:', error);
      }
    }

    // Collect settings
    if (options.includeSettings) {
      try {
        const settingsStr = await SecurityManager.getToken('app_settings');
        if (settingsStr) {
          backupData.settings = JSON.parse(settingsStr);
          // Remove sensitive settings
          delete backupData.settings.biometricEnabled;
          delete backupData.settings.deviceId;
        }
      } catch (error) {
        console.warn('Failed to collect settings:', error);
      }
    }

    // Collect media references (not actual files)
    if (options.includeMedia) {
      try {
        const mediaRefsStr = await SecurityManager.getToken('media_references');
        if (mediaRefsStr) {
          backupData.mediaReferences = JSON.parse(mediaRefsStr);
        }
      } catch (error) {
        console.warn('Failed to collect media references:', error);
      }
    }

    return backupData;
  }

  private async generateBackupFile(backupData: BackupData, options: BackupOptions): Promise<string> {
    let dataStr = JSON.stringify(backupData);

    // Apply compression
    if (options.compressionLevel !== 'none') {
      // Simple compression - in production use proper compression library
      dataStr = this.compressData(dataStr, options.compressionLevel);
    }

    // Encrypt entire backup if requested
    if (options.encryptBackup) {
      dataStr = SecurityManager.encrypt(dataStr);
    }

    // Create backup file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `family-messenger-backup-${timestamp}${this.BACKUP_EXTENSION}`;
    const filePath = `${FileSystem.documentDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(filePath, dataStr, {
      encoding: FileSystem.EncodingType.UTF8
    });

    // Log backup creation
    await this.logBackupEvent('created', fileName, {
      size: dataStr.length,
      encrypted: options.encryptBackup,
      compressed: options.compressionLevel !== 'none'
    });

    return filePath;
  }

  async shareBackup(backupFilePath: string): Promise<boolean> {
    try {
      if (!(await Sharing.isAvailableAsync())) {
        console.warn('Sharing is not available on this device');
        return false;
      }

      await Sharing.shareAsync(backupFilePath, {
        mimeType: 'application/octet-stream',
        dialogTitle: 'Share Family Messenger Backup'
      });

      await this.logBackupEvent('shared', backupFilePath);
      return true;
    } catch (error) {
      console.error('Failed to share backup:', error);
      return false;
    }
  }

  async restoreFromBackup(restoreOptions: RestoreOptions = {
    mergeWithExisting: false,
    restoreMedia: false,
    restoreSettings: true,
    restoreChatHistory: true
  }): Promise<boolean> {
    try {
      console.log('🔄 Starting backup restoration...');

      // Pick backup file
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true
      });

      if (result.canceled) {
        console.log('Backup restoration cancelled by user');
        return false;
      }

      const backupFile = result.assets[0];
      if (!backupFile.name.endsWith(this.BACKUP_EXTENSION)) {
        throw new Error('Invalid backup file format');
      }

      // Read and decrypt backup
      const backupData = await this.readBackupFile(backupFile.uri);
      
      // Validate backup
      if (!this.validateBackup(backupData)) {
        throw new Error('Invalid backup data');
      }

      // Restore data
      await this.restoreBackupData(backupData, restoreOptions);

      await this.logBackupEvent('restored', backupFile.name);
      console.log('✅ Backup restored successfully');
      return true;
    } catch (error) {
      console.error('❌ Backup restoration failed:', error);
      return false;
    }
  }

  private async readBackupFile(filePath: string): Promise<BackupData> {
    let content = await FileSystem.readAsStringAsync(filePath, {
      encoding: FileSystem.EncodingType.UTF8
    });

    // Try to decrypt if encrypted
    try {
      const decrypted = SecurityManager.decrypt(content);
      if (decrypted && decrypted !== content) {
        content = decrypted;
      }
    } catch (error) {
      // If decryption fails, assume it's not encrypted
    }

    // Try to decompress if compressed
    try {
      const decompressed = this.decompressData(content);
      if (decompressed && decompressed !== content) {
        content = decompressed;
      }
    } catch (error) {
      // If decompression fails, assume it's not compressed
    }

    return JSON.parse(content);
  }

  private validateBackup(backupData: BackupData): boolean {
    if (!backupData.version || !backupData.timestamp || !backupData.userId) {
      return false;
    }

    // Check version compatibility
    const [majorVersion] = backupData.version.split('.');
    const [currentMajorVersion] = this.BACKUP_VERSION.split('.');
    
    if (majorVersion !== currentMajorVersion) {
      console.warn('Backup version mismatch. May have compatibility issues.');
    }

    return true;
  }

  private async restoreBackupData(backupData: BackupData, options: RestoreOptions): Promise<void> {
    // Restore user data
    if (backupData.userData && Object.keys(backupData.userData).length > 0) {
      if (options.mergeWithExisting) {
        const existingData = await SecurityManager.getToken('user_data');
        const merged = existingData ? { ...JSON.parse(existingData), ...backupData.userData } : backupData.userData;
        await SecurityManager.storeToken('user_data', JSON.stringify(merged));
      } else {
        await SecurityManager.storeToken('user_data', JSON.stringify(backupData.userData));
      }
    }

    // Restore settings
    if (options.restoreSettings && backupData.settings) {
      if (options.mergeWithExisting) {
        const existingSettings = await SecurityManager.getToken('app_settings');
        const merged = existingSettings ? { ...JSON.parse(existingSettings), ...backupData.settings } : backupData.settings;
        await SecurityManager.storeToken('app_settings', JSON.stringify(merged));
      } else {
        await SecurityManager.storeToken('app_settings', JSON.stringify(backupData.settings));
      }
    }

    // Restore chat history
    if (options.restoreChatHistory && backupData.chatHistory) {
      // Decrypt messages if they were encrypted
      const chatHistory = backupData.chatHistory.map((message: any) => {
        if (message.text && message.text.includes('U2FsdGVkX1')) { // Encrypted data indicator
          try {
            message.text = SecurityManager.decrypt(message.text);
          } catch (error) {
            console.warn('Failed to decrypt message:', error);
          }
        }
        return message;
      });

      if (options.mergeWithExisting) {
        const existingHistory = await SecurityManager.getToken('chat_history');
        const existing = existingHistory ? JSON.parse(existingHistory) : [];
        const merged = [...existing, ...chatHistory];
        await SecurityManager.storeToken('chat_history', JSON.stringify(merged));
      } else {
        await SecurityManager.storeToken('chat_history', JSON.stringify(chatHistory));
      }
    }

    // Restore media references
    if (options.restoreMedia && backupData.mediaReferences) {
      if (options.mergeWithExisting) {
        const existingRefs = await SecurityManager.getToken('media_references');
        const existing = existingRefs ? JSON.parse(existingRefs) : [];
        const merged = [...existing, ...backupData.mediaReferences];
        await SecurityManager.storeToken('media_references', JSON.stringify(merged));
      } else {
        await SecurityManager.storeToken('media_references', JSON.stringify(backupData.mediaReferences));
      }
    }
  }

  private compressData(data: string, level: 'low' | 'medium' | 'high'): string {
    // Simple compression implementation
    // In production, use a proper compression library like pako or lz-string
    try {
      const compressionMap: { [key: string]: number } = {
        low: 1,
        medium: 2,
        high: 3
      };
      
      // Basic compression: remove extra whitespace and common patterns
      let compressed = data
        .replace(/\s+/g, ' ')
        .replace(/,"/g, ',"')
        .replace(/":"/g, '":"');

      if (compressionMap[level] >= 2) {
        // Replace common JSON patterns
        compressed = compressed
          .replace(/"timestamp":/g, '"ts":')
          .replace(/"senderId":/g, '"si":')
          .replace(/"chatId":/g, '"ci":');
      }

      return compressed;
    } catch (error) {
      console.warn('Compression failed, returning original data:', error);
      return data;
    }
  }

  private decompressData(data: string): string {
    // Reverse the compression process
    try {
      let decompressed = data
        .replace(/"ts":/g, '"timestamp":')
        .replace(/"si":/g, '"senderId":')
        .replace(/"ci":/g, '"chatId":');

      return decompressed;
    } catch (error) {
      console.warn('Decompression failed, returning original data:', error);
      return data;
    }
  }

  async getBackupHistory(): Promise<any[]> {
    try {
      const historyStr = await SecurityManager.getToken('backup_history');
      return historyStr ? JSON.parse(historyStr) : [];
    } catch (error) {
      console.error('Failed to get backup history:', error);
      return [];
    }
  }

  private async logBackupEvent(action: string, fileName: string, metadata: any = {}): Promise<void> {
    try {
      const history = await this.getBackupHistory();
      const event = {
        action,
        fileName: fileName.split('/').pop(), // Only store filename, not full path
        timestamp: new Date().toISOString(),
        platform: Platform.OS,
        metadata
      };

      history.push(event);

      // Keep only last 50 backup events
      if (history.length > 50) {
        history.splice(0, history.length - 50);
      }

      await SecurityManager.storeToken('backup_history', JSON.stringify(history));
    } catch (error) {
      console.error('Failed to log backup event:', error);
    }
  }

  async clearBackupHistory(): Promise<void> {
    try {
      await SecurityManager.removeToken('backup_history');
    } catch (error) {
      console.error('Failed to clear backup history:', error);
    }
  }

  async scheduleAutoBackup(intervalHours: number = 24): Promise<void> {
    // Auto backup scheduling implementation
    console.log(`Auto backup scheduled every ${intervalHours} hours`);
    // In production, use proper scheduling library or background tasks
  }
}

export default BackupManager;
