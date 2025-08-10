// src/utils/NotificationManager.ts
import * as Notifications from 'expo-notifications';
import { SecurityManager } from './SecurityManager';
import { Platform } from 'react-native';

export interface NotificationContent {
  title: string;
  body: string;
  data?: any;
  sound?: string;
  badge?: number;
}

export interface SecureNotificationSettings {
  showSensitiveContent: boolean;
  enablePreview: boolean;
  maxContentLength: number;
  allowedDataFields: string[];
}

class NotificationManager {
  private static instance: NotificationManager;
  private settings: SecureNotificationSettings = {
    showSensitiveContent: false,
    enablePreview: true,
    maxContentLength: 50,
    allowedDataFields: ['chatId', 'type', 'timestamp']
  };

  constructor() {
    this.initializeNotificationHandler();
  }

  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  private initializeNotificationHandler(): void {
    // Configure notification behavior
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });

    // Handle background notification responses
    Notifications.addNotificationResponseReceivedListener(response => {
      this.handleNotificationResponse(response);
    });
  }

  async scheduleSecureNotification(content: NotificationContent): Promise<string> {
    try {
      // Sanitize notification content
      const sanitizedContent = await this.sanitizeNotificationContent(content);
      
      // Check notification permissions
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Notification permissions not granted');
        return '';
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: sanitizedContent,
        trigger: null, // Show immediately
      });

      // Log notification (without sensitive content)
      await this.logNotificationEvent('sent', notificationId, {
        type: content.data?.type || 'message',
        timestamp: new Date().toISOString()
      });

      return notificationId;
    } catch (error) {
      console.error('Failed to schedule notification:', error);
      return '';
    }
  }

  private async sanitizeNotificationContent(content: NotificationContent): Promise<NotificationContent> {
    const sanitized: NotificationContent = {
      title: await this.sanitizeText(content.title),
      body: await this.sanitizeText(content.body),
      data: this.sanitizeData(content.data),
      sound: content.sound,
      badge: content.badge
    };

    // Apply privacy settings
    if (!this.settings.showSensitiveContent) {
      sanitized.title = this.obfuscateTitle(sanitized.title);
      sanitized.body = this.obfuscateBody(sanitized.body);
    }

    return sanitized;
  }

  private async sanitizeText(text: string): Promise<string> {
    if (!text) return '';

    // Remove potential sensitive patterns
    let sanitized = text
      .replace(/(\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4})/g, '[CARD NUMBER]') // Credit card numbers
      .replace(/(\d{3}[-\s]?\d{2}[-\s]?\d{4})/g, '[SSN]') // Social Security Numbers
      .replace(/(password|pwd|pass)/gi, '[PASSWORD]') // Password mentions
      .replace(/(\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b)/g, '[EMAIL]') // Email addresses
      .replace(/(\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4})/g, '[PHONE]'); // Phone numbers

    // Limit content length
    if (sanitized.length > this.settings.maxContentLength) {
      sanitized = sanitized.substring(0, this.settings.maxContentLength) + '...';
    }

    return sanitized;
  }

  private sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') return {};

    const sanitized: any = {};
    
    // Only include allowed data fields
    for (const field of this.settings.allowedDataFields) {
      if (data[field] !== undefined) {
        sanitized[field] = data[field];
      }
    }

    return sanitized;
  }

  private obfuscateTitle(title: string): string {
    if (!this.settings.enablePreview) {
      return 'New Message';
    }
    return title.length > 20 ? 'New Message' : title;
  }

  private obfuscateBody(body: string): string {
    if (!this.settings.enablePreview) {
      return 'You have a new message';
    }
    
    // Show only first few characters for context
    if (body.length > 15) {
      return body.substring(0, 12) + '...';
    }
    return body;
  }

  private async handleNotificationResponse(response: Notifications.NotificationResponse): Promise<void> {
    try {
      const notificationData = response.notification.request.content.data;
      
      // Log notification interaction
      await this.logNotificationEvent('opened', response.notification.request.identifier, {
        actionIdentifier: response.actionIdentifier,
        userText: response.userText,
        timestamp: new Date().toISOString()
      });

      // Handle notification action based on type
      if (notificationData?.type === 'message' && notificationData?.chatId) {
        // Navigate to chat (implement navigation logic)
        console.log('Opening chat:', notificationData.chatId);
      }
    } catch (error) {
      console.error('Failed to handle notification response:', error);
    }
  }

  async updateNotificationSettings(newSettings: Partial<SecureNotificationSettings>): Promise<void> {
    this.settings = { ...this.settings, ...newSettings };
    
    // Store settings securely
    await SecurityManager.storeToken('notification_settings', JSON.stringify(this.settings));
  }

  async loadNotificationSettings(): Promise<void> {
    try {
      const storedSettings = await SecurityManager.getToken('notification_settings');
      if (storedSettings) {
        this.settings = { ...this.settings, ...JSON.parse(storedSettings) };
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error);
    }
  }

  private async logNotificationEvent(action: string, notificationId: string, metadata: any): Promise<void> {
    try {
      const logEntry = {
        action,
        notificationId,
        timestamp: new Date().toISOString(),
        platform: Platform.OS,
        metadata: this.sanitizeData(metadata)
      };

      // Store log entry securely (without sensitive content)
      const logs = await this.getNotificationLogs();
      logs.push(logEntry);
      
      // Keep only last 100 log entries
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100);
      }

      await SecurityManager.storeToken('notification_logs', JSON.stringify(logs));
    } catch (error) {
      console.error('Failed to log notification event:', error);
    }
  }

  private async getNotificationLogs(): Promise<any[]> {
    try {
      const logs = await SecurityManager.getToken('notification_logs');
      return logs ? JSON.parse(logs) : [];
    } catch (error) {
      console.error('Failed to get notification logs:', error);
      return [];
    }
  }

  async clearNotificationHistory(): Promise<void> {
    try {
      await Notifications.dismissAllNotificationsAsync();
      await SecurityManager.removeToken('notification_logs');
    } catch (error) {
      console.error('Failed to clear notification history:', error);
    }
  }

  async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Notification permissions denied');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to request notification permissions:', error);
      return false;
    }
  }

  // Privacy-focused notification for different message types
  async sendPrivacyAwareNotification(messageType: 'text' | 'image' | 'video' | 'audio' | 'sos', senderId: string, chatId: string): Promise<void> {
    const notificationMap = {
      text: { title: 'New Message', body: 'You have a new text message' },
      image: { title: 'New Photo', body: 'Someone shared a photo' },
      video: { title: 'New Video', body: 'Someone shared a video' },
      audio: { title: 'New Voice Message', body: 'You have a new voice message' },
      sos: { title: '🚨 Emergency Alert', body: 'Emergency message received' }
    };

    const content = notificationMap[messageType] || notificationMap.text;
    
    await this.scheduleSecureNotification({
      ...content,
      data: {
        type: messageType,
        chatId,
        senderId: SecurityManager.encrypt(senderId).substring(0, 10), // Hash sender ID for privacy
        timestamp: new Date().toISOString()
      }
    });
  }
}

export default NotificationManager;
