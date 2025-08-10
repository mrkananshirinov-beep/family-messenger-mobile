import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import GlobalStorageManager from '../utils/GlobalStorage';
import SecurityManager from '../utils/SecurityManager';
import CloudStorageManager from '../utils/CloudStorageManager';

// User interface
export interface User {
  id: string;
  username: string;
  name: string;
  profilePicture?: string;
  birthday: string;
}

// Auth context interface
interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  register: (userData: {
    username: string;
    password: string;
    name: string;
    birthday: Date;
    profilePicture?: string;
  }) => Promise<boolean>;
  logout: () => Promise<void>;
  setUser?: React.Dispatch<React.SetStateAction<User | null>>;
  setIsAuthenticated?: (value: boolean) => void;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Custom hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Provider props
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      console.log('🔍 AuthContext: Loading stored auth...');
      
      // Check for stored auth tokens and user data
      let storedToken: string | null = null;
      let storedUserData: string | null = null;
      
      // Use SecurityManager for secure token retrieval
      storedToken = await SecurityManager.getToken('auth_token');
      storedUserData = await SecurityManager.getToken('user_data');

      if (storedToken && storedUserData) {
        const userData = JSON.parse(storedUserData);
        console.log('✅ Found stored auth for user:', userData.username);
        
        setToken(storedToken);
        setUser(userData);
        
        // Update user in global storage as active
        const globalStorage = GlobalStorageManager.getInstance();
        await globalStorage.updateUser({
          id: userData.id,
          username: userData.username,
          name: userData.name,
          profilePicture: userData.profilePicture,
          birthday: userData.birthday,
          isOnline: true,
          lastSeen: new Date().toISOString(),
        });
        
        console.log('✅ User restored and marked as active in GlobalStorage');
      } else {
        console.log('ℹ️ No stored auth found - showing login screen');
      }
    } catch (error) {
      console.error('❌ Error loading stored auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      console.log('🔐 Attempting login for:', username);
      setIsLoading(true);

      // Hash password before sending
      const passwordHash = SecurityManager.hashPassword(password);
      
      // Try cloud authentication first
      const cloudStorage = CloudStorageManager.getInstance();
      const cloudAuth = await cloudStorage.authenticateUser(username, passwordHash);
      
      if (cloudAuth) {
        // Cloud authentication successful
        setToken(cloudAuth.token);
        setUser({
          id: cloudAuth.user.id,
          username: cloudAuth.user.username,
          name: cloudAuth.user.name,
          profilePicture: cloudAuth.user.profilePicture,
          birthday: cloudAuth.user.birthday,
        });

        // Store auth data securely
        await SecurityManager.storeToken('auth_token', cloudAuth.token);
        await SecurityManager.storeToken('user_data', JSON.stringify(cloudAuth.user));

        // Restore user data from cloud
        await cloudStorage.restoreUserData();

        console.log('✅ Cloud login successful for:', username);
        return true;
      }

      // Fallback to local authentication for offline mode
      let allUsersData: string | null = null;
      
      if (Platform.OS === 'web') {
        allUsersData = localStorage.getItem('global_all_users');
      } else {
        allUsersData = await AsyncStorage.getItem('global_all_users');
      }

      if (allUsersData) {
        const allUsers = JSON.parse(allUsersData);
        const existingUser = allUsers.find((u: any) => 
          u.username === username && u.password === SecurityManager.hashPassword(password)
        );

        if (existingUser) {
          // User found - login successful
          const userData: User = {
            id: existingUser.id,
            username: existingUser.username,
            name: existingUser.name,
            profilePicture: existingUser.profilePicture,
            birthday: existingUser.birthday,
          };

          const mockToken = `token_${Date.now()}`;
          
          // Store auth data securely
          await SecurityManager.storeToken('auth_token', mockToken);
          await SecurityManager.storeToken('user_data', JSON.stringify(userData));

          setToken(mockToken);
          setUser(userData);

          // Update user as active in global storage
          const globalStorage = GlobalStorageManager.getInstance();
          await globalStorage.updateUser({
            id: userData.id,
            username: userData.username,
            name: userData.name,
            profilePicture: userData.profilePicture,
            birthday: userData.birthday,
            isOnline: true,
            lastSeen: new Date().toISOString(),
          });

          console.log('✅ Local login successful for:', username);
          return true;
        }
      }

      console.log('❌ Login failed - user not found or wrong password');
      Alert.alert('Giriş Xətası', 'İstifadəçi adı və ya şifrə yanlışdır');
      return false;

    } catch (error) {
      console.error('❌ Login error:', error);
      Alert.alert('Xəta', 'Giriş zamanı xəta baş verdi');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: {
    username: string;
    password: string;
    name: string;
    birthday: Date;
    profilePicture?: string;
  }): Promise<boolean> => {
    try {
      console.log('📝 Attempting registration for:', userData.username);
      setIsLoading(true);

      // Check if username already exists
      let allUsersData: string | null = null;
      
      if (Platform.OS === 'web') {
        allUsersData = localStorage.getItem('global_all_users');
      } else {
        allUsersData = await AsyncStorage.getItem('global_all_users');
      }

      const allUsers = allUsersData ? JSON.parse(allUsersData) : [];
      const existingUser = allUsers.find((u: any) => u.username === userData.username);

      if (existingUser) {
        Alert.alert('Qeydiyyat Xətası', 'Bu istifadəçi adı artıq mövcuddur');
        return false;
      }

      // Create new user
      const newUser = {
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        username: userData.username,
        password: userData.password, // In real app, this would be hashed
        name: userData.name,
        birthday: userData.birthday.toISOString().split('T')[0], // YYYY-MM-DD format
        profilePicture: userData.profilePicture,
        isOnline: true,
        lastSeen: new Date().toISOString(),
        deviceType: Platform.OS === 'web' ? 'web' : Platform.OS,
        lastActivity: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      // Add to global users list
      allUsers.push(newUser);
      
      if (Platform.OS === 'web') {
        localStorage.setItem('global_all_users', JSON.stringify(allUsers));
      } else {
        await AsyncStorage.setItem('global_all_users', JSON.stringify(allUsers));
      }

      // Create user session
      const userSession: User = {
        id: newUser.id,
        username: newUser.username,
        name: newUser.name,
        profilePicture: newUser.profilePicture,
        birthday: newUser.birthday,
      };

      const mockToken = `token_${Date.now()}`;
      
      // Store auth data
      if (Platform.OS === 'web') {
        localStorage.setItem('auth_token', mockToken);
        localStorage.setItem('user_data', JSON.stringify(userSession));
      } else {
        await SecureStore.setItemAsync('auth_token', mockToken);
        await AsyncStorage.setItem('user_data', JSON.stringify(userSession));
      }

      setToken(mockToken);
      setUser(userSession);

      // Update user in global storage
      const globalStorage = GlobalStorageManager.getInstance();
      await globalStorage.updateUser({
        id: newUser.id,
        username: newUser.username,
        name: newUser.name,
        profilePicture: newUser.profilePicture,
        birthday: newUser.birthday,
        isOnline: true,
        lastSeen: new Date().toISOString(),
      });

      console.log('✅ Registration successful for:', userData.username);
      Alert.alert('Təbrik!', 'Qeydiyyat uğurla tamamlandı');
      return true;

    } catch (error) {
      console.error('❌ Registration error:', error);
      Alert.alert('Xəta', 'Qeydiyyat zamanı xəta baş verdi');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      console.log('🚪 Logging out user:', user?.username);
      
      // Backup data to cloud before logout
      const cloudStorage = CloudStorageManager.getInstance();
      await cloudStorage.backupUserData();
      
      // Remove user from global storage
      if (user) {
        const globalStorage = GlobalStorageManager.getInstance();
        await globalStorage.removeUser(user.id);
      }

      // Clear stored auth data securely
      await SecurityManager.removeToken('auth_token');
      await SecurityManager.removeToken('user_data');
      await SecurityManager.removeToken('refresh_token');

      setToken(null);
      setUser(null);
      
      console.log('✅ Logout successful');
    } catch (error) {
      console.error('❌ Logout error:', error);
    }
  };

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const value: AuthContextType = {
    user,
    token,
    isLoading,
    login,
    register,
    logout,
    setUser,
    setIsAuthenticated,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
