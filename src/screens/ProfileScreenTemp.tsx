import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

const ProfileScreenTemp: React.FC = () => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Çıxış',
      'Profilinizdən çıxmaq istədiyinizə əminsiniz?',
      [
        { text: 'Ləğv et', style: 'cancel' },
        { 
          text: 'Çıx', 
          style: 'destructive',
          onPress: async () => {
            await logout();
            Alert.alert('Çıxış edildi', 'Profilinizdən uğurla çıxdınız');
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={40} color="#667eea" />
          </View>
          
          <Text style={styles.name}>{user?.name || 'İstifadəçi'}</Text>
          <Text style={styles.username}>@{user?.username || 'user'}</Text>
          <Text style={styles.birthday}>🎂 {user?.birthday || '01.01.1990'}</Text>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Profil Məlumatları</Text>
          <View style={styles.infoItem}>
            <Ionicons name="id-card-outline" size={20} color="#666" />
            <Text style={styles.infoText}>ID: {user?.id}</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="person-outline" size={20} color="#666" />
            <Text style={styles.infoText}>Ad: {user?.name}</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="at-outline" size={20} color="#666" />
            <Text style={styles.infoText}>Username: {user?.username}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="white" />
          <Text style={styles.logoutText}>Çıxış et</Text>
        </TouchableOpacity>

        <View style={styles.noteSection}>
          <Text style={styles.noteText}>
            📝 Profil redaktəsi və şəkil yükləmə funksiyaları təmir edilir.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 30,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  birthday: {
    fontSize: 14,
    color: '#888',
  },
  infoSection: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
  },
  logoutButton: {
    backgroundColor: '#ff4757',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  logoutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  noteSection: {
    backgroundColor: '#fff3cd',
    padding: 16,
    borderRadius: 8,
    borderColor: '#ffeaa7',
    borderWidth: 1,
  },
  noteText: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
  },
});

export default ProfileScreenTemp;
