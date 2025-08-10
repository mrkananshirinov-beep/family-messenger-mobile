import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  TextInput,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../contexts/AuthContext';

interface UserProfile {
  id: string;
  username: string;
  name: string;
  email: string;
  phone?: string;
  birthday?: string;
  profilePicture?: string;
  bio?: string;
}

const ProfileScreen: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<UserProfile | null>(null);
  const { user, token, logout } = useAuth();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    if (!token || !user) return;

    try {
      setIsLoading(true);
      // If no server, use mock data from auth context
      const mockProfile: UserProfile = {
        id: user.id || '1',
        username: user.username || 'user',
        fullName: user.name || 'İstifadəçi',
        email: user.email || 'user@example.com',
        phone: '',
        birthday: '',
        profilePicture: '',
        bio: '',
      };
      setProfile(mockProfile);
      setEditedProfile(mockProfile);
    } catch (error) {
      console.error('Profile load error:', error);
      // Fallback to user data from auth context
      const mockProfile: UserProfile = {
        id: user?.id || '1',
        username: user?.username || 'user',
        fullName: user?.name || 'İstifadəçi',
        email: user?.email || 'user@example.com',
        phone: '',
        birthday: '',
        profilePicture: '',
        bio: '',
      };
      setProfile(mockProfile);
      setEditedProfile(mockProfile);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImagePicker = () => {
    Alert.alert(
      'Profil Şəkli',
      'Profil şəklinizi necə dəyişmək istəyirsiniz?',
      [
        { text: 'Ləğv et', style: 'cancel' },
        { text: 'Kameradan çək', onPress: () => pickImage('camera') },
        { text: 'Qalereya seç', onPress: () => pickImage('gallery') },
      ]
    );
  };

  const pickImage = async (source: 'camera' | 'gallery') => {
    try {
      let result;
      
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('İcazə', 'Kamera istifadəsi üçün icazə lazımdır');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7,
        });
      }

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        if (editedProfile) {
          setEditedProfile({
            ...editedProfile,
            profilePicture: imageUri,
          });
        }
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Xəta', 'Şəkil seçilə bilmədi');
    }
  };

  const handleVideoUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'video/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        Alert.alert(
          'Video Yükləndi',
          `Video seçildi: ${result.assets[0].name}`,
          [{ text: 'Tamam' }]
        );
        // Here you would normally upload the video to server
      }
    } catch (error) {
      console.error('Video upload error:', error);
      Alert.alert('Xəta', 'Video yüklənə bilmədi');
    }
  };

  const saveProfile = async () => {
    if (!editedProfile || !token) return;

    try {
      setIsSaving(true);
      
      // Save locally for demo
      setProfile(editedProfile);
      setIsEditing(false);
      Alert.alert('Uğur', 'Profil məlumatları yeniləndi');
    } catch (error) {
      console.error('Save profile error:', error);
      Alert.alert('Xəta', 'Profil yadda saxlanılmadı');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Çıxış',
      'Hesabınızdan çıxış etmək istədiyinizə əminsiniz?',
      [
        { text: 'Ləğv et', style: 'cancel' },
        { text: 'Çıxış et', style: 'destructive', onPress: logout },
      ]
    );
  };

  const generateAPK = () => {
    Alert.alert(
      'APK Yaradılması',
      'APK faylı yaradılır və email vasitəsilə göndəriləcək. Bu prosess bir neçə dəqiqə çəkə bilər.',
      [
        { text: 'Ləğv et', style: 'cancel' },
        { text: 'Başlat', onPress: startAPKBuild },
      ]
    );
  };

  const startAPKBuild = () => {
    Alert.alert(
      'APK Yaradılır',
      'APK faylı yaradılır... Bu prosess təxminən 5-10 dəqiqə çəkəcək. Hazır olduqda sizə bildirim göndəriləcək.',
      [{ text: 'Anladım' }]
    );
    // Here you would trigger the actual APK build process
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Profil yüklənir...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={60} color="#ff4757" />
          <Text style={styles.errorText}>Profil yüklənə bilmədi</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadProfile}>
            <Text style={styles.retryText}>Yenidən cəhd et</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.profileImageContainer}>
              <TouchableOpacity onPress={isEditing ? handleImagePicker : undefined}>
                {(profile.profilePicture || editedProfile?.profilePicture) ? (
                  <Image 
                    source={{ uri: editedProfile?.profilePicture || profile.profilePicture }} 
                    style={styles.profileImage}
                  />
                ) : (
                  <View style={styles.profileImagePlaceholder}>
                    <Ionicons name="person" size={60} color="white" />
                  </View>
                )}
                {isEditing && (
                  <View style={styles.editImageOverlay}>
                    <Ionicons name="camera" size={20} color="white" />
                  </View>
                )}
              </TouchableOpacity>
            </View>
            
            <Text style={styles.profileName}>{profile.fullName}</Text>
            <Text style={styles.profileUsername}>@{profile.username}</Text>
          </View>
        </LinearGradient>

        {/* Profile Form */}
        <View style={styles.formContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Profil Məlumatları</Text>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => {
                if (isEditing) {
                  saveProfile();
                } else {
                  setIsEditing(true);
                  setEditedProfile(profile);
                }
              }}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#667eea" />
              ) : (
                <>
                  <Ionicons 
                    name={isEditing ? "checkmark" : "pencil"} 
                    size={16} 
                    color="#667eea" 
                  />
                  <Text style={styles.editButtonText}>
                    {isEditing ? 'Yadda saxla' : 'Düzəliş et'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>Ad Soyad</Text>
            <TextInput
              style={[styles.fieldInput, !isEditing && styles.fieldInputDisabled]}
              value={editedProfile?.fullName || ''}
              onChangeText={(text) => setEditedProfile(prev => prev ? {...prev, fullName: text} : null)}
              editable={isEditing}
              placeholder="Adınızı və soyadınızı daxil edin"
            />
          </View>

          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput
              style={[styles.fieldInput, !isEditing && styles.fieldInputDisabled]}
              value={editedProfile?.email || ''}
              onChangeText={(text) => setEditedProfile(prev => prev ? {...prev, email: text} : null)}
              editable={isEditing}
              placeholder="Email ünvanınızı daxil edin"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>Telefon</Text>
            <TextInput
              style={[styles.fieldInput, !isEditing && styles.fieldInputDisabled]}
              value={editedProfile?.phone || ''}
              onChangeText={(text) => setEditedProfile(prev => prev ? {...prev, phone: text} : null)}
              editable={isEditing}
              placeholder="Telefon nömrənizi daxil edin"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>Doğum tarixi</Text>
            <TextInput
              style={[styles.fieldInput, !isEditing && styles.fieldInputDisabled]}
              value={editedProfile?.birthday || ''}
              onChangeText={(text) => setEditedProfile(prev => prev ? {...prev, birthday: text} : null)}
              editable={isEditing}
              placeholder="GG.AA.YYYY"
            />
          </View>

          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>Haqqımda</Text>
            <TextInput
              style={[styles.fieldTextArea, !isEditing && styles.fieldInputDisabled]}
              value={editedProfile?.bio || ''}
              onChangeText={(text) => setEditedProfile(prev => prev ? {...prev, bio: text} : null)}
              editable={isEditing}
              placeholder="Özünüz haqqında qısa məlumat"
              multiline
              numberOfLines={3}
            />
          </View>

          {isEditing && (
            <TouchableOpacity style={styles.cancelButton} onPress={() => {
              setIsEditing(false);
              setEditedProfile(profile);
            }}>
              <Text style={styles.cancelButtonText}>Ləğv et</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={handleVideoUpload}>
            <Ionicons name="videocam" size={24} color="#667eea" />
            <Text style={styles.actionButtonText}>Video Yüklə</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={generateAPK}>
            <Ionicons name="download" size={24} color="#667eea" />
            <Text style={styles.actionButtonText}>APK Yarat</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#ff4757" />
            <Text style={styles.logoutButtonText}>Çıxış et</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    paddingTop: 40,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerContent: {
    alignItems: 'center',
  },
  profileImageContainer: {
    marginBottom: 16,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: 'white',
  },
  profileImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'white',
  },
  editImageOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#667eea',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  profileName: {
    fontSize: 24,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  profileUsername: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  formContainer: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f2ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editButtonText: {
    color: '#667eea',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  formField: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: 'white',
  },
  fieldInputDisabled: {
    backgroundColor: '#f8f9fa',
    color: '#666',
  },
  fieldTextArea: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: 'white',
    height: 80,
    textAlignVertical: 'top',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  actionsContainer: {
    margin: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginLeft: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffebee',
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ff4757',
    marginLeft: 12,
  },
});

export default ProfileScreen;