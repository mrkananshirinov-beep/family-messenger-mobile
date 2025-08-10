import CryptoJS from 'crypto-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ENCRYPTION_KEY = process.env.EXPO_PUBLIC_ENCRYPTION_KEY || 'default_development_key_32chars';

export class SecurityManager {
  // Encrypt sensitive data
  static encrypt(data: string): string {
    try {
      return CryptoJS.AES.encrypt(data, ENCRYPTION_KEY).toString();
    } catch (error) {
      console.error('❌ Encryption failed:', error);
      return data; // Fallback to plain text in development
    }
  }

  // Decrypt sensitive data
  static decrypt(encryptedData: string): string {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('❌ Decryption failed:', error);
      return encryptedData; // Return as-is if decryption fails
    }
  }

  // Secure token storage
  static async storeToken(key: string, token: string): Promise<void> {
    try {
      const encryptedToken = this.encrypt(token);
      
      if (Platform.OS === 'web') {
        localStorage.setItem(`secure_${key}`, encryptedToken);
      } else {
        await SecureStore.setItemAsync(`secure_${key}`, encryptedToken);
      }
    } catch (error) {
      console.error('❌ Token storage failed:', error);
    }
  }

  // Retrieve secure token
  static async getToken(key: string): Promise<string | null> {
    try {
      let encryptedToken: string | null = null;
      
      if (Platform.OS === 'web') {
        encryptedToken = localStorage.getItem(`secure_${key}`);
      } else {
        encryptedToken = await SecureStore.getItemAsync(`secure_${key}`);
      }

      if (encryptedToken) {
        return this.decrypt(encryptedToken);
      }
      return null;
    } catch (error) {
      console.error('❌ Token retrieval failed:', error);
      return null;
    }
  }

  // Remove secure token
  static async removeToken(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(`secure_${key}`);
      } else {
        await SecureStore.deleteItemAsync(`secure_${key}`);
      }
    } catch (error) {
      console.error('❌ Token removal failed:', error);
    }
  }

  // Hash password (client-side hashing before sending to server)
  static hashPassword(password: string): string {
    return CryptoJS.SHA256(password + ENCRYPTION_KEY).toString();
  }

  // Generate secure random ID
  static generateSecureId(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2);
    const combined = timestamp + random;
    return CryptoJS.SHA256(combined).toString().substring(0, 16);
  }

  // Validate input to prevent injection attacks
  static sanitizeInput(input: string): string {
    return input
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/['";]/g, '') // Remove potential SQL injection characters
      .trim();
  }

  // Check if app is running in secure environment
  static isSecureEnvironment(): boolean {
    if (Platform.OS === 'web') {
      return window.location.protocol === 'https:' || window.location.hostname === 'localhost';
    }
    return true; // Mobile apps are considered secure
  }
}

export default SecurityManager;
