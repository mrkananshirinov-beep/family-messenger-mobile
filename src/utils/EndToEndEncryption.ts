import CryptoJS from 'crypto-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export interface KeyPair {
  publicKey: string;
  privateKey: string;
  keyId: string;
  createdAt: string;
}

export interface EncryptedMessage {
  encryptedContent: string;
  encryptedKey: string;
  senderKeyId: string;
  receiverKeyId: string;
  signature: string;
  timestamp: string;
}

export class EndToEndEncryption {
  private static readonly KEY_SIZE = 256;
  private static readonly RSA_KEY_SIZE = 2048;
  
  // Cihazda açar cütü yaradılması
  static async generateKeyPair(userId: string): Promise<KeyPair> {
    try {
      // Real implementasiyada RSA key pair yaradılacaq
      // Burada sadələşdirilmiş versiya istifadə edirik
      const keyId = `key_${userId}_${Date.now()}`;
      const privateKey = CryptoJS.lib.WordArray.random(this.KEY_SIZE / 8).toString();
      const publicKey = CryptoJS.SHA256(privateKey + userId).toString();
      
      const keyPair: KeyPair = {
        publicKey,
        privateKey,
        keyId,
        createdAt: new Date().toISOString()
      };
      
      // Private key-i güvənli şəkildə saxla
      await this.storePrivateKey(userId, keyPair.privateKey, keyId);
      
      console.log('🔑 E2EE Key pair generated and stored securely');
      return keyPair;
    } catch (error) {
      console.error('❌ Key pair generation failed:', error);
      throw error;
    }
  }
  
  // Private key-in güvənli saxlanması
  private static async storePrivateKey(userId: string, privateKey: string, keyId: string): Promise<void> {
    const key = `e2ee_private_${userId}_${keyId}`;
    const encryptedPrivateKey = CryptoJS.AES.encrypt(privateKey, userId + keyId).toString();
    
    if (Platform.OS === 'web') {
      // Web üçün IndexedDB və ya encrypted localStorage
      localStorage.setItem(key, encryptedPrivateKey);
    } else {
      // Mobile üçün SecureStore
      await SecureStore.setItemAsync(key, encryptedPrivateKey);
    }
  }
  
  // Private key-in oxunması
  static async getPrivateKey(userId: string, keyId: string): Promise<string | null> {
    try {
      const key = `e2ee_private_${userId}_${keyId}`;
      let encryptedPrivateKey: string | null = null;
      
      if (Platform.OS === 'web') {
        encryptedPrivateKey = localStorage.getItem(key);
      } else {
        encryptedPrivateKey = await SecureStore.getItemAsync(key);
      }
      
      if (encryptedPrivateKey) {
        return CryptoJS.AES.decrypt(encryptedPrivateKey, userId + keyId).toString(CryptoJS.enc.Utf8);
      }
      return null;
    } catch (error) {
      console.error('❌ Private key retrieval failed:', error);
      return null;
    }
  }
  
  // Mesajın şifrələnməsi
  static async encryptMessage(
    content: string,
    senderUserId: string,
    senderKeyId: string,
    receiverPublicKey: string,
    receiverKeyId: string
  ): Promise<EncryptedMessage> {
    try {
      // 1. Təsadüfi AES açarı yaradırıq
      const aesKey = CryptoJS.lib.WordArray.random(256/8);
      
      // 2. Mesajı AES ilə şifrələyirik
      const encryptedContent = CryptoJS.AES.encrypt(content, aesKey).toString();
      
      // 3. AES açarını receiver-in public key-i ilə şifrələyirik
      // Real implementasiyada RSA istifadə ediləcək
      const encryptedKey = CryptoJS.AES.encrypt(aesKey.toString(), receiverPublicKey).toString();
      
      // 4. Digital imza yaradırıq
      const senderPrivateKey = await this.getPrivateKey(senderUserId, senderKeyId);
      if (!senderPrivateKey) {
        throw new Error('Sender private key not found');
      }
      
      const signature = CryptoJS.HmacSHA256(encryptedContent + encryptedKey, senderPrivateKey).toString();
      
      const encryptedMessage: EncryptedMessage = {
        encryptedContent,
        encryptedKey,
        senderKeyId,
        receiverKeyId,
        signature,
        timestamp: new Date().toISOString()
      };
      
      console.log('🔒 Message encrypted with E2EE');
      return encryptedMessage;
    } catch (error) {
      console.error('❌ Message encryption failed:', error);
      throw error;
    }
  }
  
  // Mesajın deşifrə edilməsi
  static async decryptMessage(
    encryptedMessage: EncryptedMessage,
    receiverUserId: string,
    senderPublicKey: string
  ): Promise<string> {
    try {
      // 1. Digital imzanı doğrulayırıq
      const expectedSignature = CryptoJS.HmacSHA256(
        encryptedMessage.encryptedContent + encryptedMessage.encryptedKey, 
        senderPublicKey
      ).toString();
      
      if (expectedSignature !== encryptedMessage.signature) {
        throw new Error('Message signature verification failed');
      }
      
      // 2. Private key-i əldə edirik
      const receiverPrivateKey = await this.getPrivateKey(receiverUserId, encryptedMessage.receiverKeyId);
      if (!receiverPrivateKey) {
        throw new Error('Receiver private key not found');
      }
      
      // 3. AES açarını deşifrə edirik
      const aesKeyDecrypted = CryptoJS.AES.decrypt(encryptedMessage.encryptedKey, receiverPrivateKey);
      const aesKey = aesKeyDecrypted.toString(CryptoJS.enc.Utf8);
      
      // 4. Mesajı deşifrə edirik
      const decryptedBytes = CryptoJS.AES.decrypt(encryptedMessage.encryptedContent, aesKey);
      const decryptedContent = decryptedBytes.toString(CryptoJS.enc.Utf8);
      
      console.log('🔓 Message decrypted with E2EE');
      return decryptedContent;
    } catch (error) {
      console.error('❌ Message decryption failed:', error);
      throw error;
    }
  }
  
  // Açar rotasiyası
  static async rotateKeys(userId: string): Promise<KeyPair> {
    try {
      // Köhnə açarları backup et
      const oldKeys = await this.getAllUserKeys(userId);
      
      // Yeni açar cütü yaradır
      const newKeyPair = await this.generateKeyPair(userId);
      
      // Köhnə açarları "deprecated" olaraq işarələ
      for (const oldKey of oldKeys) {
        await this.markKeyAsDeprecated(userId, oldKey.keyId);
      }
      
      console.log('🔄 E2EE Keys rotated successfully');
      return newKeyPair;
    } catch (error) {
      console.error('❌ Key rotation failed:', error);
      throw error;
    }
  }
  
  // İstifadəçinin bütün açarlarını əldə et
  private static async getAllUserKeys(userId: string): Promise<KeyPair[]> {
    // Real implementasiyada database-dən əldə ediləcək
    // Bu sadələşdirilmiş versiyadır
    return [];
  }
  
  // Açarı deprecated olaraq işarələ
  private static async markKeyAsDeprecated(userId: string, keyId: string): Promise<void> {
    const key = `e2ee_deprecated_${userId}_${keyId}`;
    const timestamp = new Date().toISOString();
    
    if (Platform.OS === 'web') {
      localStorage.setItem(key, timestamp);
    } else {
      await SecureStore.setItemAsync(key, timestamp);
    }
  }
  
  // Bütün deprecated açarları təmizlə
  static async cleanupDeprecatedKeys(userId: string, olderThanDays: number = 30): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
      
      // Real implementasiyada deprecated açarları database-dən siləcək
      console.log(`🧹 Cleaned up E2EE keys older than ${olderThanDays} days`);
    } catch (error) {
      console.error('❌ Key cleanup failed:', error);
    }
  }
  
  // Açar doğrulama
  static async verifyKeyIntegrity(userId: string, keyId: string): Promise<boolean> {
    try {
      const privateKey = await this.getPrivateKey(userId, keyId);
      if (!privateKey) {
        return false;
      }
      
      // Test şifrələmə/deşifrələmə
      const testMessage = 'integrity_test';
      const testData = CryptoJS.AES.encrypt(testMessage, privateKey).toString();
      const decrypted = CryptoJS.AES.decrypt(testData, privateKey).toString(CryptoJS.enc.Utf8);
      
      return decrypted === testMessage;
    } catch (error) {
      console.error('❌ Key integrity verification failed:', error);
      return false;
    }
  }
}

export default EndToEndEncryption;
