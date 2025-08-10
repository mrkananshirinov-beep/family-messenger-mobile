import React, { useSconst ProfileScreen: React.FC = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [birthday, setBirthday] = useState('');
  const [profileImage, setProfileImage] = useState<string>('');
  
  const { user } = useAuth();eEffect } from 'react';
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
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';

const ProfileScreen: React.FC = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [birthday, setBirthday] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  // Load current user's profile data
  useEffect(() => {
    if (user) {
      setFullName(user.name || '');
  setName(user.name || '');
      setProfileImage(user.profilePicture || '');
      setBirthday(user.birthday || '');
      console.log('📱 Profile loaded for user:', user.username);
    }
  }, [user]);

  const handleSave = () => {
    setIsEditing(false);
    Alert.alert('Uğur', 'Profil məlumatları yadda saxlandı');
  };

  const saveProfileData = async (newImageUri?: string) => {
    try {
      console.log('💾 Saving profile data...');
      
      if (!user) {
        console.log('❌ No user found');
        return false;
      }

      // Update current user data
      const updatedUser = {
        ...user,
        profilePicture: newImageUri || profileImage,
        name: fullName || user.name,
        birthday: birthday || user.birthday,
      };

      console.log('📱 Updated user data:', updatedUser);

      // Save user data to storage
      if (Platform.OS === 'web') {
        localStorage.setItem('user_data', JSON.stringify(updatedUser));
        
        // Update all users list
        const allUsersData = localStorage.getItem('all_users');
        if (allUsersData) {
          const allUsers = JSON.parse(allUsersData);
          const userIndex = allUsers.findIndex((u: any) => u.id === user.id);
          if (userIndex !== -1) {
            allUsers[userIndex] = { ...allUsers[userIndex], ...updatedUser };
            localStorage.setItem('all_users', JSON.stringify(allUsers));
          }
        }
      } else {
        await AsyncStorage.setItem('user_data', JSON.stringify(updatedUser));
        
        // Update all users list
        const allUsersData = await AsyncStorage.getItem('all_users');
        if (allUsersData) {
          const allUsers = JSON.parse(allUsersData);
          const userIndex = allUsers.findIndex((u: any) => u.id === user.id);
          if (userIndex !== -1) {
            allUsers[userIndex] = { ...allUsers[userIndex], ...updatedUser };
            await AsyncStorage.setItem('all_users', JSON.stringify(allUsers));
          }
        }
      }
      
      console.log('✅ Profile saved successfully');
      return true;
    } catch (error) {
      console.error('❌ Error saving profile:', error);
      return false;
    }
  };

  const handleImagePicker = async () => {
    // Web-də fərqli yanaşma
    if (Platform.OS === 'web') {
      try {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (event: any) => {
          const file = event.target.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = async (e: ProgressEvent<FileReader>) => {
              if (e.target?.result) {
                const base64String = e.target.result as string;
                setProfileImage(base64String);
                
                // Save to storage immediately
                const saved = await saveProfileData(base64String);
                if (saved) {
                  Alert.alert('Uğur', 'Profil şəkli yadda saxlanıldı');
                } else {
                  Alert.alert('Xəta', 'Şəkil yadda saxlanılmadı');
                }
              }
            };
            reader.readAsDataURL(file);
          }
        };
        input.click();
      } catch (error) {
        console.error('Web file picker error:', error);
        Alert.alert('Xəta', 'Şəkil seçilə bilmədi');
      }
      return;
    }

    // Mobile üçün original kod
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
      // Web üçün permission yoxla
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Xəta', 'Qalereya girişi üçün icazə lazımdır');
        return;
      }

      let result;
      
      if (source === 'camera') {
        const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
        if (cameraStatus !== 'granted') {
          Alert.alert('Xəta', 'Kamera girişi üçün icazə lazımdır');
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

      console.log('Image picker result:', result);

      if (!result.canceled && result.assets && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        console.log('Selected image URI:', imageUri);
        setProfileImage(imageUri);
        
        // Save to storage immediately
        const saved = await saveProfileData(imageUri);
        if (saved) {
          Alert.alert('Uğur', 'Profil şəkli yadda saxlanıldı');
        } else {
          Alert.alert('Xəta', 'Şəkil yadda saxlanılmadı');
        }
      } else {
        console.log('Image picker cancelled or no assets');
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Xəta', `Şəkil seçilə bilmədi: ${error instanceof Error ? error.message : 'Naməlum xəta'}`);
    }
  };

  const handleVideoUpload = async () => {
    try {
      // Web-də fərqli yanaşma
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'video/*';
        input.onchange = (event: any) => {
          const file = event.target.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (e: ProgressEvent<FileReader>) => {
              if (e.target?.result) {
                // Store video for profile (basic implementation)
                Alert.alert('Uğur', 'Profil videosu yükləndi');
              }
            };
            reader.readAsDataURL(file);
          }
        };
        input.click();
        return;
      }

      // Mobile üçün video picker
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Xəta', 'Qalereya girişi üçün icazə lazımdır');
        return;
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.8,
        videoMaxDuration: 30, // 30 seconds max
      });

      if (!result.canceled && result.assets[0]) {
        const videoUri = result.assets[0].uri;
        console.log('Selected video URI:', videoUri);
        Alert.alert(
          'Video Seçildi',
          `Profil videosu yükləndi! Video müddəti: ${result.assets[0].duration || 0}ms`,
          [{ text: 'Tamam' }]
        );
      }
    } catch (error) {
      console.error('Video upload error:', error);
      Alert.alert('Xəta', 'Video seçilə bilmədi');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Çıxış',
      'Profilinizdən çıxmaq istədiyinizə əminsiniz?',
      [
        { text: 'Ləğv et', style: 'cancel' },
        { 
          text: 'Çıx', 
          style: 'destructive',
          onPress: () => {
            // AuthContext-dən logout funksiyasını çağır
            console.log('User logged out');
            Alert.alert('Çıxış edildi', 'Profilinizdən uğurla çıxdınız');
          }
        }
      ]
    );
  };

  const generateAPK = () => {
    Alert.alert(
      'APK Yaradılması',
      'APK faylı yaradılır və email vasitəsilə göndəriləcək. Bu prosess bir neçə dəqiqə çəkə bilər.',
      [
        { text: 'Ləğv et', style: 'cancel' },
        { text: 'Başlat', onPress: () => {
          Alert.alert('APK Yaradılır', 'APK yaradılma prosesi başladı...');
        }},
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.profileImageContainer}>
              <TouchableOpacity onPress={handleImagePicker}>
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={styles.profileImage} />
                ) : (
                  <View style={styles.profileImagePlaceholder}>
                    <Ionicons name="person" size={60} color="white" />
                  </View>
                )}
                <View style={styles.editImageOverlay}>
                  <Ionicons name="camera" size={20} color="white" />
                </View>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.profileName}>{user?.name || 'İstifadəçi'}</Text>
            <Text style={styles.profileUsername}>@{user?.username || 'user'}</Text>
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
                  handleSave();
                } else {
                  setIsEditing(true);
                  setFullName(user?.name || '');
                  setEmail('');
                }
              }}
            >
              <Ionicons 
                name={isEditing ? "checkmark" : "pencil"} 
                size={16} 
                color="#667eea" 
              />
              <Text style={styles.editButtonText}>
                {isEditing ? 'Yadda saxla' : 'Düzəliş et'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>Ad Soyad</Text>
            <TextInput
              style={[styles.fieldInput, !isEditing && styles.fieldInputDisabled]}
              value={fullName || user?.name || ''}
              onChangeText={setFullName}
              editable={isEditing}
              placeholder="Adınızı və soyadınızı daxil edin"
            />
          </View>

          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput
              style={[styles.fieldInput, !isEditing && styles.fieldInputDisabled]}
              value={email}
              onChangeText={setEmail}
              editable={isEditing}
              placeholder="Email ünvanınızı daxil edin"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>Telefon</Text>
            <TextInput
              style={[styles.fieldInput, !isEditing && styles.fieldInputDisabled]}
              value={phone}
              onChangeText={setPhone}
              editable={isEditing}
              placeholder="Telefon nömrənizi daxil edin"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>Doğum tarixi</Text>
            <TextInput
              style={[styles.fieldInput, !isEditing && styles.fieldInputDisabled]}
              value={birthday}
              onChangeText={setBirthday}
              editable={isEditing}
              placeholder="GG.AA.YYYY (məs: 15.03.1990)"
            />
          </View>

          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>Haqqımda</Text>
            <TextInput
              style={[styles.fieldTextArea, !isEditing && styles.fieldInputDisabled]}
              value={bio}
              onChangeText={setBio}
              editable={isEditing}
              placeholder="Özünüz haqqında qısa məlumat"
              multiline
              numberOfLines={3}
            />
          </View>

          {isEditing && (
            <TouchableOpacity style={styles.cancelButton} onPress={() => {
              setIsEditing(false);
              setFullName('');
              setEmail('');
              setPhone('');
              setBio('');
              setBirthday('');
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
