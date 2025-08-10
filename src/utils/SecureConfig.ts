// Secure configuration manager - NO SECRETS IN MOBILE CODE
export class SecureConfig {
  // Public configuration only - no sensitive data
  static readonly PUBLIC_CONFIG = {
    API_VERSION: process.env.EXPO_PUBLIC_API_VERSION || 'v1',
    MAX_FILE_SIZE: parseInt(process.env.EXPO_PUBLIC_MAX_FILE_SIZE || '10485760'), // 10MB
    ALLOWED_FILE_TYPES: (process.env.EXPO_PUBLIC_ALLOWED_FILE_TYPES || 'image/jpeg,image/png,video/mp4').split(','),
    RATE_LIMIT_REQUESTS: parseInt(process.env.EXPO_PUBLIC_RATE_LIMIT_REQUESTS || '10'),
    RATE_LIMIT_WINDOW: parseInt(process.env.EXPO_PUBLIC_RATE_LIMIT_WINDOW || '60000'),
    SESSION_TIMEOUT: parseInt(process.env.EXPO_PUBLIC_SESSION_TIMEOUT || '3600000'), // 1 hour
    OTP_EXPIRY: parseInt(process.env.EXPO_PUBLIC_OTP_EXPIRY || '300000'), // 5 minutes
    MAX_LOGIN_ATTEMPTS: parseInt(process.env.EXPO_PUBLIC_MAX_LOGIN_ATTEMPTS || '5'),
    IS_PRODUCTION: process.env.EXPO_PUBLIC_APP_ENV === 'production',
    DEBUG_MODE: process.env.EXPO_PUBLIC_DEBUG_MODE === 'true',
  };

  // Server URLs (public endpoints only)
  static readonly ENDPOINTS = {
    BASE_URL: process.env.EXPO_PUBLIC_SERVER_URL || 'https://api.familymessenger.com',
    SOCKET_URL: process.env.EXPO_PUBLIC_SOCKET_URL || 'wss://api.familymessenger.com',
    AUTH_ENDPOINT: '/api/auth',
    MESSAGES_ENDPOINT: '/api/messages',
    FILES_ENDPOINT: '/api/files',
    USERS_ENDPOINT: '/api/users',
    SOS_ENDPOINT: '/api/sos',
  };

  // Client-side generated keys only (no server secrets)
  static generateClientKey(): string {
    // Generate client-side encryption key for local storage
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2);
    return btoa(timestamp + random).substring(0, 32);
  }

  // Validate configuration
  static validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required URLs
    if (!this.ENDPOINTS.BASE_URL.startsWith('https://') && this.PUBLIC_CONFIG.IS_PRODUCTION) {
      errors.push('HTTPS required in production');
    }

    if (!this.ENDPOINTS.SOCKET_URL.startsWith('wss://') && this.PUBLIC_CONFIG.IS_PRODUCTION) {
      errors.push('WSS required for sockets in production');
    }

    // Check file size limits
    if (this.PUBLIC_CONFIG.MAX_FILE_SIZE > 50 * 1024 * 1024) { // 50MB max
      errors.push('File size limit too high');
    }

    // Check rate limits
    if (this.PUBLIC_CONFIG.RATE_LIMIT_REQUESTS > 100) {
      errors.push('Rate limit too high');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Get API headers (no secrets included)
  static getPublicHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-API-Version': this.PUBLIC_CONFIG.API_VERSION,
      'X-Client-Platform': 'mobile',
      'X-Client-Version': '1.0.1',
    };
  }

  // Security check - ensure no secrets in client code
  static performSecurityCheck(): { secure: boolean; warnings: string[] } {
    const warnings: string[] = [];
    
    // Check for common secret patterns in environment
    const envVars = Object.keys(process.env);
    const suspiciousPatterns = [
      'PRIVATE_KEY',
      'SECRET_KEY', 
      'API_SECRET',
      'FIREBASE_PRIVATE',
      'JWT_SECRET'
    ];

    envVars.forEach(envVar => {
      if (envVar.startsWith('EXPO_PUBLIC_')) {
        suspiciousPatterns.forEach(pattern => {
          if (envVar.includes(pattern)) {
            warnings.push(`Suspicious public env var: ${envVar}`);
          }
        });
      }
    });

    if (this.PUBLIC_CONFIG.DEBUG_MODE && this.PUBLIC_CONFIG.IS_PRODUCTION) {
      warnings.push('Debug mode enabled in production');
    }

    return {
      secure: warnings.length === 0,
      warnings
    };
  }
}

// Production build safety check
if (SecureConfig.PUBLIC_CONFIG.IS_PRODUCTION) {
  const securityCheck = SecureConfig.performSecurityCheck();
  if (!securityCheck.secure) {
    console.error('🚨 SECURITY WARNINGS:', securityCheck.warnings);
  }
  
  const configCheck = SecureConfig.validateConfig();
  if (!configCheck.valid) {
    console.error('🚨 CONFIG ERRORS:', configCheck.errors);
  }
}

export default SecureConfig;
