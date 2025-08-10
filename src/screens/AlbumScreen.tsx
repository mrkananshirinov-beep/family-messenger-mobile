import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  SafeAreaView,
  Image,
  Modal,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import GlobalStorageManager from '../utils/GlobalStorage';

interface AlbumPhoto {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  dateTaken: string;
  uploader: {
    id: string;
    fullName: string;
    profilePicture?: string;
  };
  uploader: {
    id: string;
    name: string;
    profilePicture?: string;
  };
  likes: Array<{
    user: {
      id: string;
      fullName: string;
    };
    createdAt: string;
  }>;
  likes: Array<{
    user: {
      id: string;
      name: string;
    };
    createdAt: string;
  }>;
  comments: Array<{
    user: {
      id: string;
      fullName: string;
      profilePicture?: string;
    };
    text: string;
    createdAt: string;
  }>;
  createdAt: string;
}

const AlbumScreen: React.FC = () => {
  const [photos, setPhotos] = useState<AlbumPhoto[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [uploadData, setUploadData] = useState({
    title: '',
    description: '',
    dateTaken: new Date().toISOString().split('T')[0],
  });
  const [isUploading, setIsUploading] = useState(false);
  
  const { user, token } = useAuth();
  const { socket } = useSocket();

  useEffect(() => {
    loadPhotos();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('album_photo_added', handleNewPhoto);

      return () => {
        socket.off('album_photo_added', handleNewPhoto);
      };
    }
  }, [socket]);

  const loadPhotos = async () => {
    try {
      console.log('📸 Loading photos from GlobalStorage...');
      
      // Load shared family photos from GlobalStorage
      const globalStorage = GlobalStorageManager.getInstance();
      const globalPhotos = await globalStorage.getAllPhotos();
      
      // Convert GlobalPhoto to AlbumPhoto format
      const albumPhotos: AlbumPhoto[] = globalPhotos.map(photo => ({
        ...photo,
        uploader: {
          id: photo.uploader.id,
          fullName: photo.uploader.name, // Convert name to fullName
          profilePicture: photo.uploader.profilePicture,
        }
      }));
      
      console.log('📊 Photos loaded from GlobalStorage:', albumPhotos.length);
      setPhotos(albumPhotos);
    } catch (error) {
      console.error('❌ Error loading photos:', error);
      setPhotos([]);
    }
  };

  const handleNewPhoto = (photoData: AlbumPhoto) => {
    setPhotos(prev => [photoData, ...prev]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPhotos();
    setRefreshing(false);
  };

  const pickImage = async () => {
    try {
      // Web-də fərqli yanaşma
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (event: any) => {
          const file = event.target.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (e: ProgressEvent<FileReader>) => {
              if (e.target?.result) {
                setSelectedImage(e.target.result as string);
                setShowUploadModal(true);
              }
            };
            reader.readAsDataURL(file);
          }
        };
        input.click();
        return;
      }

      // Mobile üçün normal flow
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('İcazə', 'Şəkil seçmək üçün icazə lazımdır');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        setShowUploadModal(true);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Xəta', 'Şəkil seçərkən xəta baş verdi');
    }
  };

  const uploadPhoto = async () => {
    if (!selectedImage || !uploadData.title) {
      Alert.alert('Xəta', 'Şəkil və başlıq mütləqdir');
      return;
    }

    setIsUploading(true);
    try {
      console.log('📤 Uploading photo to GlobalStorage...');
      
      // Create a new photo object for GlobalStorage
      const newPhoto = {
        id: `photo_${Date.now()}_${Math.random()}`,
        title: uploadData.title,
        description: uploadData.description || '',
        imageUrl: selectedImage,
        dateTaken: uploadData.dateTaken,
        uploader: {
          id: user?.id || 'unknown',
          name: user?.name || 'İstifadəçi',
          profilePicture: user?.profilePicture || '',
        },
        likes: [], // Simple string array for now
        comments: [],
        createdAt: new Date().toISOString(),
      };

      // Add to GlobalStorage
      const globalStorage = GlobalStorageManager.getInstance();
      await globalStorage.addPhoto(newPhoto);

      console.log('✅ Photo uploaded to GlobalStorage successfully');

      // Reset form and close modal
      setSelectedImage('');
      setUploadData({
        title: '',
        description: '',
        dateTaken: new Date().toISOString().split('T')[0],
      });
      setShowUploadModal(false);

      // Reload photos
      await loadPhotos();

      Alert.alert('Uğur', 'Şəkil ailə albomuna əlavə edildi!');
    } catch (error) {
      console.error('❌ Error uploading photo:', error);
      Alert.alert('Xəta', 'Şəkil yüklənə bilmədi');
    } finally {
      setIsUploading(false);
    }
  };

      // Update local state
      setPhotos(updatedPhotos);
      
      // Notify other users via socket if available
      if (socket) {
        socket.emit('new_photo_upload', newPhoto);
      }

      setShowUploadModal(false);
      setSelectedImage('');
      setUploadData({
        title: '',
        description: '',
        dateTaken: new Date().toISOString().split('T')[0],
      });
      
      Alert.alert('Uğur', 'Şəkil uğurla əlavə edildi (lokal)');
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Xəta', 'Şəkil yüklənə bilmədi');
    } finally {
      setIsUploading(false);
    }
  };  const likePhoto = async (photoId: string) => {
    if (!token) return;

    try {
      const response = await fetch(`http://localhost:5000/api/album/like/${photoId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await loadPhotos();
      }
    } catch (error) {
      console.error('Like error:', error);
    }
  };

  const renderPhoto = ({ item }: { item: AlbumPhoto }) => {
    const isLikedByUser = item.likes.some(like => like.user.id === user?.id);
    
    return (
      <View style={styles.photoCard}>
        <View style={styles.photoHeader}>
          <View style={styles.uploaderInfo}>
            {item.uploader.profilePicture ? (
              <Image source={{ uri: item.uploader.profilePicture }} style={styles.uploaderAvatar} />
            ) : (
              <View style={styles.defaultUploaderAvatar}>
                <Text style={styles.uploaderAvatarText}>
                  {item.uploader.fullName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View>
              <Text style={styles.uploaderName}>{item.uploader.fullName}</Text>
              <Text style={styles.uploadDate}>
                {new Date(item.createdAt).toLocaleDateString('az-AZ')}
              </Text>
            </View>
          </View>
        </View>

        <Image source={{ uri: item.imageUrl }} style={styles.photoImage} />

        <View style={styles.photoContent}>
          <Text style={styles.photoTitle}>{item.title}</Text>
          {item.description && (
            <Text style={styles.photoDescription}>{item.description}</Text>
          )}
          
          <View style={styles.photoActions}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => likePhoto(item.id)}
            >
              <Ionicons 
                name={isLikedByUser ? "heart" : "heart-outline"} 
                size={20} 
                color={isLikedByUser ? "#ef4444" : "#6b7280"} 
              />
              <Text style={styles.actionText}>{item.likes.length}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="chatbubble-outline" size={20} color="#6b7280" />
              <Text style={styles.actionText}>{item.comments.length}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Aile Albumu</Text>
        <TouchableOpacity style={styles.addButton} onPress={pickImage}>
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {photos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="images-outline" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>Hələ heç bir şəkil yoxdur</Text>
          <Text style={styles.emptySubtitle}>
            İlk şəkli əlavə etmək üçün + düyməsinə basın
          </Text>
        </View>
      ) : (
        <FlatList
          data={photos}
          renderItem={renderPhoto}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#667eea']}
            />
          }
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Upload Modal */}
      <Modal
        visible={showUploadModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <ScrollView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowUploadModal(false)}>
                <Text style={styles.modalCancel}>Ləğv et</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Şəkil əlavə et</Text>
              <TouchableOpacity onPress={uploadPhoto} disabled={isUploading}>
                <Text style={[styles.modalSave, isUploading && styles.modalSaveDisabled]}>
                  {isUploading ? 'Yüklənir...' : 'Əlavə et'}
                </Text>
              </TouchableOpacity>
            </View>

            {selectedImage && (
              <Image source={{ uri: selectedImage }} style={styles.previewImage} />
            )}

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Başlıq *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Şəkil başlığı daxil edin"
                value={uploadData.title}
                onChangeText={(text) => setUploadData(prev => ({ ...prev, title: text }))}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Açıqlama</Text>
              <TextInput
                style={[styles.textInput, styles.multilineInput]}
                placeholder="Şəkil haqqında məlumat (opsional)"
                value={uploadData.description}
                onChangeText={(text) => setUploadData(prev => ({ ...prev, description: text }))}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Çəkilmə tarixi</Text>
              <TextInput
                style={styles.textInput}
                placeholder="YYYY-MM-DD"
                value={uploadData.dateTaken}
                onChangeText={(text) => setUploadData(prev => ({ ...prev, dateTaken: text }))}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    paddingVertical: 8,
  },
  photoCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  photoHeader: {
    padding: 16,
    paddingBottom: 12,
  },
  uploaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  uploaderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  defaultUploaderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  uploaderAvatarText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  uploaderName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  uploadDate: {
    fontSize: 12,
    color: '#666',
  },
  photoImage: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
  },
  photoContent: {
    padding: 16,
  },
  photoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  photoDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  photoActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  actionText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#6b7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalContent: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalCancel: {
    fontSize: 16,
    color: '#ef4444',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalSave: {
    fontSize: 16,
    color: '#667eea',
    fontWeight: '600',
  },
  modalSaveDisabled: {
    color: '#ccc',
  },
  previewImage: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
});

export default AlbumScreen;
