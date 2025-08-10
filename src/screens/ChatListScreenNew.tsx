import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import GlobalStorageManager from '../utils/GlobalStorage';

interface User {
  id: string;
  username: string;
  name: string;
  profilePicture?: string;
  isOnline: boolean;
  lastSeen: string;
}

interface Chat {
  id: string;
  name: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isGroup: boolean;
  participants: string[];
  avatar?: string;
}

type NavigationProp = StackNavigationProp<any, any>;

const ChatListScreen: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp>();

  useEffect(() => {
    initializeGlobalStorage();
    fetchUsers();
  }, []);

  useEffect(() => {
    // Auto refresh every 10 seconds to see new users
    const interval = setInterval(() => {
      fetchUsers();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const initializeGlobalStorage = async () => {
    try {
      console.log('🔄 Initializing GlobalStorage...');
      const globalStorage = GlobalStorageManager.getInstance();
      await globalStorage.initialize();
      
      // Update current user in global storage
      if (user) {
        await globalStorage.updateUser({
          id: user.id,
          username: user.username,
          name: user.name,
          profilePicture: user.profilePicture,
          birthday: user.birthday || '01.01.1990',
          isOnline: true,
          lastSeen: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('❌ GlobalStorage initialization error:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      console.log('🔍 Fetching users with GlobalStorage...');
      console.log('Current user:', user);
      
      if (!user) {
        console.log('❌ No current user found');
        return;
      }

      // Get GlobalStorage instance
      const globalStorage = GlobalStorageManager.getInstance();
      
      // Get all active users from global storage
      const allUsers = await globalStorage.getAllUsers();
      console.log('📊 All users from GlobalStorage:', allUsers.length);
      
      // Filter out current user and map to local User format
      const realUsers: User[] = allUsers
        .filter((u) => u.id !== user.id)
        .map((u) => ({
          id: u.id,
          username: u.username,
          name: u.name,
          profilePicture: u.profilePicture,
          isOnline: u.isOnline,
          lastSeen: u.lastSeen,
        }));

      console.log('👥 Real users (filtered):', realUsers.length);
      setUsers(realUsers);

      // Create chats for each user
      const userChats: Chat[] = realUsers.map((otherUser) => ({
        id: `chat_${user.id}_${otherUser.id}`,
        name: otherUser.name,
        lastMessage: otherUser.isOnline ? 'Onlayn' : `Son aktivlik: ${formatTime(otherUser.lastSeen)}`,
        lastMessageTime: otherUser.lastSeen,
        unreadCount: 0,
        isGroup: false,
        participants: [user.id, otherUser.id],
        avatar: otherUser.profilePicture,
      }));

      // Add family group if there are users
      if (realUsers.length > 0) {
        const familyChat: Chat = {
          id: 'family_group',
          name: 'Ailə Qrupu',
          lastMessage: `${realUsers.length + 1} üzv var`,
          lastMessageTime: new Date().toISOString(),
          unreadCount: 0,
          isGroup: true,
          participants: [user.id, ...realUsers.map(u => u.id)],
          avatar: undefined,
        };
        
        setChats([familyChat, ...userChats]);
        console.log('✅ Created', userChats.length, 'user chats + 1 family group');
      } else {
        setChats(userChats);
        console.log('⚠️ No other users found, only user chats created');
      }

    } catch (error) {
      console.error('❌ Error fetching users:', error);
      Alert.alert('Xəta', 'İstifadəçilər yüklənə bilmədi');
      setUsers([]);
      setChats([]);
    }
  };

  const formatTime = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return 'İndi';
      if (diffMins < 60) return `${diffMins} dəq əvvəl`;
      if (diffHours < 24) return `${diffHours} saat əvvəl`;
      if (diffDays < 7) return `${diffDays} gün əvvəl`;
      
      return date.toLocaleDateString('az-AZ');
    } catch (error) {
      return 'Naməlum';
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  };

  const navigateToChat = (chat: Chat) => {
    if (chat.isGroup) {
      navigation.navigate('ChatScreen', {
        chatId: chat.id,
        chatName: chat.name,
        isGroup: true,
        participants: chat.participants,
      });
    } else {
      const otherUserId = chat.participants.find(id => id !== user?.id);
      const otherUser = users.find(u => u.id === otherUserId);
      
      navigation.navigate('ChatScreen', {
        chatId: chat.id,
        chatName: chat.name,
        isGroup: false,
        otherUserId: otherUserId,
        otherUser: otherUser,
      });
    }
  };

  const renderChatItem = ({ item }: { item: Chat }) => (
    <TouchableOpacity style={styles.chatItem} onPress={() => navigateToChat(item)}>
      <View style={styles.avatarContainer}>
        {item.isGroup ? (
          <View style={styles.groupAvatar}>
            <Ionicons name="people" size={24} color="#667eea" />
          </View>
        ) : (
          <View style={styles.userAvatar}>
            <Ionicons name="person" size={24} color="#764ba2" />
          </View>
        )}
      </View>
      
      <View style={styles.chatInfo}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatName}>{item.name}</Text>
          <Text style={styles.lastMessageTime}>
            {formatTime(item.lastMessageTime)}
          </Text>
        </View>
        
        <View style={styles.chatFooter}>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage}
          </Text>
          {item.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>{item.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>Hələ heç kim yoxdur</Text>
      <Text style={styles.emptyDescription}>
        Digər ailə üzvləri qeydiyyatdan keçəndə burada görəcəksiniz
      </Text>
      <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
        <Ionicons name="refresh" size={20} color="white" />
        <Text style={styles.refreshButtonText}>Yenilə</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Söhbətlər</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshIcon}>
          <Ionicons name="refresh" size={24} color="#667eea" />
        </TouchableOpacity>
      </View>

      {chats.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item.id}
          renderItem={renderChatItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
          style={styles.chatList}
        />
      )}

      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          👥 {users.length} istifadəçi aktiv • 🔄 Avtomatik yenilənir
        </Text>
      </View>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  refreshIcon: {
    padding: 8,
  },
  chatList: {
    flex: 1,
  },
  chatItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatarContainer: {
    marginRight: 12,
  },
  groupAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f3e5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatInfo: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  lastMessageTime: {
    fontSize: 12,
    color: '#999',
  },
  chatFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: '#667eea',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadCount: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  refreshButton: {
    backgroundColor: '#667eea',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  statusBar: {
    backgroundColor: '#e8f5e8',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  statusText: {
    fontSize: 12,
    color: '#4caf50',
    textAlign: 'center',
  },
});

export default ChatListScreen;
