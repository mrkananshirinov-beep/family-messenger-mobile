/**
 * Global Storage Sync System
 * Cross-platform real-time data synchronization
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface GlobalUser {
  id: string;
  username: string;
  name: string;
  profilePicture?: string;
  birthday: string;
  isOnline: boolean;
  lastSeen: string;
  deviceType: 'web' | 'ios' | 'android';
  lastActivity: string;
}

export interface GlobalPhoto {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  dateTaken: string;
  uploader: {
    id: string;
    name: string;
    profilePicture?: string;
  };
  likes: string[];
  comments: Array<{
    id: string;
    userId: string;
    userName: string;
    text: string;
    createdAt: string;
  }>;
  createdAt: string;
}

class GlobalStorageManager {
  private static instance: GlobalStorageManager;
  private syncInterval: NodeJS.Timeout | null = null;

  static getInstance(): GlobalStorageManager {
    if (!GlobalStorageManager.instance) {
      GlobalStorageManager.instance = new GlobalStorageManager();
    }
    return GlobalStorageManager.instance;
  }

  // Initialize sync system
  async initialize() {
    console.log('🔄 GlobalStorage: Initializing sync system...');
    this.startSyncInterval();
    await this.migrateOldData();
  }

  // Start periodic sync (every 5 seconds)
  private startSyncInterval() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    this.syncInterval = setInterval(async () => {
      await this.syncUserActivity();
    }, 5000);
  }

  // Stop sync
  stopSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  // Get all active users
  async getAllUsers(): Promise<GlobalUser[]> {
    try {
      let userData;
      
      if (Platform.OS === 'web') {
        userData = localStorage.getItem('global_all_users');
      } else {
        userData = await AsyncStorage.getItem('global_all_users');
      }
      
      const users = userData ? JSON.parse(userData) : [];
      
      // Filter out inactive users (older than 24 hours)
      const activeUsers = users.filter((user: GlobalUser) => {
        const lastActivity = new Date(user.lastActivity);
        const now = new Date();
        const hoursDiff = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);
        return hoursDiff < 24;
      });

      console.log('👥 GlobalStorage: Active users:', activeUsers.length);
      return activeUsers;
    } catch (error) {
      console.error('❌ GlobalStorage: Error getting users:', error);
      return [];
    }
  }

  // Add or update user
  async updateUser(user: Partial<GlobalUser>): Promise<void> {
    try {
      const allUsers = await this.getAllUsers();
      const existingIndex = allUsers.findIndex(u => u.id === user.id);
      
      const updatedUser: GlobalUser = {
        ...user,
        lastActivity: new Date().toISOString(),
        isOnline: true,
        deviceType: Platform.OS === 'web' ? 'web' : Platform.OS as 'ios' | 'android',
      } as GlobalUser;

      if (existingIndex !== -1) {
        allUsers[existingIndex] = { ...allUsers[existingIndex], ...updatedUser };
      } else {
        allUsers.push(updatedUser);
      }

      // Save to storage
      const userData = JSON.stringify(allUsers);
      
      if (Platform.OS === 'web') {
        localStorage.setItem('global_all_users', userData);
      } else {
        await AsyncStorage.setItem('global_all_users', userData);
      }

      console.log('✅ GlobalStorage: User updated:', user.username);
    } catch (error) {
      console.error('❌ GlobalStorage: Error updating user:', error);
    }
  }

  // Remove user (logout)
  async removeUser(userId: string): Promise<void> {
    try {
      const allUsers = await this.getAllUsers();
      const filteredUsers = allUsers.filter(u => u.id !== userId);
      
      const userData = JSON.stringify(filteredUsers);
      
      if (Platform.OS === 'web') {
        localStorage.setItem('global_all_users', userData);
      } else {
        await AsyncStorage.setItem('global_all_users', userData);
      }

      console.log('🗑️ GlobalStorage: User removed:', userId);
    } catch (error) {
      console.error('❌ GlobalStorage: Error removing user:', error);
    }
  }

  // Update user activity (heartbeat)
  async syncUserActivity(): Promise<void> {
    try {
      // Get current user
      let currentUserData;
      
      if (Platform.OS === 'web') {
        currentUserData = localStorage.getItem('user_data');
      } else {
        currentUserData = await AsyncStorage.getItem('user_data');
      }

      if (currentUserData) {
        const currentUser = JSON.parse(currentUserData);
        await this.updateUser({
          id: currentUser.id,
          username: currentUser.username,
          name: currentUser.name,
          profilePicture: currentUser.profilePicture,
          birthday: currentUser.birthday,
          lastSeen: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('❌ GlobalStorage: Error syncing activity:', error);
    }
  }

  // Get all family photos
  async getAllPhotos(): Promise<GlobalPhoto[]> {
    try {
      let photoData;
      
      if (Platform.OS === 'web') {
        photoData = localStorage.getItem('global_family_photos');
      } else {
        photoData = await AsyncStorage.getItem('global_family_photos');
      }
      
      const photos = photoData ? JSON.parse(photoData) : [];
      console.log('📸 GlobalStorage: Photos loaded:', photos.length);
      return photos;
    } catch (error) {
      console.error('❌ GlobalStorage: Error getting photos:', error);
      return [];
    }
  }

  // Add photo to family album
  async addPhoto(photo: GlobalPhoto): Promise<void> {
    try {
      const allPhotos = await this.getAllPhotos();
      allPhotos.unshift(photo); // Add to beginning
      
      // Keep only last 100 photos to prevent storage overflow
      const limitedPhotos = allPhotos.slice(0, 100);
      
      const photoData = JSON.stringify(limitedPhotos);
      
      if (Platform.OS === 'web') {
        localStorage.setItem('global_family_photos', photoData);
      } else {
        await AsyncStorage.setItem('global_family_photos', photoData);
      }

      console.log('✅ GlobalStorage: Photo added:', photo.title);
    } catch (error) {
      console.error('❌ GlobalStorage: Error adding photo:', error);
    }
  }

  // Migrate old data to new system
  private async migrateOldData(): Promise<void> {
    try {
      console.log('🔄 GlobalStorage: Migrating old data...');
      
      // Migrate users
      let oldUsers;
      if (Platform.OS === 'web') {
        oldUsers = localStorage.getItem('all_users');
      } else {
        oldUsers = await AsyncStorage.getItem('all_users');
      }
      
      if (oldUsers) {
        const users = JSON.parse(oldUsers);
        for (const user of users) {
          await this.updateUser({
            id: user.id,
            username: user.username,
            name: user.name,
            profilePicture: user.profilePicture,
            birthday: user.birthday || '01.01.1990',
            lastSeen: new Date().toISOString(),
          });
        }
      }

      // Migrate photos
      let oldPhotos;
      if (Platform.OS === 'web') {
        oldPhotos = localStorage.getItem('family_album_photos');
      } else {
        oldPhotos = await AsyncStorage.getItem('family_album_photos');
      }
      
      if (oldPhotos) {
        const photos = JSON.parse(oldPhotos);
        for (const photo of photos) {
          await this.addPhoto(photo);
        }
      }

      console.log('✅ GlobalStorage: Migration completed');
    } catch (error) {
      console.error('❌ GlobalStorage: Migration error:', error);
    }
  }

  // Clear all data (emergency reset)
  async clearAllData(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem('global_all_users');
        localStorage.removeItem('global_family_photos');
      } else {
        await AsyncStorage.removeItem('global_all_users');
        await AsyncStorage.removeItem('global_family_photos');
      }
      
      console.log('🗑️ GlobalStorage: All data cleared');
    } catch (error) {
      console.error('❌ GlobalStorage: Error clearing data:', error);
    }
  }
}

export default GlobalStorageManager;
