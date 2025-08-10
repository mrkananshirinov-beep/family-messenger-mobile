import * as LocalAuthentication from 'expo-local-authentication';
import { Platform, Alert } from 'react-native';
import SecurityManager from './SecurityManager';
import InviteOnlyAuth from './InviteOnlyAuth';

export interface OTPData {
  code: string;
  expiresAt: number;
  attempts: number;
}

export class AdvancedAuthManager {
  private static readonly OTP_EXPIRY = 5 * 60 * 1000; // 5 dəqiqə
  private static readonly MAX_OTP_ATTEMPTS = 3;
  private static otpStorage: Map<string, OTPData> = new Map();

  // Biometrik mövcudluq yoxlaması
  static async isBiometricAvailable(): Promise<boolean> {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      return compatible && enrolled;
    } catch (error) {
      console.error('Biometric check failed:', error);
      return false;
    }
  }

  // Biometrik autentifikasiya
  static async authenticateWithBiometrics(): Promise<boolean> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Family Messenger-ə daxil olmaq üçün barmaq izinizi və ya üz tanımanızı istifadə edin',
        cancelLabel: 'Ləğv et',
        fallbackLabel: 'Şifrə istifadə et',
        requireConfirmation: true,
      });

      return result.success;
    } catch (error) {
      console.error('Biometric auth failed:', error);
      return false;
    }
  }

  // OTP yaratma və göndərmə
  static async generateOTP(userEmail: string): Promise<boolean> {
    try {
      // 6 rəqəmli OTP yaradır
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + this.OTP_EXPIRY;
      
      this.otpStorage.set(userEmail, {
        code: SecurityManager.encrypt(code),
        expiresAt,
        attempts: 0
      });

      // Real aplikasiyada email/SMS göndəriləcək
      console.log(`🔐 OTP Code for ${userEmail}: ${code}`);
      
      // Development üçün alert göstər
      if (__DEV__) {
        Alert.alert('OTP Kodu', `Təhlükəsizlik kodu: ${code}\n\n(Bu yalnız development modunda göstərilir)`);
      }

      return true;
    } catch (error) {
      console.error('OTP generation failed:', error);
      return false;
    }
  }

  // OTP doğrulama
  static verifyOTP(userEmail: string, inputCode: string): boolean {
    const otpData = this.otpStorage.get(userEmail);
    
    if (!otpData) {
      return false;
    }

    // Vaxt yoxlaması
    if (Date.now() > otpData.expiresAt) {
      this.otpStorage.delete(userEmail);
      return false;
    }

    // Cəhd sayı yoxlaması
    if (otpData.attempts >= this.MAX_OTP_ATTEMPTS) {
      this.otpStorage.delete(userEmail);
      return false;
    }

    // Kod yoxlaması
    const decryptedCode = SecurityManager.decrypt(otpData.code);
    if (inputCode === decryptedCode) {
      this.otpStorage.delete(userEmail);
      return true;
    } else {
      otpData.attempts++;
      return false;
    }
  }

  // Tam autentifikasiya prosesi
  static async fullAuthentication(
    firstName: string, 
    lastName: string, 
    email: string, 
    otpCode?: string
  ): Promise<{ success: boolean; requiresOTP?: boolean; blocked?: boolean; error?: string }> {
    
    // 1. Blok yoxlaması
    const blockStatus = InviteOnlyAuth.isBlocked(email);
    if (blockStatus.blocked) {
      const minutes = Math.ceil((blockStatus.remainingTime || 0) / 60000);
      return { 
        success: false, 
        blocked: true, 
        error: `Hesab ${minutes} dəqiqə bloklanıb. Yenidən cəhd edin.` 
      };
    }

    // 2. Allowlist yoxlaması
    const allowedUser = InviteOnlyAuth.isUserAllowed(firstName, lastName, email);
    if (!allowedUser) {
      InviteOnlyAuth.recordFailedAttempt(email);
      return { 
        success: false, 
        error: 'Bu ailə üzvü siyahısında deyilsiniz. Ailə adminindən icazə alın.' 
      };
    }

    // 3. OTP yoxlaması
    if (!otpCode) {
      // OTP tələb et
      const otpSent = await this.generateOTP(email);
      if (!otpSent) {
        return { success: false, error: 'OTP göndərilmədi. Yenidən cəhd edin.' };
      }
      return { success: false, requiresOTP: true };
    } else {
      // OTP doğrula
      const otpValid = this.verifyOTP(email, otpCode);
      if (!otpValid) {
        InviteOnlyAuth.recordFailedAttempt(email);
        return { success: false, error: 'OTP kodu yanlış və ya vaxtı keçib.' };
      }
    }

    // 4. Biometrik autentifikasiya (mövcudsa)
    const biometricAvailable = await this.isBiometricAvailable();
    if (biometricAvailable) {
      const biometricSuccess = await this.authenticateWithBiometrics();
      if (!biometricSuccess) {
        InviteOnlyAuth.recordFailedAttempt(email);
        return { success: false, error: 'Biometrik autentifikasiya uğursuz oldu.' };
      }
    }

    // 5. Uğurlu autentifikasiya
    InviteOnlyAuth.clearFailedAttempts(email);
    return { success: true };
  }

  // Rate limiting for API calls
  private static apiCallTimes: Map<string, number[]> = new Map();
  private static readonly RATE_LIMIT_WINDOW = 60 * 1000; // 1 dəqiqə
  private static readonly RATE_LIMIT_MAX_CALLS = 10; // 1 dəqiqədə max 10 çağırı

  static checkRateLimit(identifier: string): boolean {
    const now = Date.now();
    const calls = this.apiCallTimes.get(identifier) || [];
    
    // Köhnə çağırıları təmizlə
    const recentCalls = calls.filter(time => now - time < this.RATE_LIMIT_WINDOW);
    
    if (recentCalls.length >= this.RATE_LIMIT_MAX_CALLS) {
      return false; // Rate limit aşıldı
    }
    
    recentCalls.push(now);
    this.apiCallTimes.set(identifier, recentCalls);
    return true;
  }
}

export default AdvancedAuthManager;
