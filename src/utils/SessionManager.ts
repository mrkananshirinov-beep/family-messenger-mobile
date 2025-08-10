// src/utils/SessionManager.ts
import { AppState, AppStateStatus } from 'react-native';
import { SecurityManager } from './SecurityManager';
import * as LocalAuthentication from 'expo-local-authentication';

export interface SessionConfig {
  maxInactivityMinutes: number;
  maxSessionDurationHours: number;
  requireBiometricOnResume: boolean;
  autoLockOnBackground: boolean;
  maxFailedAttempts: number;
  lockoutDurationMinutes: number;
}

export interface SessionState {
  isActive: boolean;
  isLocked: boolean;
  lastActivity: number;
  sessionStartTime: number;
  failedAttempts: number;
  lockedUntil?: number;
}

class SessionManager {
  private static instance: SessionManager;
  private sessionState: SessionState;
  private config: SessionConfig;
  private inactivityTimer?: NodeJS.Timeout;
  private appStateSubscription?: any;
  private listeners: Array<(state: SessionState) => void> = [];

  constructor() {
    this.config = {
      maxInactivityMinutes: 15,
      maxSessionDurationHours: 8,
      requireBiometricOnResume: true,
      autoLockOnBackground: true,
      maxFailedAttempts: 3,
      lockoutDurationMinutes: 30
    };

    this.sessionState = {
      isActive: false,
      isLocked: false,
      lastActivity: Date.now(),
      sessionStartTime: Date.now(),
      failedAttempts: 0
    };

    this.initializeSessionManager();
  }

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  private async initializeSessionManager(): Promise<void> {
    // Load saved session config
    await this.loadSessionConfig();
    
    // Load session state
    await this.loadSessionState();

    // Setup app state listener
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange.bind(this));

    // Start inactivity monitoring
    this.startInactivityTimer();

    console.log('🔐 Session Manager initialized');
  }

  private async loadSessionConfig(): Promise<void> {
    try {
      const configStr = await SecurityManager.getToken('session_config');
      if (configStr) {
        this.config = { ...this.config, ...JSON.parse(configStr) };
      }
    } catch (error) {
      console.error('Failed to load session config:', error);
    }
  }

  private async saveSessionConfig(): Promise<void> {
    try {
      await SecurityManager.storeToken('session_config', JSON.stringify(this.config));
    } catch (error) {
      console.error('Failed to save session config:', error);
    }
  }

  private async loadSessionState(): Promise<void> {
    try {
      const stateStr = await SecurityManager.getToken('session_state');
      if (stateStr) {
        const savedState = JSON.parse(stateStr);
        
        // Check if session has expired
        const now = Date.now();
        const maxSessionTime = this.config.maxSessionDurationHours * 60 * 60 * 1000;
        const maxInactivityTime = this.config.maxInactivityMinutes * 60 * 1000;

        if (
          (now - savedState.sessionStartTime > maxSessionTime) ||
          (now - savedState.lastActivity > maxInactivityTime)
        ) {
          // Session expired, reset
          await this.endSession();
        } else {
          this.sessionState = { ...this.sessionState, ...savedState };
        }
      }
    } catch (error) {
      console.error('Failed to load session state:', error);
    }
  }

  private async saveSessionState(): Promise<void> {
    try {
      await SecurityManager.storeToken('session_state', JSON.stringify(this.sessionState));
    } catch (error) {
      console.error('Failed to save session state:', error);
    }
  }

  async startSession(): Promise<boolean> {
    try {
      // Check if account is locked
      if (this.isAccountLocked()) {
        const remainingTime = this.getRemainingLockoutTime();
        console.warn(`Account locked. Try again in ${Math.ceil(remainingTime / 60)} minutes`);
        return false;
      }

      // Reset session state
      this.sessionState = {
        isActive: true,
        isLocked: false,
        lastActivity: Date.now(),
        sessionStartTime: Date.now(),
        failedAttempts: 0
      };

      await this.saveSessionState();
      this.startInactivityTimer();
      this.notifyListeners();

      await this.logSessionEvent('started');
      console.log('✅ Session started successfully');
      return true;
    } catch (error) {
      console.error('Failed to start session:', error);
      return false;
    }
  }

  async endSession(): Promise<void> {
    try {
      this.sessionState.isActive = false;
      this.sessionState.isLocked = false;
      
      await this.saveSessionState();
      this.stopInactivityTimer();
      this.notifyListeners();

      // Clear sensitive data from memory
      await this.clearSensitiveData();

      await this.logSessionEvent('ended');
      console.log('🔒 Session ended');
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  }

  async lockSession(): Promise<void> {
    try {
      this.sessionState.isLocked = true;
      await this.saveSessionState();
      this.stopInactivityTimer();
      this.notifyListeners();

      await this.logSessionEvent('locked');
      console.log('🔒 Session locked');
    } catch (error) {
      console.error('Failed to lock session:', error);
    }
  }

  async unlockSession(password?: string): Promise<boolean> {
    try {
      if (this.isAccountLocked()) {
        console.warn('Account is locked due to too many failed attempts');
        return false;
      }

      let unlockSuccessful = false;

      // Try biometric authentication first if enabled
      if (this.config.requireBiometricOnResume) {
        unlockSuccessful = await this.authenticateWithBiometrics();
      }

      // Fallback to password if biometric fails or not available
      if (!unlockSuccessful && password) {
        unlockSuccessful = await this.authenticateWithPassword(password);
      }

      if (unlockSuccessful) {
        this.sessionState.isLocked = false;
        this.sessionState.failedAttempts = 0;
        this.sessionState.lastActivity = Date.now();
        
        await this.saveSessionState();
        this.startInactivityTimer();
        this.notifyListeners();

        await this.logSessionEvent('unlocked');
        console.log('✅ Session unlocked');
        return true;
      } else {
        await this.handleFailedUnlockAttempt();
        return false;
      }
    } catch (error) {
      console.error('Failed to unlock session:', error);
      await this.handleFailedUnlockAttempt();
      return false;
    }
  }

  private async authenticateWithBiometrics(): Promise<boolean> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        return false;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Family Messenger',
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use Password'
      });

      return result.success;
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      return false;
    }
  }

  private async authenticateWithPassword(password: string): Promise<boolean> {
    try {
      const storedPassword = await SecurityManager.getToken('user_password');
      if (!storedPassword) {
        return false;
      }

      // In production, use proper password hashing
      const hashedPassword = SecurityManager.encrypt(password);
      return hashedPassword === storedPassword;
    } catch (error) {
      console.error('Password authentication failed:', error);
      return false;
    }
  }

  private async handleFailedUnlockAttempt(): Promise<void> {
    this.sessionState.failedAttempts++;
    
    if (this.sessionState.failedAttempts >= this.config.maxFailedAttempts) {
      // Lock account
      this.sessionState.lockedUntil = Date.now() + (this.config.lockoutDurationMinutes * 60 * 1000);
      await this.logSessionEvent('account_locked', {
        failedAttempts: this.sessionState.failedAttempts
      });
      console.warn('Account locked due to too many failed attempts');
    }

    await this.saveSessionState();
    this.notifyListeners();
  }

  updateActivity(): void {
    if (this.sessionState.isActive && !this.sessionState.isLocked) {
      this.sessionState.lastActivity = Date.now();
      this.saveSessionState();
      this.restartInactivityTimer();
    }
  }

  private startInactivityTimer(): void {
    this.stopInactivityTimer();
    
    const timeoutMs = this.config.maxInactivityMinutes * 60 * 1000;
    this.inactivityTimer = setTimeout(() => {
      this.handleInactivityTimeout();
    }, timeoutMs);
  }

  private stopInactivityTimer(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = undefined;
    }
  }

  private restartInactivityTimer(): void {
    this.startInactivityTimer();
  }

  private async handleInactivityTimeout(): Promise<void> {
    if (this.sessionState.isActive && !this.sessionState.isLocked) {
      await this.lockSession();
      await this.logSessionEvent('inactivity_timeout');
    }
  }

  private handleAppStateChange = (nextAppState: AppStateStatus): void => {
    if (nextAppState === 'background' || nextAppState === 'inactive') {
      if (this.config.autoLockOnBackground && this.sessionState.isActive) {
        this.lockSession();
      }
    } else if (nextAppState === 'active') {
      if (this.sessionState.isLocked && this.config.requireBiometricOnResume) {
        // Trigger unlock UI
        this.notifyListeners();
      }
    }
  };

  private async clearSensitiveData(): Promise<void> {
    // Clear cached sensitive data from memory
    // This should be implemented based on your app's data structure
    console.log('🧹 Clearing sensitive data from memory');
  }

  private isAccountLocked(): boolean {
    if (!this.sessionState.lockedUntil) {
      return false;
    }
    return Date.now() < this.sessionState.lockedUntil;
  }

  private getRemainingLockoutTime(): number {
    if (!this.sessionState.lockedUntil) {
      return 0;
    }
    return Math.max(0, this.sessionState.lockedUntil - Date.now());
  }

  async updateSessionConfig(newConfig: Partial<SessionConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    await this.saveSessionConfig();
    
    // Restart inactivity timer with new settings
    if (this.sessionState.isActive && !this.sessionState.isLocked) {
      this.startInactivityTimer();
    }
  }

  getSessionState(): SessionState {
    return { ...this.sessionState };
  }

  getSessionConfig(): SessionConfig {
    return { ...this.config };
  }

  addStateListener(listener: (state: SessionState) => void): void {
    this.listeners.push(listener);
  }

  removeStateListener(listener: (state: SessionState) => void): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.getSessionState());
      } catch (error) {
        console.error('Session listener error:', error);
      }
    });
  }

  private async logSessionEvent(action: string, metadata: any = {}): Promise<void> {
    try {
      const logs = await this.getSessionLogs();
      const logEntry = {
        action,
        timestamp: new Date().toISOString(),
        sessionDuration: this.sessionState.isActive ? Date.now() - this.sessionState.sessionStartTime : 0,
        metadata
      };

      logs.push(logEntry);

      // Keep only last 100 log entries
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100);
      }

      await SecurityManager.storeToken('session_logs', JSON.stringify(logs));
    } catch (error) {
      console.error('Failed to log session event:', error);
    }
  }

  private async getSessionLogs(): Promise<any[]> {
    try {
      const logs = await SecurityManager.getToken('session_logs');
      return logs ? JSON.parse(logs) : [];
    } catch (error) {
      console.error('Failed to get session logs:', error);
      return [];
    }
  }

  async getSessionStatistics(): Promise<any> {
    try {
      const logs = await this.getSessionLogs();
      const now = Date.now();
      const today = new Date().toDateString();

      const todayLogs = logs.filter(log => 
        new Date(log.timestamp).toDateString() === today
      );

      const stats = {
        totalSessions: logs.filter(log => log.action === 'started').length,
        todaySessions: todayLogs.filter(log => log.action === 'started').length,
        averageSessionDuration: 0,
        totalLockouts: logs.filter(log => log.action === 'account_locked').length,
        currentSessionDuration: this.sessionState.isActive ? now - this.sessionState.sessionStartTime : 0
      };

      const sessionDurations = logs
        .filter(log => log.action === 'ended' && log.sessionDuration)
        .map(log => log.sessionDuration);

      if (sessionDurations.length > 0) {
        stats.averageSessionDuration = sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length;
      }

      return stats;
    } catch (error) {
      console.error('Failed to get session statistics:', error);
      return {};
    }
  }

  async clearSessionLogs(): Promise<void> {
    try {
      await SecurityManager.removeToken('session_logs');
    } catch (error) {
      console.error('Failed to clear session logs:', error);
    }
  }

  destroy(): void {
    this.stopInactivityTimer();
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
    this.listeners = [];
  }
}

export default SessionManager;
