// src/config/storage.ts
// LOCAL-ONLY CONFIGURATION
export const DEFAULT_STORAGE_MODE = 'local_only';

export const STORAGE_CONFIG = {
  // Current mode: Local only (100% secure)
  mode: 'local_only',
  
  // Future server configuration (ready for when you get hosting)
  server: {
    enabled: false, // Will be true when you add server
    url: '', // Your server URL when ready
    apiKey: '', // API key when implemented
    syncInterval: 30000, // 30 seconds
  },
  
  // Local storage settings
  local: {
    encryption: true,
    biometric: true,
    autoBackup: true,
    maxBackups: 10,
    backupLocation: 'documents'
  },
  
  // Future cloud settings (disabled for now)
  cloud: {
    enabled: false,
    provider: 'none', // Will be 'custom' when you add server
    syncOnWifi: true,
    autoUpload: false
  }
};

export const SECURITY_SETTINGS = {
  encryptionLevel: 'maximum',
  localOnly: true,
  offlineMode: true,
  privateMode: true
};

// Migration helper for future server addition
export const enableServerSync = (serverUrl: string, apiKey: string) => {
  return {
    ...STORAGE_CONFIG,
    mode: 'local_with_cloud',
    server: {
      enabled: true,
      url: serverUrl,
      apiKey: apiKey,
      syncInterval: 30000
    },
    cloud: {
      enabled: true,
      provider: 'custom',
      syncOnWifi: true,
      autoUpload: true
    }
  };
};

// For when you want to go back to local-only
export const disableServerSync = () => {
  return {
    ...STORAGE_CONFIG,
    mode: 'local_only',
    server: {
      enabled: false,
      url: '',
      apiKey: '',
      syncInterval: 30000
    },
    cloud: {
      enabled: false,
      provider: 'none',
      syncOnWifi: false,
      autoUpload: false
    }
  };
};
