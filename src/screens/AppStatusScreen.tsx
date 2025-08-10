import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';

interface AppStatusScreenProps {
  currentUser: {
    id: string;
    username: string;
    name: string;
  };
  onBack: () => void;
}

const AppStatusScreen: React.FC<AppStatusScreenProps> = ({ currentUser, onBack }) => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalMessages: 0,
    totalPhotos: 0,
    totalSOSEvents: 0,
    storageUsed: 0,
    appVersion: '1.0.0',
    buildDate: '2025-08-07',
    platform: Platform.OS,
  });

  useEffect(() => {
    loadAppStats();
  }, []);

  const loadAppStats = () => {
    try {
      if (Platform.OS === 'web') {
        // Count users
        const users = JSON.parse(localStorage.getItem('simple_users') || '[]');
        
        // Count messages
        const messages = JSON.parse(localStorage.getItem('family_chat_messages') || '[]');
        
        // Count photos
        const photos = JSON.parse(localStorage.getItem('family_photo_album') || '[]');
        
        // Count SOS events
        const sosEvents = JSON.parse(localStorage.getItem('sos_history') || '[]');
        
        // Calculate storage usage
        let storageUsed = 0;
        for (let key in localStorage) {
          if (localStorage.hasOwnProperty(key)) {
            storageUsed += localStorage[key].length;
          }
        }

        setStats({
          totalUsers: users.length,
          totalMessages: Math.max(0, messages.length - 1), // Exclude welcome message
          totalPhotos: Math.max(0, photos.length - 1), // Exclude welcome photo
          totalSOSEvents: sosEvents.length,
          storageUsed: storageUsed,
          appVersion: '1.0.0',
          buildDate: '2025-08-07',
          platform: Platform.OS,
        });

        console.log('📊 App stats loaded');
      }
    } catch (error) {
      console.error('❌ Error loading app stats:', error);
    }
  };

  const clearAllData = () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        '⚠️ XƏBƏRDARLIQ!\n\nBütün məlumatlar silinəcək:\n- İstifadəçilər\n- Mesajlar\n- Fotolar\n- SOS tarixçəsi\n\nDavam etmək istədiyinizə əminsiniz?'
      );
      
      if (confirmed) {
        localStorage.clear();
        window.alert('✅ Bütün məlumatlar silindi!\n\nSəhifəni yeniləyin.');
        console.log('🗑️ All data cleared');
      }
    }
  };

  const exportData = () => {
    if (Platform.OS === 'web') {
      try {
        const exportData = {
          users: JSON.parse(localStorage.getItem('simple_users') || '[]'),
          messages: JSON.parse(localStorage.getItem('family_chat_messages') || '[]'),
          photos: JSON.parse(localStorage.getItem('family_photo_album') || '[]'),
          sosHistory: JSON.parse(localStorage.getItem('sos_history') || '[]'),
          exportDate: new Date().toISOString(),
          appVersion: '1.0.0',
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `family_messenger_backup_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
        
        window.alert('📥 Məlumatlar export edildi!');
        console.log('📤 Data exported successfully');
      } catch (error) {
        console.error('❌ Export error:', error);
        window.alert('❌ Export xətası!');
      }
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getSystemInfo = () => {
    if (Platform.OS === 'web') {
      return {
        browser: navigator.userAgent.split(' ').pop() || 'Unknown',
        language: navigator.language,
        online: navigator.onLine,
        cookieEnabled: navigator.cookieEnabled,
        screen: `${screen.width}x${screen.height}`,
      };
    }
    return {};
  };

  const systemInfo = getSystemInfo();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Geri</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>📊 App Status</Text>
          <Text style={styles.headerSubtitle}>System dashboard</Text>
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={loadAppStats}>
          <Text style={styles.refreshButtonText}>🔄</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContainer}>
        {/* App Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📈 App Statistikaları</Text>
          
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>👥 Qeydiyyatlı İstifadəçilər:</Text>
            <Text style={styles.statValue}>{stats.totalUsers}</Text>
          </View>
          
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>💬 Ümumi Mesajlar:</Text>
            <Text style={styles.statValue}>{stats.totalMessages}</Text>
          </View>
          
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>📸 Paylaşılan Fotolar:</Text>
            <Text style={styles.statValue}>{stats.totalPhotos}</Text>
          </View>
          
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>🆘 SOS Hadisələri:</Text>
            <Text style={styles.statValue}>{stats.totalSOSEvents}</Text>
          </View>
          
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>💾 İstifadə Olunan Yaddaş:</Text>
            <Text style={styles.statValue}>{formatBytes(stats.storageUsed)}</Text>
          </View>
        </View>

        {/* App Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📱 App Məlumatları</Text>
          
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>🔢 Versiya:</Text>
            <Text style={styles.statValue}>{stats.appVersion}</Text>
          </View>
          
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>📅 Build Tarixi:</Text>
            <Text style={styles.statValue}>{stats.buildDate}</Text>
          </View>
          
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>💻 Platform:</Text>
            <Text style={styles.statValue}>{stats.platform}</Text>
          </View>
          
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>🌐 Browser:</Text>
            <Text style={styles.statValue}>{systemInfo.browser || 'N/A'}</Text>
          </View>
          
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>🌍 Dil:</Text>
            <Text style={styles.statValue}>{systemInfo.language || 'N/A'}</Text>
          </View>
        </View>

        {/* Current User */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👤 Cari İstifadəçi</Text>
          
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>🆔 İstifadəçi ID:</Text>
            <Text style={styles.statValue}>{currentUser.id.substring(0, 20)}...</Text>
          </View>
          
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>👤 İstifadəçi Adı:</Text>
            <Text style={styles.statValue}>@{currentUser.username}</Text>
          </View>
          
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>📝 Tam Ad:</Text>
            <Text style={styles.statValue}>{currentUser.name}</Text>
          </View>
          
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>🟢 Status:</Text>
            <Text style={styles.statValueGreen}>Online</Text>
          </View>
        </View>

        {/* App Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚡ Mövcud Funksiyalar</Text>
          
          <View style={styles.featureRow}>
            <Text style={styles.featureIcon}>✅</Text>
            <Text style={styles.featureText}>Qeydiyyat və Giriş Sistemi</Text>
          </View>
          
          <View style={styles.featureRow}>
            <Text style={styles.featureIcon}>✅</Text>
            <Text style={styles.featureText}>Ailə Qrupu Söhbəti</Text>
          </View>
          
          <View style={styles.featureRow}>
            <Text style={styles.featureIcon}>✅</Text>
            <Text style={styles.featureText}>Təcili SOS Sistemi</Text>
          </View>
          
          <View style={styles.featureRow}>
            <Text style={styles.featureIcon}>✅</Text>
            <Text style={styles.featureText}>Ailə Foto Albumu</Text>
          </View>
          
          <View style={styles.featureRow}>
            <Text style={styles.featureIcon}>✅</Text>
            <Text style={styles.featureText}>Cross-platform Dəstək</Text>
          </View>
          
          <View style={styles.featureRow}>
            <Text style={styles.featureIcon}>✅</Text>
            <Text style={styles.featureText}>Real-time Mesajlaşma</Text>
          </View>
          
          <View style={styles.featureRow}>
            <Text style={styles.featureIcon}>✅</Text>
            <Text style={styles.featureText}>Location Tracking</Text>
          </View>
          
          <View style={styles.featureRow}>
            <Text style={styles.featureIcon}>✅</Text>
            <Text style={styles.featureText}>File Upload/Download</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔧 Sistem Əməliyyatları</Text>
          
          <TouchableOpacity style={styles.actionButton} onPress={exportData}>
            <Text style={styles.actionButtonText}>📥 Məlumatları Export Et</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={loadAppStats}>
            <Text style={styles.actionButtonText}>🔄 Statistikaları Yenilə</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.actionButton, styles.dangerButton]} onPress={clearAllData}>
            <Text style={styles.actionButtonText}>🗑️ Bütün Məlumatları Sil</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            🚀 Family Messenger v{stats.appVersion} - Build {stats.buildDate}
          </Text>
          <Text style={styles.footerText}>
            💻 {stats.platform} platform | 📊 Real-time dashboard
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2c3e50',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    paddingTop: 50,
  },
  backButton: {
    padding: 5,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  refreshButton: {
    padding: 5,
  },
  refreshButtonText: {
    fontSize: 18,
  },
  scrollContainer: {
    flex: 1,
  },
  section: {
    backgroundColor: 'white',
    margin: 10,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  statValueGreen: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  featureIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  featureText: {
    fontSize: 14,
    color: '#2c3e50',
  },
  actionButton: {
    backgroundColor: '#3498db',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  dangerButton: {
    backgroundColor: '#e74c3c',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
  },
});

export default AppStatusScreen;
