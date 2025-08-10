// src/utils/StorageChoice.ts
import { SecurityManager } from './SecurityManager';
import { DEFAULT_STORAGE_MODE, STORAGE_CONFIG } from '../config/storage';

export type StorageMode = 'local_only' | 'local_with_cloud' | 'cloud_primary';

export interface StorageSettings {
  mode: StorageMode;
  cloudEnabled: boolean;
  autoBackup: boolean;
  backupFrequency: 'daily' | 'weekly' | 'monthly';
  encryptBackups: boolean;
}

class StorageChoiceManager {
  private static instance: StorageChoiceManager;
  private currentMode: StorageMode = DEFAULT_STORAGE_MODE; // Default ən təhlükəsiz

  static getInstance(): StorageChoiceManager {
    if (!StorageChoiceManager.instance) {
      StorageChoiceManager.instance = new StorageChoiceManager();
    }
    return StorageChoiceManager.instance;
  }

  async initializeStorageChoice(): Promise<void> {
    try {
      // Load saved storage preference
      const savedMode = await SecurityManager.getToken('storage_mode');
      if (savedMode) {
        this.currentMode = savedMode as StorageMode;
      }
      
      console.log(`🔒 Storage mode initialized: ${this.currentMode}`);
    } catch (error) {
      console.error('Failed to initialize storage choice:', error);
      // Default to most secure mode
      this.currentMode = 'local_only';
    }
  }

  // USER CHOICE METHODS
  async setStorageMode(mode: StorageMode): Promise<boolean> {
    try {
      // Validate mode
      if (!['local_only', 'local_with_cloud', 'cloud_primary'].includes(mode)) {
        throw new Error('Invalid storage mode');
      }

      this.currentMode = mode;
      await SecurityManager.storeToken('storage_mode', mode);
      
      console.log(`✅ Storage mode updated to: ${mode}`);
      return true;
    } catch (error) {
      console.error('Failed to set storage mode:', error);
      return false;
    }
  }

  getCurrentMode(): StorageMode {
    return this.currentMode;
  }

  // SECURITY LEVELS
  isLocalOnly(): boolean {
    return this.currentMode === 'local_only';
  }

  isCloudEnabled(): boolean {
    return this.currentMode !== 'local_only';
  }

  isPrimaryLocal(): boolean {
    return this.currentMode === 'local_only' || this.currentMode === 'local_with_cloud';
  }

  // STORAGE OPERATIONS BASED ON MODE
  async storeUserData(key: string, data: any): Promise<boolean> {
    try {
      // Always store locally first (for speed and offline access)
      await SecurityManager.storeToken(key, JSON.stringify(data));
      
      // If cloud is enabled, also backup to cloud
      if (this.isCloudEnabled()) {
        // Cloud backup happens in background, don't wait for it
        this.backgroundCloudBackup(key, data);
      }

      return true;
    } catch (error) {
      console.error('Failed to store user data:', error);
      return false;
    }
  }

  async getUserData(key: string): Promise<any | null> {
    try {
      // Always try local first (fastest)
      const localData = await SecurityManager.getToken(key);
      
      if (localData) {
        return JSON.parse(localData);
      }

      // If local fails and cloud is enabled, try cloud
      if (this.isCloudEnabled()) {
        console.log('⏳ Attempting cloud recovery...');
        // Implement cloud recovery if needed
      }

      return null;
    } catch (error) {
      console.error('Failed to get user data:', error);
      return null;
    }
  }

  private async backgroundCloudBackup(key: string, data: any): Promise<void> {
    // This runs in background, doesn't block user operations
    try {
      console.log(`🔄 Background cloud backup for: ${key}`);
      // Implement cloud backup logic here when user enables it
    } catch (error) {
      console.error('Background cloud backup failed:', error);
      // Fail silently, local data is still safe
    }
  }

  // SECURITY INFORMATION FOR USER
  getSecurityInfo(): {
    mode: StorageMode;
    description: string;
    securityLevel: 'maximum' | 'high' | 'medium';
    features: string[];
    limitations: string[];
  } {
    switch (this.currentMode) {
      case 'local_only':
        return {
          mode: 'local_only',
          description: 'Bütün məlumatlar yalnız sizin telefonunuzda saxlanır',
          securityLevel: 'maximum',
          features: [
            '100% şəxsi məlumat',
            'İnternet lazım deyil',
            'Heç kim müdaxilə edə bilməz',
            'Ən sürətli işləmə',
            'Tam offline dəstək'
          ],
          limitations: [
            'Başqa telefonda məlumatlar görünməz',
            'Manual backup lazım',
            'Telefon itəndə məlumatlar gedər'
          ]
        };

      case 'local_with_cloud':
        return {
          mode: 'local_with_cloud',
          description: 'Əsas məlumatlar local, backup cloud-da',
          securityLevel: 'high',
          features: [
            'Əsas məlumatlar local-da',
            'Avtomatik encrypted backup',
            'Multi-device sync',
            'Offline işləyir',
            'Cloud recovery imkanı'
          ],
          limitations: [
            'İnternet bağlantısı sync üçün lazım',
            'Cloud provider-a etibar lazım',
            'Kiçik cloud xərci ola bilər'
          ]
        };

      case 'cloud_primary':
        return {
          mode: 'cloud_primary',
          description: 'Əsas məlumatlar cloud-da, local cache',
          securityLevel: 'medium',
          features: [
            'Multi-device full sync',
            'Real-time updates',
            'Avtomatik backup',
            'Telefon dəyişəndə məlumatlar qalır'
          ],
          limitations: [
            'İnternet bağlantısı lazım',
            'Cloud provider-a tam etibar',
            'Potensial privacy risklər'
          ]
        };

      default:
        return this.getSecurityInfo(); // Fallback to default
    }
  }

  // USER EDUCATION
  async showStorageChoiceModal(): Promise<StorageMode | null> {
    // This would show a modal to user explaining options
    console.log('📋 Storage choice modal would be shown here');
    
    const securityInfo = this.getSecurityInfo();
    console.log('Current security info:', securityInfo);
    
    // Return user's choice (simulated for now)
    return this.currentMode;
  }

  // MIGRATION BETWEEN MODES
  async migrateToMode(newMode: StorageMode): Promise<boolean> {
    try {
      const oldMode = this.currentMode;
      
      console.log(`🔄 Migrating from ${oldMode} to ${newMode}`);
      
      if (oldMode === newMode) {
        return true; // No change needed
      }

      // Handle migration logic based on modes
      switch (`${oldMode}_to_${newMode}`) {
        case 'local_only_to_local_with_cloud':
          return await this.enableCloudBackup();
          
        case 'local_with_cloud_to_local_only':
          return await this.disableCloudBackup();
          
        case 'local_only_to_cloud_primary':
          return await this.migrateToCloudPrimary();
          
        default:
          console.warn('Migration path not implemented:', `${oldMode}_to_${newMode}`);
          return false;
      }
    } catch (error) {
      console.error('Migration failed:', error);
      return false;
    }
  }

  private async enableCloudBackup(): Promise<boolean> {
    console.log('🔄 Enabling cloud backup...');
    // Implementation would setup cloud backup
    await this.setStorageMode('local_with_cloud');
    return true;
  }

  private async disableCloudBackup(): Promise<boolean> {
    console.log('🔄 Disabling cloud backup...');
    // Implementation would clean up cloud data if user wants
    await this.setStorageMode('local_only');
    return true;
  }

  private async migrateToCloudPrimary(): Promise<boolean> {
    console.log('🔄 Migrating to cloud primary...');
    // Implementation would upload all local data to cloud
    await this.setStorageMode('cloud_primary');
    return true;
  }

  // SETTINGS MANAGEMENT
  async getStorageSettings(): Promise<StorageSettings> {
    try {
      const settingsStr = await SecurityManager.getToken('storage_settings');
      if (settingsStr) {
        return JSON.parse(settingsStr);
      }
    } catch (error) {
      console.error('Failed to get storage settings:', error);
    }

    // Default settings (most secure)
    return {
      mode: this.currentMode,
      cloudEnabled: this.isCloudEnabled(),
      autoBackup: false,
      backupFrequency: 'weekly',
      encryptBackups: true
    };
  }

  async updateStorageSettings(settings: Partial<StorageSettings>): Promise<boolean> {
    try {
      const currentSettings = await this.getStorageSettings();
      const newSettings = { ...currentSettings, ...settings };
      
      await SecurityManager.storeToken('storage_settings', JSON.stringify(newSettings));
      
      // Update mode if changed
      if (settings.mode && settings.mode !== this.currentMode) {
        await this.setStorageMode(settings.mode);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to update storage settings:', error);
      return false;
    }
  }
}

export default StorageChoiceManager;
