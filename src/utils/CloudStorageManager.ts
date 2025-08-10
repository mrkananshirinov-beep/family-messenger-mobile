import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { SecurityManager } from './SecurityManager';

// UPDATED CLOUD STORAGE INTERFACES FOR MULTI-DEVICE SUPPORT

export interface CloudConfig {
  provider: 'firebase' | 'supabase' | 'custom';
  apiKey: string;
  projectId: string;
  storageBucket: string;
  enableSync: boolean;
  syncInterval: number; // minutes
}

export interface UserProfileCloud {
  userId: string;
  profile: {
    name: string;
    username: string;
    bio: string;
    avatar?: string;
    phone?: string;
    email?: string;
    birthday: string;
    joinDate: string;
    lastActive: string;
  };
  settings: {
    notifications: boolean;
    privacy: 'public' | 'family_only' | 'private';
    theme: 'light' | 'dark' | 'auto';
    language: string;
    biometricEnabled: boolean;
  };
  devices: Array<{
    deviceId: string;
    deviceName: string;
    platform: string;
    lastSync: string;
    isActive: boolean;
  }>;
  syncMetadata: {
    lastCloudSync: string;
    version: number;
    conflicts: any[];
  };
}

export interface CloudUser {
  id: string;
  username: string;
  name: string;
  email?: string;
  profilePicture?: string;
  birthday: string;
  createdAt: string;
  lastSeen: string;
  isOnline: boolean;
  deviceInfo: {
    platform: string;
    version: string;
    deviceId: string;
  };
}

export interface CloudMessage {
  id: string;
  senderId: string;
  receiverId?: string; // For private messages
  chatId: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'sos';
  content: string;
  mediaUrl?: string;
  timestamp: string;
  isEncrypted: boolean;
  deliveredAt?: string;
  readAt?: string;
}

export interface CloudPhoto {
  id: string;
  uploaderId: string;
  title: string;
  description: string;
  imageUrl: string;
  thumbnailUrl?: string;
  originalSize: number;
  mimeType: string;
  uploadedAt: string;
  metadata: {
    camera?: string;
    location?: {
      latitude: number;
      longitude: number;
      address?: string;
    };
    faces?: Array<{
      userId: string;
      confidence: number;
    }>;
  };
}

export class CloudStorageManager {
  private static instance: CloudStorageManager;
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = process.env.EXPO_PUBLIC_SERVER_URL || 'http://localhost:5000';
    this.apiKey = process.env.EXPO_PUBLIC_API_KEY || '';
  }

  static getInstance(): CloudStorageManager {
    if (!CloudStorageManager.instance) {
      CloudStorageManager.instance = new CloudStorageManager();
    }
    return CloudStorageManager.instance;
  }

  // Authentication with cloud
  async authenticateUser(username: string, passwordHash: string): Promise<{ user: CloudUser; token: string } | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: SecurityManager.sanitizeInput(username),
          password: passwordHash, // Already hashed by SecurityManager
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Store tokens securely
        await SecurityManager.storeToken('auth_token', data.token);
        await SecurityManager.storeToken('refresh_token', data.refreshToken);
        
        return {
          user: data.user,
          token: data.token,
        };
      }
      return null;
    } catch (error) {
      console.error('❌ Cloud authentication failed:', error);
      return null;
    }
  }

  // Register new user in cloud
  async registerUser(userData: Omit<CloudUser, 'id' | 'createdAt' | 'lastSeen' | 'isOnline'>): Promise<{ user: CloudUser; token: string } | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...userData,
          username: SecurityManager.sanitizeInput(userData.username),
          name: SecurityManager.sanitizeInput(userData.name),
          email: userData.email ? SecurityManager.sanitizeInput(userData.email) : undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Store tokens securely
        await SecurityManager.storeToken('auth_token', data.token);
        await SecurityManager.storeToken('refresh_token', data.refreshToken);
        
        return {
          user: data.user,
          token: data.token,
        };
      }
      return null;
    } catch (error) {
      console.error('❌ Cloud registration failed:', error);
      return null;
    }
  }

  // Sync messages to cloud
  async syncMessages(messages: CloudMessage[]): Promise<boolean> {
    try {
      const token = await SecurityManager.getToken('auth_token');
      if (!token) return false;

      // Encrypt sensitive message content
      const encryptedMessages = messages.map(msg => ({
        ...msg,
        content: msg.isEncrypted ? SecurityManager.encrypt(msg.content) : msg.content,
      }));

      const response = await fetch(`${this.baseUrl}/api/messages/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ messages: encryptedMessages }),
      });

      return response.ok;
    } catch (error) {
      console.error('❌ Message sync failed:', error);
      return false;
    }
  }

  // Get messages from cloud
  async getMessages(chatId: string, lastMessageId?: string): Promise<CloudMessage[]> {
    try {
      const token = await SecurityManager.getToken('auth_token');
      if (!token) return [];

      const url = new URL(`${this.baseUrl}/api/messages/${chatId}`);
      if (lastMessageId) {
        url.searchParams.append('after', lastMessageId);
      }

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        
        // Decrypt message content
        return data.messages.map((msg: CloudMessage) => ({
          ...msg,
          content: msg.isEncrypted ? SecurityManager.decrypt(msg.content) : msg.content,
        }));
      }
      return [];
    } catch (error) {
      console.error('❌ Failed to get messages:', error);
      return [];
    }
  }

  // Upload photo to cloud
  async uploadPhoto(photo: Omit<CloudPhoto, 'id' | 'uploadedAt'>, imageData: string): Promise<CloudPhoto | null> {
    try {
      const token = await SecurityManager.getToken('auth_token');
      if (!token) return null;

      const formData = new FormData();
      formData.append('photo', {
        uri: imageData,
        type: photo.mimeType,
        name: `photo_${Date.now()}.jpg`,
      } as any);
      formData.append('metadata', JSON.stringify(photo));

      const response = await fetch(`${this.baseUrl}/api/photos/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('❌ Photo upload failed:', error);
      return null;
    }
  }

  // Get photos from cloud
  async getPhotos(limit: number = 50, offset: number = 0): Promise<CloudPhoto[]> {
    try {
      const token = await SecurityManager.getToken('auth_token');
      if (!token) return [];

      const response = await fetch(`${this.baseUrl}/api/photos?limit=${limit}&offset=${offset}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data.photos;
      }
      return [];
    } catch (error) {
      console.error('❌ Failed to get photos:', error);
      return [];
    }
  }

  // Backup all user data to cloud
  async backupUserData(): Promise<boolean> {
    try {
      const token = await SecurityManager.getToken('auth_token');
      if (!token) return false;

      // Collect all local data
      const localData = {
        messages: await this.getLocalData('family_chat_messages'),
        photos: await this.getLocalData('family_photo_album'),
        contacts: await this.getLocalData('global_all_users'),
        settings: await this.getLocalData('user_settings'),
      };

      const response = await fetch(`${this.baseUrl}/api/backup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          data: SecurityManager.encrypt(JSON.stringify(localData)),
          timestamp: new Date().toISOString(),
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('❌ Backup failed:', error);
      return false;
    }
  }

  // Restore user data from cloud
  async restoreUserData(): Promise<boolean> {
    try {
      const token = await SecurityManager.getToken('auth_token');
      if (!token) return false;

      const response = await fetch(`${this.baseUrl}/api/backup/latest`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const backup = await response.json();
        const decryptedData = SecurityManager.decrypt(backup.data);
        const restoredData = JSON.parse(decryptedData);

        // Restore data to local storage
        await this.setLocalData('family_chat_messages', restoredData.messages);
        await this.setLocalData('family_photo_album', restoredData.photos);
        await this.setLocalData('global_all_users', restoredData.contacts);
        await this.setLocalData('user_settings', restoredData.settings);

        console.log('✅ User data restored successfully');
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Data restoration failed:', error);
      return false;
    }
  }

  // Helper methods for local storage
  private async getLocalData(key: string): Promise<any> {
    try {
      let data: string | null = null;
      
      if (Platform.OS === 'web') {
        data = localStorage.getItem(key);
      } else {
        data = await AsyncStorage.getItem(key);
      }
      
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`❌ Failed to get local data for ${key}:`, error);
      return null;
    }
  }

  private async setLocalData(key: string, data: any): Promise<void> {
    try {
      const jsonData = JSON.stringify(data);
      
      if (Platform.OS === 'web') {
        localStorage.setItem(key, jsonData);
      } else {
        await AsyncStorage.setItem(key, jsonData);
      }
    } catch (error) {
      console.error(`❌ Failed to set local data for ${key}:`, error);
    }
  }
}

export default CloudStorageManager;
