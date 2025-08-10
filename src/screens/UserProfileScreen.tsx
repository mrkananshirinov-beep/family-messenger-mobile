import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Image,
} from 'react-native';

interface User {
  id: string;
  username: string;
  name: string;
  birthday?: string;
  bio?: string;
  location?: string;
  profileImage?: string;
  profileVideo?: string;
  joinDate?: string;
  phone?: string;
  email?: string;
  favoriteColor?: string;
  hobbies?: string[];
}

interface UserProfileScreenProps {
  currentUser: User;
  onBack: () => void;
  onUpdateUser: (updatedUser: User) => void;
}

const UserProfileScreen: React.FC<UserProfileScreenProps> = ({
  currentUser,
  onBack,
  onUpdateUser,
}) => {
  const [editMode, setEditMode] = useState(false);
  const [profile, setProfile] = useState<User>({ ...currentUser });
  const [newHobby, setNewHobby] = useState('');

  useEffect(() => {
    loadUserProfile();
    checkBirthdays();
  }, []);

  const loadUserProfile = () => {
    try {
      const savedProfile = localStorage.getItem(`user_profile_${currentUser.id}`);
      if (savedProfile) {
        const parsedProfile = JSON.parse(savedProfile);
        setProfile({ ...currentUser, ...parsedProfile });
      } else {
        // Set default values
        const defaultProfile = {
          ...currentUser,
          joinDate: new Date().toISOString(),
          hobbies: [],
        };
        setProfile(defaultProfile);
        saveUserProfile(defaultProfile);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const saveUserProfile = (profileData: User) => {
    try {
      localStorage.setItem(`user_profile_${currentUser.id}`, JSON.stringify(profileData));
      
      // Update global user list
      const allUsers = JSON.parse(localStorage.getItem('allUsers') || '[]');
      const userIndex = allUsers.findIndex((u: User) => u.id === currentUser.id);
      if (userIndex !== -1) {
        allUsers[userIndex] = { ...allUsers[userIndex], ...profileData };
        localStorage.setItem('allUsers', JSON.stringify(allUsers));
      }
      
      onUpdateUser(profileData);
    } catch (error) {
      console.error('Error saving user profile:', error);
    }
  };

  const checkBirthdays = () => {
    try {
      const allUsers = JSON.parse(localStorage.getItem('allUsers') || '[]');
      const today = new Date();
      const todayString = `${today.getMonth() + 1}-${today.getDate()}`;
      
      allUsers.forEach((user: User) => {
        if (user.birthday && user.id !== currentUser.id) {
          const userBirthday = new Date(user.birthday);
          const birthdayString = `${userBirthday.getMonth() + 1}-${userBirthday.getDate()}`;
          
          if (birthdayString === todayString) {
            showBirthdayNotification(user);
          }
        }
      });
    } catch (error) {
      console.error('Error checking birthdays:', error);
    }
  };

  const showBirthdayNotification = (user: User) => {
    // Add birthday notification to family chat
    const birthdayMessage = {
      id: Date.now().toString(),
      senderId: 'system',
      senderName: 'Family Messenger',
      content: `🎉🎂 Bu gün ${user.name}-ın doğum günüdür! Ad günün mübarək! 🎈🎁`,
      timestamp: new Date().toISOString(),
      type: 'birthday',
    };

    try {
      const familyMessages = JSON.parse(localStorage.getItem('familyMessages') || '[]');
      familyMessages.push(birthdayMessage);
      localStorage.setItem('familyMessages', JSON.stringify(familyMessages));
      
      // Show browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`🎂 ${user.name}-ın doğum günü!`, {
          body: 'Ailə çatında təbrik edin!',
          icon: '/icon.png'
        });
      }
    } catch (error) {
      console.error('Error sending birthday notification:', error);
    }
  };

  const handleSave = () => {
    if (!profile.name.trim()) {
      Alert.alert('Xəta', 'Ad sahəsi boş ola bilməz');
      return;
    }

    saveUserProfile(profile);
    setEditMode(false);
    Alert.alert('Uğurlu', 'Profil yeniləndi! 🎉');
  };

  const handleImageUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = (event: any) => {
      const file = event.target.files[0];
      if (file) {
        if (file.size > 5 * 1024 * 1024) {
          Alert.alert('Xəta', 'Şəkil 5MB-dan böyük ola bilməz');
          return;
        }

        const reader = new FileReader();
        reader.onload = () => {
          setProfile({ ...profile, profileImage: reader.result as string });
        };
        reader.readAsDataURL(file);
      }
    };
    
    input.click();
  };

  const handleVideoUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    
    input.onchange = (event: any) => {
      const file = event.target.files[0];
      if (file) {
        if (file.size > 20 * 1024 * 1024) {
          Alert.alert('Xəta', 'Video 20MB-dan böyük ola bilməz');
          return;
        }

        const reader = new FileReader();
        reader.onload = () => {
          setProfile({ ...profile, profileVideo: reader.result as string });
        };
        reader.readAsDataURL(file);
      }
    };
    
    input.click();
  };

  const addHobby = () => {
    if (newHobby.trim() && profile.hobbies) {
      if (profile.hobbies.length >= 10) {
        Alert.alert('Məhdudiyyət', 'Maksimum 10 hobbi əlavə edə bilərsiniz');
        return;
      }
      
      setProfile({
        ...profile,
        hobbies: [...profile.hobbies, newHobby.trim()]
      });
      setNewHobby('');
    }
  };

  const removeHobby = (index: number) => {
    if (profile.hobbies) {
      const updatedHobbies = profile.hobbies.filter((_, i) => i !== index);
      setProfile({ ...profile, hobbies: updatedHobbies });
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('az-AZ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const calculateAge = (birthday?: string) => {
    if (!birthday) return '';
    const today = new Date();
    const birthDate = new Date(birthday);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age > 0 ? `${age} yaş` : '';
  };

  const getUpcomingBirthday = () => {
    if (!profile.birthday) return '';
    
    const today = new Date();
    const birthday = new Date(profile.birthday);
    const thisYear = today.getFullYear();
    
    // Set birthday to this year
    birthday.setFullYear(thisYear);
    
    // If birthday already passed this year, set to next year
    if (birthday < today) {
      birthday.setFullYear(thisYear + 1);
    }
    
    const diffTime = birthday.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return '🎉 Bu gün doğum günüdür!';
    if (diffDays === 1) return '🎂 Sabah doğum günüdür!';
    if (diffDays <= 7) return `🎈 ${diffDays} gün sonra doğum günü`;
    if (diffDays <= 30) return `📅 ${diffDays} gün sonra doğum günü`;
    
    return '';
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Geri</Text>
        </TouchableOpacity>
        <Text style={styles.title}>👤 Profil</Text>
        <TouchableOpacity 
          style={styles.editButton} 
          onPress={() => editMode ? handleSave() : setEditMode(true)}
        >
          <Text style={styles.editButtonText}>
            {editMode ? '💾 Saxla' : '✏️ Redaktə'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Picture */}
        <View style={styles.profileImageSection}>
          <TouchableOpacity 
            style={styles.profileImageContainer}
            onPress={editMode ? handleImageUpload : undefined}
          >
            {profile.profileImage ? (
              <img 
                src={profile.profileImage} 
                style={styles.profileImage}
                alt="Profile"
              />
            ) : (
              <View style={styles.defaultAvatar}>
                <Text style={styles.defaultAvatarText}>
                  {profile.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            {editMode && (
              <View style={styles.imageOverlay}>
                <Text style={styles.imageOverlayText}>📷</Text>
              </View>
            )}
          </TouchableOpacity>
          
          {editMode && (
            <TouchableOpacity style={styles.videoButton} onPress={handleVideoUpload}>
              <Text style={styles.videoButtonText}>📹 Video Əlavə Et</Text>
            </TouchableOpacity>
          )}
          
          {profile.profileVideo && (
            <View style={styles.videoContainer}>
              <video 
                src={profile.profileVideo}
                style={styles.profileVideo}
                controls
                preload="metadata"
              />
            </View>
          )}
        </View>

        {/* Basic Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ℹ️ Əsas Məlumatlar</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>👤 Ad:</Text>
            {editMode ? (
              <TextInput
                style={styles.input}
                value={profile.name}
                onChangeText={(text) => setProfile({ ...profile, name: text })}
                placeholder="Adınızı daxil edin"
                maxLength={50}
              />
            ) : (
              <Text style={styles.value}>{profile.name}</Text>
            )}
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>@️ Username:</Text>
            <Text style={styles.value}>@{profile.username}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>🎂 Doğum günü:</Text>
            {editMode ? (
              <input
                type="date"
                style={styles.dateInput}
                value={profile.birthday ? profile.birthday.split('T')[0] : ''}
                onChange={(e) => setProfile({ ...profile, birthday: e.target.value })}
              />
            ) : (
              <View style={styles.birthdayInfo}>
                <Text style={styles.value}>
                  {profile.birthday ? formatDate(profile.birthday) : 'Təyin edilməyib'}
                </Text>
                {profile.birthday && (
                  <Text style={styles.ageText}>{calculateAge(profile.birthday)}</Text>
                )}
              </View>
            )}
          </View>

          {profile.birthday && !editMode && getUpcomingBirthday() && (
            <View style={styles.birthdayAlert}>
              <Text style={styles.birthdayAlertText}>{getUpcomingBirthday()}</Text>
            </View>
          )}
        </View>

        {/* Contact Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📞 Əlaqə Məlumatları</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>📱 Telefon:</Text>
            {editMode ? (
              <TextInput
                style={styles.input}
                value={profile.phone || ''}
                onChangeText={(text) => setProfile({ ...profile, phone: text })}
                placeholder="+994XX XXX XX XX"
                keyboardType="phone-pad"
                maxLength={20}
              />
            ) : (
              <Text style={styles.value}>{profile.phone || 'Təyin edilməyib'}</Text>
            )}
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>📧 Email:</Text>
            {editMode ? (
              <TextInput
                style={styles.input}
                value={profile.email || ''}
                onChangeText={(text) => setProfile({ ...profile, email: text })}
                placeholder="email@example.com"
                keyboardType="email-address"
                maxLength={100}
              />
            ) : (
              <Text style={styles.value}>{profile.email || 'Təyin edilməyib'}</Text>
            )}
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>📍 Məkan:</Text>
            {editMode ? (
              <TextInput
                style={styles.input}
                value={profile.location || ''}
                onChangeText={(text) => setProfile({ ...profile, location: text })}
                placeholder="Bakı, Azərbaycan"
                maxLength={100}
              />
            ) : (
              <Text style={styles.value}>{profile.location || 'Təyin edilməyib'}</Text>
            )}
          </View>
        </View>

        {/* Personal Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎨 Şəxsi Məlumatlar</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>📝 Bio:</Text>
            {editMode ? (
              <TextInput
                style={[styles.input, styles.textArea]}
                value={profile.bio || ''}
                onChangeText={(text) => setProfile({ ...profile, bio: text })}
                placeholder="Özünüz haqqında qısa məlumat..."
                multiline
                numberOfLines={3}
                maxLength={200}
              />
            ) : (
              <Text style={styles.value}>{profile.bio || 'Təyin edilməyib'}</Text>
            )}
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>🎨 Sevimli rəng:</Text>
            {editMode ? (
              <View style={styles.colorPickerContainer}>
                <input
                  type="color"
                  style={styles.colorPicker}
                  value={profile.favoriteColor || '#667eea'}
                  onChange={(e) => setProfile({ ...profile, favoriteColor: e.target.value })}
                />
                <Text style={styles.colorValue}>{profile.favoriteColor || '#667eea'}</Text>
              </View>
            ) : (
              <View style={styles.colorDisplay}>
                <View 
                  style={[styles.colorSwatch, { backgroundColor: profile.favoriteColor || '#667eea' }]}
                />
                <Text style={styles.value}>{profile.favoriteColor || '#667eea'}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Hobbies */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Hobbilər</Text>
          
          {editMode && (
            <View style={styles.hobbyInputContainer}>
              <TextInput
                style={styles.hobbyInput}
                value={newHobby}
                onChangeText={setNewHobby}
                placeholder="Yeni hobbi əlavə et..."
                maxLength={30}
              />
              <TouchableOpacity style={styles.addButton} onPress={addHobby}>
                <Text style={styles.addButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          )}
          
          <View style={styles.hobbiesContainer}>
            {profile.hobbies && profile.hobbies.length > 0 ? (
              profile.hobbies.map((hobby, index) => (
                <View key={index} style={styles.hobbyTag}>
                  <Text style={styles.hobbyText}>{hobby}</Text>
                  {editMode && (
                    <TouchableOpacity 
                      style={styles.removeButton}
                      onPress={() => removeHobby(index)}
                    >
                      <Text style={styles.removeButtonText}>×</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            ) : (
              <Text style={styles.noHobbies}>Hələ hobbi əlavə edilməyib</Text>
            )}
          </View>
        </View>

        {/* Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Statistika</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {profile.joinDate ? Math.floor((Date.now() - new Date(profile.joinDate).getTime()) / (1000 * 60 * 60 * 24)) : 0}
              </Text>
              <Text style={styles.statLabel}>Gün</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {JSON.parse(localStorage.getItem('familyMessages') || '[]').filter((m: any) => m.senderId === profile.id).length}
              </Text>
              <Text style={styles.statLabel}>Mesaj</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {JSON.parse(localStorage.getItem('familyPhotos') || '[]').filter((p: any) => p.uploadedBy === profile.id).length}
              </Text>
              <Text style={styles.statLabel}>Foto</Text>
            </View>
          </View>
        </View>

        <View style={styles.bottomPadding} />
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
    backgroundColor: '#667eea',
    padding: 20,
    paddingTop: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  editButton: {
    backgroundColor: '#48c78e',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  editButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  profileImageSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    objectFit: 'cover',
    border: '3px solid #667eea',
  } as any,
  defaultAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#667eea',
  },
  defaultAvatarText: {
    color: 'white',
    fontSize: 48,
    fontWeight: 'bold',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageOverlayText: {
    fontSize: 24,
  },
  videoButton: {
    backgroundColor: '#667eea',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginBottom: 15,
  },
  videoButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  videoContainer: {
    width: '100%',
    maxWidth: 300,
    borderRadius: 10,
    overflow: 'hidden',
  },
  profileVideo: {
    width: '100%',
    height: 200,
    objectFit: 'cover',
  } as any,
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    minHeight: 40,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    width: 120,
  },
  value: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  input: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  dateInput: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    border: '1px solid #ddd',
  } as any,
  birthdayInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ageText: {
    fontSize: 12,
    color: '#667eea',
    fontWeight: 'bold',
  },
  birthdayAlert: {
    backgroundColor: '#ffe4e1',
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#ff6b6b',
  },
  birthdayAlertText: {
    fontSize: 14,
    color: '#d63031',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  colorPickerContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorPicker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    border: 'none',
    marginRight: 10,
  } as any,
  colorValue: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'monospace',
  },
  colorDisplay: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorSwatch: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
    borderWidth: 2,
    borderColor: '#ddd',
  },
  hobbyInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  hobbyInput: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 10,
  },
  addButton: {
    backgroundColor: '#48c78e',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  hobbiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hobbyTag: {
    backgroundColor: '#667eea',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  hobbyText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  removeButton: {
    marginLeft: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  noHobbies: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#667eea',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  bottomPadding: {
    height: 50,
  },
});

export default UserProfileScreen;
