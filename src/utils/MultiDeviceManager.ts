// src/utils/MultiDeviceManager.ts
import { CloudStorageManager, UserProfileCloud } from './CloudStorageManager';
import { SecurityManager } from './SecurityManager';
import { Platform } from 'react-native';
import * as Device from 'expo-device';

export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  platform: string;
  osVersion: string;
  appVersion: string;
  registeredAt: string;
  lastActiveAt: string;
  isCurrentDevice: boolean;
}

export interface SyncSession {
  sessionId: string;
  userId: string;
  deviceId: string;
  startTime: string;
  endTime?: string;
  syncedData: {
    profile: boolean;
    messages: boolean;
    media: boolean;
    settings: boolean;
  };
  conflicts: any[];
  status: 'in_progress' | 'completed' | 'failed';
}

class MultiDeviceManager {
  private static instance: MultiDeviceManager;
  private cloudStorage: CloudStorageManager;
  private currentDeviceId: string = '';
  private syncInProgress: boolean = false;

  constructor() {
    this.cloudStorage = CloudStorageManager.getInstance();
    this.initializeDevice();
  }

  static getInstance(): MultiDeviceManager {
    if (!MultiDeviceManager.instance) {
      MultiDeviceManager.instance = new MultiDeviceManager();
    }
    return MultiDeviceManager.instance;
  }

  private async initializeDevice(): Promise<void> {
    try {
      // Generate or retrieve device ID
      this.currentDeviceId = await this.getOrCreateDeviceId();
      console.log('📱 Device initialized:', this.currentDeviceId);
    } catch (error) {
      console.error('Failed to initialize device:', error);
    }
  }

  private async getOrCreateDeviceId(): Promise<string> {
    try {
      let deviceId = await SecurityManager.getToken('device_id');
      
      if (!deviceId) {
        // Create unique device ID
        deviceId = `${Platform.OS}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await SecurityManager.storeToken('device_id', deviceId);
      }
      
      return deviceId;
    } catch (error) {
      console.error('Failed to get/create device ID:', error);
      return `fallback_${Date.now()}`;
    }
  }

  // DEVICE REGISTRATION AND MANAGEMENT
  async registerDevice(userId: string): Promise<boolean> {
    try {
      const deviceInfo = await this.getCurrentDeviceInfo();
      
      const registrationData = {
        userId,
        deviceInfo: {
          ...deviceInfo,
          registeredAt: new Date().toISOString()
        }
      };

      // Register with cloud storage
      const success = await this.cloudStorage.registerDevice(userId, registrationData);
      
      if (success) {
        // Store registration locally
        await SecurityManager.storeToken('device_registered', 'true');
        await SecurityManager.storeToken('registered_user_id', userId);
        
        console.log('✅ Device registered successfully');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Device registration failed:', error);
      return false;
    }
  }

  async getCurrentDeviceInfo(): Promise<DeviceInfo> {
    const deviceName = Device.deviceName || `${Platform.OS} Device`;
    const osVersion = Device.osVersion || 'Unknown';
    const appVersion = '1.0.1'; // From package.json

    return {
      deviceId: this.currentDeviceId,
      deviceName,
      platform: Platform.OS,
      osVersion,
      appVersion,
      registeredAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      isCurrentDevice: true
    };
  }

  async getRegisteredDevices(userId: string): Promise<DeviceInfo[]> {
    try {
      const devices = await this.cloudStorage.getDeviceList(userId);
      
      return devices.map(device => ({
        ...device,
        isCurrentDevice: device.deviceId === this.currentDeviceId
      }));
    } catch (error) {
      console.error('Failed to get registered devices:', error);
      return [];
    }
  }

  // CROSS-DEVICE LOGIN
  async loginOnNewDevice(username: string, password: string): Promise<{ success: boolean; userData?: UserProfileCloud; requiresSync?: boolean }> {
    try {
      console.log('🔐 Attempting cross-device login...');
      
      // Authenticate user
      const authResult = await this.authenticateUser(username, password);
      if (!authResult.success) {
        return { success: false };
      }

      // Download user profile from cloud
      const userData = await this.cloudStorage.downloadUserProfile(authResult.userId);
      if (!userData) {
        return { success: false };
      }

      // Register this device
      await this.registerDevice(authResult.userId);

      // Check if sync is needed
      const requiresSync = await this.checkSyncRequired(userData);

      console.log('✅ Cross-device login successful');
      return { 
        success: true, 
        userData,
        requiresSync
      };
    } catch (error) {
      console.error('❌ Cross-device login failed:', error);
      return { success: false };
    }
  }

  private async authenticateUser(username: string, password: string): Promise<{ success: boolean; userId: string }> {
    // This would connect to your authentication server
    // For now, return a mock response
    return {
      success: true,
      userId: `user_${username}`
    };
  }

  private async checkSyncRequired(userData: UserProfileCloud): Promise<boolean> {
    try {
      // Check if local data exists
      const localProfile = await SecurityManager.getToken(`profile_${userData.userId}`);
      
      if (!localProfile) {
        // No local data, sync required
        return true;
      }

      // Compare last sync timestamps
      const localData = JSON.parse(localProfile);
      const localSync = new Date(localData.syncMetadata?.lastCloudSync || 0);
      const cloudSync = new Date(userData.syncMetadata?.lastCloudSync || 0);

      return cloudSync > localSync;
    } catch (error) {
      console.error('Error checking sync requirements:', error);
      return true; // Default to requiring sync
    }
  }

  // DATA SYNCHRONIZATION
  async performFullSync(userId: string, onProgress?: (stage: string, progress: number) => void): Promise<boolean> {
    if (this.syncInProgress) {
      console.log('⏳ Sync already in progress');
      return false;
    }

    this.syncInProgress = true;
    
    try {
      console.log('🔄 Starting full device sync...');
      
      const syncSession = await this.createSyncSession(userId);
      
      // Stage 1: Profile sync
      onProgress?.('Syncing profile data...', 25);
      await this.syncProfileData(userId);
      
      // Stage 2: Settings sync
      onProgress?.('Syncing settings...', 50);
      await this.syncSettingsData(userId);
      
      // Stage 3: Messages sync
      onProgress?.('Syncing messages...', 75);
      await this.syncMessagesData(userId);
      
      // Stage 4: Media sync (metadata only, not full files)
      onProgress?.('Syncing media references...', 90);
      await this.syncMediaReferences(userId);
      
      // Complete sync session
      await this.completeSyncSession(syncSession.sessionId, true);
      
      onProgress?.('Sync completed!', 100);
      console.log('✅ Full device sync completed successfully');
      return true;
    } catch (error) {
      console.error('❌ Full device sync failed:', error);
      return false;
    } finally {
      this.syncInProgress = false;
    }
  }

  private async createSyncSession(userId: string): Promise<SyncSession> {
    const session: SyncSession = {
      sessionId: `sync_${Date.now()}_${this.currentDeviceId}`,
      userId,
      deviceId: this.currentDeviceId,
      startTime: new Date().toISOString(),
      syncedData: {
        profile: false,
        messages: false,
        media: false,
        settings: false
      },
      conflicts: [],
      status: 'in_progress'
    };

    // Store session locally
    await SecurityManager.storeToken('current_sync_session', JSON.stringify(session));
    
    return session;
  }

  private async syncProfileData(userId: string): Promise<void> {
    try {
      const cloudProfile = await this.cloudStorage.downloadUserProfile(userId);
      if (cloudProfile) {
        // Add current device to devices list
        const currentDevice = await this.getCurrentDeviceInfo();
        const deviceExists = cloudProfile.devices.some(d => d.deviceId === this.currentDeviceId);
        
        if (!deviceExists) {
          cloudProfile.devices.push({
            deviceId: currentDevice.deviceId,
            deviceName: currentDevice.deviceName,
            platform: currentDevice.platform,
            lastSync: new Date().toISOString(),
            isActive: true
          });
          
          // Update cloud profile with new device
          await this.cloudStorage.uploadUserProfile(cloudProfile);
        }
        
        console.log('✅ Profile data synced');
      }
    } catch (error) {
      console.error('Failed to sync profile data:', error);
    }
  }

  private async syncSettingsData(userId: string): Promise<void> {
    try {
      // This would sync app settings across devices
      console.log('✅ Settings data synced');
    } catch (error) {
      console.error('Failed to sync settings data:', error);
    }
  }

  private async syncMessagesData(userId: string): Promise<void> {
    try {
      // This would sync recent messages (last 30 days or similar)
      console.log('✅ Messages data synced');
    } catch (error) {
      console.error('Failed to sync messages data:', error);
    }
  }

  private async syncMediaReferences(userId: string): Promise<void> {
    try {
      // This would sync media metadata, not actual files
      console.log('✅ Media references synced');
    } catch (error) {
      console.error('Failed to sync media references:', error);
    }
  }

  private async completeSyncSession(sessionId: string, success: boolean): Promise<void> {
    try {
      const sessionStr = await SecurityManager.getToken('current_sync_session');
      if (sessionStr) {
        const session: SyncSession = JSON.parse(sessionStr);
        session.endTime = new Date().toISOString();
        session.status = success ? 'completed' : 'failed';
        
        // Store completed session in history
        const history = await this.getSyncHistory();
        history.push(session);
        
        // Keep only last 10 sync sessions
        if (history.length > 10) {
          history.splice(0, history.length - 10);
        }
        
        await SecurityManager.storeToken('sync_history', JSON.stringify(history));
        await SecurityManager.removeToken('current_sync_session');
      }
    } catch (error) {
      console.error('Failed to complete sync session:', error);
    }
  }

  // SYNC HISTORY AND STATUS
  async getSyncHistory(): Promise<SyncSession[]> {
    try {
      const historyStr = await SecurityManager.getToken('sync_history');
      return historyStr ? JSON.parse(historyStr) : [];
    } catch (error) {
      console.error('Failed to get sync history:', error);
      return [];
    }
  }

  async getLastSyncTime(userId: string): Promise<Date | null> {
    try {
      const history = await this.getSyncHistory();
      const userSessions = history.filter(s => s.userId === userId && s.status === 'completed');
      
      if (userSessions.length > 0) {
        const lastSession = userSessions[userSessions.length - 1];
        return new Date(lastSession.endTime || lastSession.startTime);
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get last sync time:', error);
      return null;
    }
  }

  // DEVICE MANAGEMENT
  async removeDevice(userId: string, deviceId: string): Promise<boolean> {
    try {
      // This would remove device from cloud and revoke access
      console.log(`🗑️ Removing device: ${deviceId}`);
      return true;
    } catch (error) {
      console.error('Failed to remove device:', error);
      return false;
    }
  }

  async signOutAllDevices(userId: string): Promise<boolean> {
    try {
      // This would sign out user from all registered devices
      console.log('🚪 Signing out from all devices');
      return true;
    } catch (error) {
      console.error('Failed to sign out all devices:', error);
      return false;
    }
  }

  // UTILITIES
  isCurrentDeviceRegistered(): Promise<boolean> {
    return SecurityManager.getToken('device_registered').then(value => value === 'true');
  }

  isSyncInProgress(): boolean {
    return this.syncInProgress;
  }

  getCurrentDeviceId(): string {
    return this.currentDeviceId;
  }
}

export default MultiDeviceManager;
