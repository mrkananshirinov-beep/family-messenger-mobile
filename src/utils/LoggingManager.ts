// src/utils/LoggingManager.ts
import { SecurityManager } from './SecurityManager';
import { Platform } from 'react-native';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SECURITY = 4
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  metadata?: any;
  sanitized: boolean;
  deviceInfo?: {
    platform: string;
    version?: string;
  };
}

export interface LoggingConfig {
  enableLogging: boolean;
  logLevel: LogLevel;
  maxLogEntries: number;
  enableMetadata: boolean;
  sanitizePersonalData: boolean;
  retentionDays: number;
  categories: {
    [key: string]: boolean;
  };
}

export interface SensitiveDataPatterns {
  email: RegExp;
  phone: RegExp;
  creditCard: RegExp;
  ssn: RegExp;
  password: RegExp;
  token: RegExp;
  ip: RegExp;
  coordinate: RegExp;
}

class LoggingManager {
  private static instance: LoggingManager;
  private config: LoggingConfig;
  private sensitivePatterns: SensitiveDataPatterns;
  private logQueue: LogEntry[] = [];
  private isInitialized = false;

  constructor() {
    this.config = {
      enableLogging: true,
      logLevel: LogLevel.INFO,
      maxLogEntries: 1000,
      enableMetadata: false, // Disabled by default for privacy
      sanitizePersonalData: true,
      retentionDays: 7,
      categories: {
        auth: true,
        chat: false, // Chat logs disabled for privacy
        media: false, // Media logs disabled for privacy
        network: true,
        security: true,
        error: true,
        performance: false
      }
    };

    this.sensitivePatterns = {
      email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      phone: /\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g,
      creditCard: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
      ssn: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,
      password: /(password|pwd|pass|token|key|secret)["':\s]*["']?([^"'\s,}]+)/gi,
      token: /[a-zA-Z0-9_-]{20,}/g,
      ip: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g,
      coordinate: /[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?),\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)/g
    };

    this.initializeLogging();
  }

  static getInstance(): LoggingManager {
    if (!LoggingManager.instance) {
      LoggingManager.instance = new LoggingManager();
    }
    return LoggingManager.instance;
  }

  private async initializeLogging(): Promise<void> {
    try {
      // Load saved configuration
      await this.loadConfig();
      
      // Clean old logs based on retention policy
      await this.cleanOldLogs();
      
      this.isInitialized = true;
      this.log(LogLevel.INFO, 'system', 'Logging Manager initialized', { version: '1.0.0' });
    } catch (error) {
      console.error('Failed to initialize logging:', error);
    }
  }

  private async loadConfig(): Promise<void> {
    try {
      const configStr = await SecurityManager.getToken('logging_config');
      if (configStr) {
        this.config = { ...this.config, ...JSON.parse(configStr) };
      }
    } catch (error) {
      console.error('Failed to load logging config:', error);
    }
  }

  private async saveConfig(): Promise<void> {
    try {
      await SecurityManager.storeToken('logging_config', JSON.stringify(this.config));
    } catch (error) {
      console.error('Failed to save logging config:', error);
    }
  }

  async log(level: LogLevel, category: string, message: string, metadata?: any): Promise<void> {
    if (!this.isInitialized || !this.config.enableLogging) {
      return;
    }

    // Check log level
    if (level < this.config.logLevel) {
      return;
    }

    // Check category filter
    if (!this.config.categories[category]) {
      return;
    }

    try {
      const logEntry = await this.createLogEntry(level, category, message, metadata);
      await this.storeLogEntry(logEntry);
      
      // Also log to console in development
      if (__DEV__) {
        this.logToConsole(logEntry);
      }
    } catch (error) {
      console.error('Failed to create log entry:', error);
    }
  }

  private async createLogEntry(level: LogLevel, category: string, message: string, metadata?: any): Promise<LogEntry> {
    const logId = this.generateLogId();
    
    // Sanitize message and metadata
    const sanitizedMessage = this.sanitizeData(message);
    let sanitizedMetadata = undefined;
    let isSanitized = message !== sanitizedMessage;

    if (metadata && this.config.enableMetadata) {
      sanitizedMetadata = this.sanitizeMetadata(metadata);
      isSanitized = isSanitized || (JSON.stringify(metadata) !== JSON.stringify(sanitizedMetadata));
    }

    const logEntry: LogEntry = {
      id: logId,
      timestamp: new Date().toISOString(),
      level,
      category,
      message: sanitizedMessage,
      metadata: sanitizedMetadata,
      sanitized: isSanitized,
      deviceInfo: {
        platform: Platform.OS,
        version: Platform.Version?.toString()
      }
    };

    return logEntry;
  }

  private sanitizeData(data: string): string {
    let sanitized = data;

    if (this.config.sanitizePersonalData) {
      // Replace sensitive patterns
      sanitized = sanitized
        .replace(this.sensitivePatterns.email, '[EMAIL_REDACTED]')
        .replace(this.sensitivePatterns.phone, '[PHONE_REDACTED]')
        .replace(this.sensitivePatterns.creditCard, '[CARD_REDACTED]')
        .replace(this.sensitivePatterns.ssn, '[SSN_REDACTED]')
        .replace(this.sensitivePatterns.password, '$1: [REDACTED]')
        .replace(this.sensitivePatterns.ip, '[IP_REDACTED]')
        .replace(this.sensitivePatterns.coordinate, '[LOCATION_REDACTED]');

      // Remove potential tokens (but be careful not to break legitimate log data)
      sanitized = sanitized.replace(/\b[A-Za-z0-9_-]{40,}\b/g, '[TOKEN_REDACTED]');
    }

    return sanitized;
  }

  private sanitizeMetadata(metadata: any): any {
    if (!metadata || typeof metadata !== 'object') {
      return metadata;
    }

    const sanitized: any = {};
    const allowedFields = [
      'userId', 'chatId', 'messageId', 'timestamp', 'type', 'action', 
      'status', 'duration', 'count', 'version', 'platform', 'category'
    ];

    const sensitiveFields = [
      'password', 'token', 'secret', 'key', 'auth', 'credential',
      'email', 'phone', 'address', 'location', 'ip', 'device',
      'fingerprint', 'hash', 'signature', 'content', 'message'
    ];

    for (const [key, value] of Object.entries(metadata)) {
      const lowerKey = key.toLowerCase();
      
      // Skip sensitive fields entirely
      if (sensitiveFields.some(field => lowerKey.includes(field))) {
        continue;
      }

      // Only include allowed fields
      if (allowedFields.includes(key)) {
        if (typeof value === 'string') {
          sanitized[key] = this.sanitizeData(value);
        } else if (typeof value === 'number' || typeof value === 'boolean') {
          sanitized[key] = value;
        } else if (Array.isArray(value)) {
          sanitized[key] = value.map(item => 
            typeof item === 'string' ? this.sanitizeData(item) : '[OBJECT_REDACTED]'
          );
        } else {
          sanitized[key] = '[OBJECT_REDACTED]';
        }
      }
    }

    return sanitized;
  }

  private async storeLogEntry(logEntry: LogEntry): Promise<void> {
    try {
      const logs = await this.getLogs();
      logs.push(logEntry);

      // Enforce max log entries limit
      if (logs.length > this.config.maxLogEntries) {
        logs.splice(0, logs.length - this.config.maxLogEntries);
      }

      await SecurityManager.storeToken('app_logs', JSON.stringify(logs));
    } catch (error) {
      console.error('Failed to store log entry:', error);
    }
  }

  private logToConsole(logEntry: LogEntry): void {
    const timestamp = new Date(logEntry.timestamp).toLocaleTimeString();
    const levelStr = LogLevel[logEntry.level];
    const prefix = `[${timestamp}] [${levelStr}] [${logEntry.category}]`;
    
    switch (logEntry.level) {
      case LogLevel.DEBUG:
        console.log(`${prefix} ${logEntry.message}`, logEntry.metadata || '');
        break;
      case LogLevel.INFO:
        console.info(`${prefix} ${logEntry.message}`, logEntry.metadata || '');
        break;
      case LogLevel.WARN:
        console.warn(`${prefix} ${logEntry.message}`, logEntry.metadata || '');
        break;
      case LogLevel.ERROR:
      case LogLevel.SECURITY:
        console.error(`${prefix} ${logEntry.message}`, logEntry.metadata || '');
        break;
    }
  }

  async getLogs(category?: string, level?: LogLevel, limit?: number): Promise<LogEntry[]> {
    try {
      const allLogs = await this.getStoredLogs();
      let filteredLogs = allLogs;

      if (category) {
        filteredLogs = filteredLogs.filter(log => log.category === category);
      }

      if (level !== undefined) {
        filteredLogs = filteredLogs.filter(log => log.level >= level);
      }

      if (limit) {
        filteredLogs = filteredLogs.slice(-limit);
      }

      return filteredLogs;
    } catch (error) {
      console.error('Failed to get logs:', error);
      return [];
    }
  }

  private async getStoredLogs(): Promise<LogEntry[]> {
    try {
      const logsStr = await SecurityManager.getToken('app_logs');
      return logsStr ? JSON.parse(logsStr) : [];
    } catch (error) {
      console.error('Failed to get stored logs:', error);
      return [];
    }
  }

  async exportLogs(sanitizeForSharing: boolean = true): Promise<string> {
    try {
      const logs = await this.getStoredLogs();
      
      if (sanitizeForSharing) {
        // Extra sanitization for sharing
        const sanitizedLogs = logs.map(log => ({
          timestamp: log.timestamp,
          level: LogLevel[log.level],
          category: log.category,
          message: log.sanitized ? log.message : this.sanitizeData(log.message),
          deviceInfo: {
            platform: log.deviceInfo?.platform || 'unknown'
          }
          // Exclude metadata entirely when sharing
        }));
        
        return JSON.stringify(sanitizedLogs, null, 2);
      } else {
        return JSON.stringify(logs, null, 2);
      }
    } catch (error) {
      console.error('Failed to export logs:', error);
      return '[]';
    }
  }

  async clearLogs(category?: string): Promise<void> {
    try {
      if (category) {
        const logs = await this.getStoredLogs();
        const filteredLogs = logs.filter(log => log.category !== category);
        await SecurityManager.storeToken('app_logs', JSON.stringify(filteredLogs));
      } else {
        await SecurityManager.removeToken('app_logs');
      }
      
      this.log(LogLevel.INFO, 'system', `Logs cleared${category ? ` for category: ${category}` : ''}`);
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  }

  private async cleanOldLogs(): Promise<void> {
    try {
      const logs = await this.getStoredLogs();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

      const filteredLogs = logs.filter(log => 
        new Date(log.timestamp) > cutoffDate
      );

      if (filteredLogs.length !== logs.length) {
        await SecurityManager.storeToken('app_logs', JSON.stringify(filteredLogs));
        console.log(`Cleaned ${logs.length - filteredLogs.length} old log entries`);
      }
    } catch (error) {
      console.error('Failed to clean old logs:', error);
    }
  }

  async updateConfig(newConfig: Partial<LoggingConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    await this.saveConfig();
    
    this.log(LogLevel.INFO, 'system', 'Logging configuration updated', {
      enableLogging: this.config.enableLogging,
      logLevel: LogLevel[this.config.logLevel],
      sanitizePersonalData: this.config.sanitizePersonalData
    });
  }

  getConfig(): LoggingConfig {
    return { ...this.config };
  }

  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Convenience methods for different log levels
  debug(category: string, message: string, metadata?: any): Promise<void> {
    return this.log(LogLevel.DEBUG, category, message, metadata);
  }

  info(category: string, message: string, metadata?: any): Promise<void> {
    return this.log(LogLevel.INFO, category, message, metadata);
  }

  warn(category: string, message: string, metadata?: any): Promise<void> {
    return this.log(LogLevel.WARN, category, message, metadata);
  }

  error(category: string, message: string, metadata?: any): Promise<void> {
    return this.log(LogLevel.ERROR, category, message, metadata);
  }

  security(category: string, message: string, metadata?: any): Promise<void> {
    return this.log(LogLevel.SECURITY, category, message, metadata);
  }

  async getLogStatistics(): Promise<any> {
    try {
      const logs = await this.getStoredLogs();
      const stats = {
        totalLogs: logs.length,
        logsByLevel: {} as { [key: string]: number },
        logsByCategory: {} as { [key: string]: number },
        sanitizedLogs: logs.filter(log => log.sanitized).length,
        oldestLog: logs.length > 0 ? logs[0].timestamp : null,
        newestLog: logs.length > 0 ? logs[logs.length - 1].timestamp : null
      };

      // Count by level
      logs.forEach(log => {
        const levelName = LogLevel[log.level];
        stats.logsByLevel[levelName] = (stats.logsByLevel[levelName] || 0) + 1;
      });

      // Count by category
      logs.forEach(log => {
        stats.logsByCategory[log.category] = (stats.logsByCategory[log.category] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Failed to get log statistics:', error);
      return {};
    }
  }
}

export default LoggingManager;
