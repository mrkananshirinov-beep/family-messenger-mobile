import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';

interface User {
  id: string;
  username: string;
  name: string;
}

interface PrivateChat {
  id: string;
  participants: string[];
  lastMessage?: string;
  timestamp?: string;
  unreadCount: number;
}

interface PrivateChatListScreenProps {
  currentUser: User;
  onBack: () => void;
  onOpenChat: (chatId: string, otherUser: User) => void;
}

const PrivateChatListScreen: React.FC<PrivateChatListScreenProps> = ({
  currentUser,
  onBack,
  onOpenChat,
}) => {
  const [chats, setChats] = useState<PrivateChat[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);

  useEffect(() => {
    loadPrivateChats();
    loadAllUsers();
  }, []);

  const loadPrivateChats = () => {
    try {
      const savedChats = localStorage.getItem('privateChats');
      if (savedChats) {
        const parsedChats = JSON.parse(savedChats);
        setChats(parsedChats.filter((chat: PrivateChat) => 
          chat.participants.includes(currentUser.id)
        ));
      }
    } catch (error) {
      console.error('Error loading private chats:', error);
    }
  };

  const loadAllUsers = () => {
    try {
      const savedUsers = localStorage.getItem('allUsers');
      if (savedUsers) {
        const parsedUsers = JSON.parse(savedUsers);
        setAllUsers(parsedUsers.filter((user: User) => user.id !== currentUser.id));
      } else {
        // Demo users for testing
        const demoUsers = [
          { id: 'user2', username: 'anas', name: 'Ana' },
          { id: 'user3', username: 'baba', name: 'Baba' },
          { id: 'user4', username: 'qardas', name: 'Qardaş' },
          { id: 'user5', username: 'bacim', name: 'Bacım' },
        ];
        setAllUsers(demoUsers);
        localStorage.setItem('allUsers', JSON.stringify([...demoUsers, currentUser]));
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const createNewChat = (otherUser: User) => {
    const existingChat = chats.find(chat => 
      chat.participants.includes(otherUser.id)
    );

    if (existingChat) {
      onOpenChat(existingChat.id, otherUser);
      return;
    }

    const newChat: PrivateChat = {
      id: `chat_${currentUser.id}_${otherUser.id}_${Date.now()}`,
      participants: [currentUser.id, otherUser.id],
      unreadCount: 0,
    };

    const updatedChats = [...chats, newChat];
    setChats(updatedChats);

    // Save to localStorage
    try {
      const allChats = JSON.parse(localStorage.getItem('privateChats') || '[]');
      const filteredChats = allChats.filter((chat: PrivateChat) => 
        !(chat.participants.includes(currentUser.id) && chat.participants.includes(otherUser.id))
      );
      localStorage.setItem('privateChats', JSON.stringify([...filteredChats, newChat]));
    } catch (error) {
      console.error('Error saving new chat:', error);
    }

    setShowNewChat(false);
    onOpenChat(newChat.id, otherUser);
  };

  const getChatPartner = (chat: PrivateChat): User | undefined => {
    const partnerId = chat.participants.find(id => id !== currentUser.id);
    return allUsers.find(user => user.id === partnerId);
  };

  const filteredUsers = allUsers.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (timestamp?: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'İndi';
    if (diffMins < 60) return `${diffMins}d`;
    if (diffHours < 24) return `${diffHours}s`;
    if (diffDays < 7) return `${diffDays} gün`;
    return date.toLocaleDateString('az-AZ');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Geri</Text>
        </TouchableOpacity>
        <Text style={styles.title}>💬 Şəxsi Söhbətlər</Text>
        <TouchableOpacity 
          style={styles.newChatButton} 
          onPress={() => setShowNewChat(!showNewChat)}
        >
          <Text style={styles.newChatButtonText}>+ Yeni</Text>
        </TouchableOpacity>
      </View>

      {/* New Chat Section */}
      {showNewChat && (
        <View style={styles.newChatSection}>
          <Text style={styles.sectionTitle}>👥 Yeni Söhbət Başlat</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Axtarış..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <ScrollView style={styles.usersList}>
            {filteredUsers.map(user => (
              <TouchableOpacity
                key={user.id}
                style={styles.userItem}
                onPress={() => createNewChat(user)}
              >
                <View style={styles.userAvatar}>
                  <Text style={styles.avatarText}>{user.name.charAt(0)}</Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{user.name}</Text>
                  <Text style={styles.userHandle}>@{user.username}</Text>
                </View>
                <Text style={styles.messageButton}>💬</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Chat List */}
      <ScrollView style={styles.chatList}>
        <Text style={styles.sectionTitle}>📱 Söhbətlərim</Text>
        
        {chats.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>🤷‍♂️ Hələ heç bir şəxsi söhbətiniz yoxdur</Text>
            <Text style={styles.emptySubtext}>Yuxarıdakı "Yeni" düyməsini basın</Text>
          </View>
        ) : (
          chats.map(chat => {
            const partner = getChatPartner(chat);
            if (!partner) return null;

            return (
              <TouchableOpacity
                key={chat.id}
                style={styles.chatItem}
                onPress={() => onOpenChat(chat.id, partner)}
              >
                <View style={styles.userAvatar}>
                  <Text style={styles.avatarText}>{partner.name.charAt(0)}</Text>
                </View>
                <View style={styles.chatInfo}>
                  <View style={styles.chatHeader}>
                    <Text style={styles.chatName}>{partner.name}</Text>
                    <Text style={styles.chatTime}>{formatTime(chat.timestamp)}</Text>
                  </View>
                  <View style={styles.chatPreviewRow}>
                    <Text style={styles.chatPreview} numberOfLines={1}>
                      {chat.lastMessage || 'Yeni söhbət...'}
                    </Text>
                    {chat.unreadCount > 0 && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadText}>{chat.unreadCount}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={styles.chatActions}>
                  <TouchableOpacity style={styles.actionButton}>
                    <Text style={styles.actionText}>📞</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionButton}>
                    <Text style={styles.actionText}>📹</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Text style={styles.quickActionsTitle}>⚡ Tez Əməliyyatlar</Text>
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.quickButton}>
            <Text style={styles.quickButtonText}>🎤 Səs Mesajı</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickButton}>
            <Text style={styles.quickButtonText}>📹 Video Mesajı</Text>
          </TouchableOpacity>
        </View>
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
  newChatButton: {
    backgroundColor: '#48c78e',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  newChatButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  newChatSection: {
    backgroundColor: 'white',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    maxHeight: 300,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  searchInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginBottom: 10,
    fontSize: 14,
  },
  usersList: {
    maxHeight: 200,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  userHandle: {
    fontSize: 12,
    color: '#666',
  },
  messageButton: {
    fontSize: 20,
    marginLeft: 10,
  },
  chatList: {
    flex: 1,
    padding: 15,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  chatItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  chatInfo: {
    flex: 1,
    marginLeft: 10,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  chatName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  chatTime: {
    fontSize: 12,
    color: '#666',
  },
  chatPreviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatPreview: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: '#ff4757',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  unreadText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  chatActions: {
    flexDirection: 'row',
    marginLeft: 10,
  },
  actionButton: {
    marginLeft: 10,
  },
  actionText: {
    fontSize: 20,
  },
  quickActions: {
    backgroundColor: 'white',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  quickActionsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  quickButton: {
    backgroundColor: '#667eea',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  quickButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default PrivateChatListScreen;
