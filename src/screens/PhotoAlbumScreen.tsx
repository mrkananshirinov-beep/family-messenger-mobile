import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
  Modal,
} from 'react-native';

interface Photo {
  id: string;
  userId: string;
  username: string;
  name: string;
  url: string;
  caption: string;
  timestamp: string;
  size: number;
  type: string;
}

interface PhotoAlbumScreenProps {
  currentUser: {
    id: string;
    username: string;
    name: string;
  };
  onBack: () => void;
}

const PhotoAlbumScreen: React.FC<PhotoAlbumScreenProps> = ({ currentUser, onBack }) => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    loadPhotos();
  }, []);

  const loadPhotos = () => {
    try {
      if (Platform.OS === 'web') {
        const storedPhotos = localStorage.getItem('family_photo_album');
        if (storedPhotos) {
          const parsedPhotos = JSON.parse(storedPhotos);
          setPhotos(parsedPhotos.sort((a: Photo, b: Photo) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          ));
          console.log('📸 Loaded photos:', parsedPhotos.length);
        } else {
          // Add welcome photo if no photos exist
          addWelcomePhoto();
        }
      }
    } catch (error) {
      console.error('❌ Error loading photos:', error);
    }
  };

  const addWelcomePhoto = () => {
    const welcomePhoto: Photo = {
      id: 'welcome_photo',
      userId: 'system',
      username: 'system',
      name: 'Family Messenger',
      url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjNjY3ZWVhIi8+CiAgPHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSI0MCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7wn5OIPC90ZXh0Pgo8L3N2Zz4K',
      caption: '📸 Ailə Foto Albumuna xoş gəlmisiniz! Burada ümumi fotoları paylaşa bilərsiniz.',
      timestamp: new Date().toISOString(),
      size: 0,
      type: 'image/svg+xml',
    };

    if (Platform.OS === 'web') {
      localStorage.setItem('family_photo_album', JSON.stringify([welcomePhoto]));
    }
    setPhotos([welcomePhoto]);
  };

  const selectPhoto = () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.multiple = true;
      
      input.onchange = (event: any) => {
        const files = event.target.files;
        if (files && files.length > 0) {
          uploadPhotos(files);
        }
      };
      
      input.click();
    }
  };

  const uploadPhotos = async (files: FileList) => {
    setIsUploading(true);
    const newPhotos: Photo[] = [];

    try {
      for (let i = 0; i < Math.min(files.length, 5); i++) { // Limit to 5 photos at once
        const file = files[i];
        
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
          console.warn('📸 File too large:', file.name);
          continue;
        }

        const reader = new FileReader();
        
        await new Promise((resolve) => {
          reader.onload = (e) => {
            const photo: Photo = {
              id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              userId: currentUser.id,
              username: currentUser.username,
              name: currentUser.name,
              url: e.target?.result as string,
              caption: `📸 ${currentUser.name} tərəfindən paylaşıldı`,
              timestamp: new Date().toISOString(),
              size: file.size,
              type: file.type,
            };
            
            newPhotos.push(photo);
            resolve(void 0);
          };
          
          reader.readAsDataURL(file);
        });
      }

      // Save to localStorage
      const updatedPhotos = [...newPhotos, ...photos];
      setPhotos(updatedPhotos);
      
      if (Platform.OS === 'web') {
        localStorage.setItem('family_photo_album', JSON.stringify(updatedPhotos));
        console.log('📸 Photos uploaded:', newPhotos.length);
      }

      // Add notification to family chat
      if (newPhotos.length > 0) {
        addPhotoNotificationToChat(newPhotos.length);
      }

    } catch (error) {
      console.error('❌ Error uploading photos:', error);
      if (Platform.OS === 'web') {
        window.alert('❌ Foto yükləmə xətası: ' + error);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const addPhotoNotificationToChat = (photoCount: number) => {
    try {
      const notificationMessage = {
        id: `photo_notification_${Date.now()}`,
        userId: 'photo_system',
        username: 'photos',
        name: '📸 Foto Album',
        text: `📸 ${currentUser.name} foto albumuna ${photoCount} yeni foto əlavə etdi!\n\n"Ailə Foto Albumu" bölməsinə baxın.`,
        timestamp: new Date().toISOString(),
        type: 'text',
      };

      if (Platform.OS === 'web') {
        const familyMessages = JSON.parse(localStorage.getItem('family_chat_messages') || '[]');
        familyMessages.push(notificationMessage);
        localStorage.setItem('family_chat_messages', JSON.stringify(familyMessages));
        console.log('📸 Photo notification sent to family chat');
      }
    } catch (error) {
      console.error('❌ Error sending photo notification:', error);
    }
  };

  const openPhotoModal = (photo: Photo) => {
    setSelectedPhoto(photo);
    setModalVisible(true);
  };

  const closePhotoModal = () => {
    setSelectedPhoto(null);
    setModalVisible(false);
  };

  const deletePhoto = (photoId: string) => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Bu fotonu silmək istədiyinizə əminsiniz?');
      if (confirmed) {
        const updatedPhotos = photos.filter(photo => photo.id !== photoId);
        setPhotos(updatedPhotos);
        localStorage.setItem('family_photo_album', JSON.stringify(updatedPhotos));
        closePhotoModal();
        console.log('🗑️ Photo deleted:', photoId);
      }
    }
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('az-AZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Geri</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>📸 Ailə Foto Albumu</Text>
          <Text style={styles.headerSubtitle}>
            {photos.length > 1 ? `${photos.length - 1} foto` : 'Yeni album'}
          </Text>
        </View>
        <TouchableOpacity style={styles.uploadButton} onPress={selectPhoto}>
          <Text style={styles.uploadButtonText}>
            {isUploading ? '⏳' : '📷+'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Photo Grid */}
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.photoGrid}>
        {photos.map((photo) => (
          <TouchableOpacity
            key={photo.id}
            style={styles.photoContainer}
            onPress={() => openPhotoModal(photo)}
          >
            <Image source={{ uri: photo.url }} style={styles.photoThumbnail} />
            <View style={styles.photoOverlay}>
              <Text style={styles.photoUser}>{photo.name}</Text>
              <Text style={styles.photoDate}>{formatDate(photo.timestamp)}</Text>
            </View>
          </TouchableOpacity>
        ))}
        
        {photos.length <= 1 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>📸 Hələ foto yoxdur</Text>
            <Text style={styles.emptyDescription}>
              İlk fotonu yükləmək üçün yuxarıdakı 📷+ düyməsini basın
            </Text>
            <TouchableOpacity style={styles.emptyButton} onPress={selectPhoto}>
              <Text style={styles.emptyButtonText}>📷 Foto Əlavə Et</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Photo Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closePhotoModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {selectedPhoto && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>📸 {selectedPhoto.name}</Text>
                  <TouchableOpacity style={styles.modalCloseButton} onPress={closePhotoModal}>
                    <Text style={styles.modalCloseText}>✕</Text>
                  </TouchableOpacity>
                </View>
                
                <Image source={{ uri: selectedPhoto.url }} style={styles.modalPhoto} />
                
                <View style={styles.modalInfo}>
                  <Text style={styles.modalCaption}>{selectedPhoto.caption}</Text>
                  <Text style={styles.modalDate}>{formatDate(selectedPhoto.timestamp)}</Text>
                  <Text style={styles.modalSize}>
                    📁 Ölçü: {formatFileSize(selectedPhoto.size)}
                  </Text>
                </View>

                {selectedPhoto.userId === currentUser.id && selectedPhoto.id !== 'welcome_photo' && (
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => deletePhoto(selectedPhoto.id)}
                  >
                    <Text style={styles.deleteButtonText}>🗑️ Sil</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>
          👤 {currentUser.name} | 📸 {photos.length > 0 ? photos.length - 1 : 0} foto | 📱 Cross-platform album
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#4a90e2',
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
  uploadButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadButtonText: {
    fontSize: 18,
  },
  scrollContainer: {
    flex: 1,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    justifyContent: 'space-between',
  },
  photoContainer: {
    width: '48%',
    marginBottom: 10,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  photoThumbnail: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  photoOverlay: {
    padding: 8,
    backgroundColor: 'white',
  },
  photoUser: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  photoDate: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  emptyState: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 10,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  emptyButton: {
    backgroundColor: '#4a90e2',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  emptyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '90%',
    backgroundColor: 'white',
    borderRadius: 15,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#4a90e2',
  },
  modalTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalCloseButton: {
    padding: 5,
  },
  modalCloseText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalPhoto: {
    width: '100%',
    height: 300,
    resizeMode: 'contain',
  },
  modalInfo: {
    padding: 15,
  },
  modalCaption: {
    fontSize: 14,
    color: '#333',
    marginBottom: 10,
  },
  modalDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  modalSize: {
    fontSize: 12,
    color: '#666',
  },
  deleteButton: {
    backgroundColor: '#ff4757',
    margin: 15,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  statsContainer: {
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
    padding: 8,
  },
  statsText: {
    textAlign: 'center',
    fontSize: 10,
    color: '#4a90e2',
  },
});

export default PhotoAlbumScreen;
