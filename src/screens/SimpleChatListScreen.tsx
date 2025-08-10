import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import FamilyChatScreen from './FamilyChatScreen';
import SOSScreen from './SOSScreen';
import PhotoAlbumScreen from './PhotoAlbumScreen';
import AppStatusScreen from './AppStatusScreen';
import PrivateChatListScreen from './PrivateChatListScreen';
import PrivateChatScreen from './PrivateChatScreen';
import VideoCallScreen from './VideoCallScreen';
import UserProfileScreen from './UserProfileScreen';

interface SimpleChatListScreenProps {
  user: {
    id: string;
    username: string;
    name: string;
  };
  onLogout: () => void;
}

interface CallState {
  isActive: boolean;
  otherUser?: any;
  callType?: 'voice' | 'video';
  isIncoming?: boolean;
}

interface PrivateChatState {
  isActive: boolean;
  chatId?: string;
  otherUser?: any;
}

const SimpleChatListScreen: React.FC<SimpleChatListScreenProps> = ({ user, onLogout }) => {
  const [currentScreen, setCurrentScreen] = useState<'list' | 'family-chat' | 'sos' | 'photo-album' | 'app-status' | 'private-chat-list' | 'profile'>('list');
  const [callState, setCallState] = useState<CallState>({ isActive: false });
  const [privateChatState, setPrivateChatState] = useState<PrivateChatState>({ isActive: false });
  const [currentUser, setCurrentUser] = useState(user);
  const handleLogout = () => {
    console.log('🚪 Logout button clicked!');
    
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Çıxış etmək istədiyinizə əminsiniz?');
      if (confirmed) {
        onLogout();
      }
    } else {
      // For mobile, use a simple callback
      onLogout();
    }
  };

  const handleFamilyChat = () => {
    console.log('👨‍👩‍👧‍👦 Family chat clicked!');
    setCurrentScreen('family-chat');
  };

  const handleSOSChat = () => {
    console.log('🆘 SOS clicked!');
    setCurrentScreen('sos');
  };

  const handlePhotoAlbum = () => {
    console.log('📸 Photo album clicked!');
    setCurrentScreen('photo-album');
  };

  const handleAppStatus = () => {
    console.log('📊 App status clicked!');
    setCurrentScreen('app-status');
  };

  const handlePrivateChats = () => {
    console.log('💬 Private chats clicked!');
    setCurrentScreen('private-chat-list');
  };

  const handleProfile = () => {
    console.log('👤 Profile clicked!');
    setCurrentScreen('profile');
  };

  const handleUpdateUser = (updatedUser: any) => {
    setCurrentUser(updatedUser);
  };

  const handleOpenPrivateChat = (chatId: string, otherUser: any) => {
    console.log('💬 Opening private chat:', chatId);
    setPrivateChatState({ isActive: true, chatId, otherUser });
  };

  const handleStartCall = (type: 'voice' | 'video', otherUser?: any) => {
    console.log('📞 Starting call:', type);
    setCallState({ 
      isActive: true, 
      callType: type, 
      otherUser: otherUser || user,
      isIncoming: false 
    });
  };

  const handleEndCall = () => {
    console.log('📞 Ending call');
    setCallState({ isActive: false });
  };

  const handleBackToList = () => {
    setCurrentScreen('list');
    setPrivateChatState({ isActive: false });
  };

  // If family chat is selected, show FamilyChatScreen
  if (currentScreen === 'family-chat') {
    return (
      <FamilyChatScreen
        currentUser={currentUser}
        onBack={handleBackToList}
      />
    );
  }

  // If SOS is selected, show SOSScreen
  if (currentScreen === 'sos') {
    return (
      <SOSScreen
        currentUser={currentUser}
        onBack={handleBackToList}
      />
    );
  }

  // If Photo Album is selected, show PhotoAlbumScreen
  if (currentScreen === 'photo-album') {
    return (
      <PhotoAlbumScreen
        currentUser={currentUser}
        onBack={handleBackToList}
      />
    );
  }

  // If App Status is selected, show AppStatusScreen
  if (currentScreen === 'app-status') {
    return (
      <AppStatusScreen
        currentUser={currentUser}
        onBack={handleBackToList}
      />
    );
  }

  // If Private Chat List is selected, show PrivateChatListScreen
  if (currentScreen === 'private-chat-list') {
    return (
      <PrivateChatListScreen
        currentUser={currentUser}
        onBack={handleBackToList}
        onOpenChat={handleOpenPrivateChat}
      />
    );
  }

  // If Profile is selected, show UserProfileScreen
  if (currentScreen === 'profile') {
    return (
      <UserProfileScreen
        currentUser={currentUser}
        onBack={handleBackToList}
        onUpdateUser={handleUpdateUser}
      />
    );
  }

  // If Private Chat is active, show PrivateChatScreen
  if (privateChatState.isActive && privateChatState.chatId && privateChatState.otherUser) {
    return (
      <PrivateChatScreen
        currentUser={currentUser}
        otherUser={privateChatState.otherUser}
        chatId={privateChatState.chatId}
        onBack={() => setPrivateChatState({ isActive: false })}
        onStartCall={(type) => handleStartCall(type, privateChatState.otherUser)}
      />
    );
  }

  // If Call is active, show VideoCallScreen
  if (callState.isActive && callState.otherUser) {
    return (
      <VideoCallScreen
        currentUser={currentUser}
        otherUser={callState.otherUser}
        callType={callState.callType || 'voice'}
        isIncoming={callState.isIncoming}
        onEndCall={handleEndCall}
      />
    );
  }

  // Otherwise show chat list
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.profileButton} onPress={handleProfile}>
          <Text style={styles.profileButtonText}>👤</Text>
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Family Messenger</Text>
          <Text style={styles.welcomeText}>Xoş gəlmisiniz, {currentUser.name}! 👋</Text>
        </View>
        
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>🚪</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.chatList}>
        <Text style={styles.sectionTitle}>💬 Söhbətlər</Text>
        
        <TouchableOpacity style={styles.chatItem} onPress={handlePrivateChats}>
          <Text style={styles.chatTitle}>💬 Şəxsi Söhbətlər</Text>
          <Text style={styles.chatPreview}>Ailəni üzvləri ilə şəxsi mesajlaşma...</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.chatItem} onPress={handleFamilyChat}>
          <Text style={styles.chatTitle}>👨‍👩‍👧‍👦 Ailə Qrupu</Text>
          <Text style={styles.chatPreview}>Hamının söhbət etdiyi yer...</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.chatItem} onPress={handleSOSChat}>
          <Text style={styles.chatTitle}>🆘 Təcili SOS</Text>
          <Text style={styles.chatPreview}>Təcili hallar üçün...</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.chatItem} onPress={handlePhotoAlbum}>
          <Text style={styles.chatTitle}>📸 Ailə Foto Albumu</Text>
          <Text style={styles.chatPreview}>Ümumi fotoları burada paylaşın...</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.userInfo}>
        <View style={styles.topButtonsRow}>
          <TouchableOpacity style={styles.compactButton} onPress={handleAppStatus}>
            <Text style={styles.compactButtonText}>📊</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.compactButton} 
            onPress={() => handleStartCall('voice')}
          >
            <Text style={styles.compactButtonText}>📞</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.compactButton} 
            onPress={() => handleStartCall('video')}
          >
            <Text style={styles.compactButtonText}>📹</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.userInfoText}>
          👤 {user.name} • @{user.username} • ✅ Online
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
    backgroundColor: '#667eea',
    padding: 20,
    paddingTop: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profileButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileButtonText: {
    fontSize: 20,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 5,
  },
  welcomeText: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    marginBottom: 15,
  },
  logoutButton: {
    backgroundColor: '#ff4757',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutButtonText: {
    fontSize: 20,
  },
  chatList: {
    flex: 1,
    padding: 20,
    paddingBottom: 100, // Reduced from 180 to 100
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  chatItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  chatPreview: {
    fontSize: 14,
    color: '#666',
  },
  userInfo: {
    backgroundColor: '#667eea',
    padding: 12,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  topButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    gap: 15,
  },
  compactButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactButtonText: {
    fontSize: 20,
  },
  userInfoText: {
    color: 'white',
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 2,
  },
  statusButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    alignSelf: 'center',
    marginBottom: 10,
  },
  statusButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  quickCallSection: {
    marginBottom: 15,
  },
  quickCallTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  quickCallButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  quickCallButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 15,
    paddingHorizontal: 15,
    paddingVertical: 8,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  quickCallButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default SimpleChatListScreen;
