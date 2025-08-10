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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import GlobalStorageManager from '../utils/GlobalStorage';
import { useSocket } from '../contexts/SocketContext';
import { RootStackParamList } from '../navigation/RootStackNavigator';

type NavigationProp = StackNavigationProp<RootStackParamList>;

interface Chat {
  id: string;
  name: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isGroup: boolean;
  isOnline?: boolean;
  participants?: string[];
}

interface User {
  id: string;
  username: string;
  name: string;
  profilePicture?: string;
  isOnline: boolean;
  lastSeen: string;
}

const ChatListScreen: React.FC = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const { user, token } = useAuth();
  const { socket } = useSocket();
  const navigation = useNavigation<NavigationProp>();

  useEffect(() => {
    loadChats();
    fetchUsers();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('receive_message', handleNewMessage);
      socket.on('receive_group_message', handleNewGroupMessage);
      socket.on('user_online', handleUserOnline);
      socket.on('user_offline', handleUserOffline);

      return () => {
        socket.off('receive_message', handleNewMessage);
        socket.off('receive_group_message', handleNewGroupMessage);
        socket.off('user_online', handleUserOnline);
        socket.off('user_offline', handleUserOffline);
      };
    }
  }, [socket]);

  const fetchUsers = async () => {
    try {
      console.log('🔍 Fetching users with GlobalStorage...');
      console.log('Current user:', user);
      
      // Get GlobalStorage instance
      const globalStorage = GlobalStorageManager.getInstance();
      
      // Get all active users from global storage
      const allUsers = await globalStorage.getAllUsers();
      console.log('📊 All users from GlobalStorage:', allUsers);
      
      // Filter out current user and map to local User format
      const realUsers: User[] = allUsers
        .filter((u) => u.id !== user?.id)
        .map((u) => ({
          id: u.id,
          username: u.username,
          name: u.name,
          profilePicture: u.profilePicture,
          isOnline: u.isOnline,
          lastSeen: u.lastSeen,
        }));

      console.log('� Real users (filtered):', realUsers);
      setUsers(realUsers);

      // Create family group with all active users
      if (realUsers.length > 0) {
        const familyGroup: Group = {
          id: 'family_group',
          name: 'Ailə Qrupu',
          description: 'Ailə üzvlərinin ümumi qrupu',
          members: [
            ...(user ? [{
              id: user.id,
              username: user.username,
              name: user.name,
              profilePicture: user.profilePicture,
            }] : []),
            ...realUsers.map(u => ({
              id: u.id,
              username: u.username,
              name: u.name,
              profilePicture: u.profilePicture,
            }))
          ],
          createdAt: new Date().toISOString(),
          lastMessage: {
            id: 'welcome',
            senderId: 'system',
            senderName: 'Sistem',
            text: `Ailə qrupuna xoş gəldiniz! ${realUsers.length + 1} üzv`,
            timestamp: new Date().toISOString(),
            type: 'text',
          },
        };
        
        setGroups([familyGroup]);
        console.log('👨‍👩‍👧‍� Family group created with', familyGroup.members.length, 'members');
      } else {
        setGroups([]);
        console.log('⚠️ No other users found, no family group created');
      }
    } catch (error) {
      console.error('❌ Error fetching users:', error);
      setUsers([]);
      setGroups([]);
    }
  };
      
      // Real users-dən chat list yaradırıq
      const userChats: Chat[] = realUsers
        .map((u: User) => ({
          id: `private_${u.id}`,
          name: u.name,
          lastMessage: u.isOnline ? 'Online' : `Son giriş: ${getLastSeenText(u.lastSeen)}`,
          lastMessageTime: u.isOnline ? 'İndi' : getLastSeenText(u.lastSeen),
          unreadCount: Math.floor(Math.random() * 3), // Random unread count
          isGroup: false,
          isOnline: u.isOnline,
        }));

      // Ailə qrupunu əlavə edək (only if there are real users)
      const chatsToSet: Chat[] = [...userChats];
      
      if (realUsers.length > 0) {
        const groupChat: Chat = {
          id: 'group_family',
          name: 'Ailə Qrupu',
          lastMessage: `${realUsers.length + 1} üzv var`,
          lastMessageTime: 'İndi',
          unreadCount: 0,
          isGroup: true,
          participants: [user?.id || 'unknown', ...realUsers.map((u: User) => u.id)],
        };
        chatsToSet.unshift(groupChat);
      }

      setChats(chatsToSet);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const getLastSeenText = (lastSeen: string): string => {
    const now = new Date();
    const lastSeenDate = new Date(lastSeen);
    const diffMs = now.getTime() - lastSeenDate.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'İndi';
    if (diffMins < 60) return `${diffMins} dəq əvvəl`;
    if (diffHours < 24) return `${diffHours} saat əvvəl`;
    if (diffDays === 1) return 'Dünən';
    return `${diffDays} gün əvvəl`;
  };

  const handleUserOnline = (userData: any) => {
    setUsers(prev => prev.map(u => 
      u.id === userData.userId 
        ? { ...u, isOnline: true }
        : u
    ));
    
    // Chat listini yenilə
    setChats(prev => prev.map(chat => 
      chat.id === `private_${userData.userId}`
        ? { 
            ...chat, 
            lastMessage: 'Online',
            lastMessageTime: 'İndi',
            isOnline: true 
          }
        : chat
    ));
  };

  const handleUserOffline = (userData: any) => {
    const now = new Date().toISOString();
    setUsers(prev => prev.map(u => 
      u.id === userData.userId 
        ? { ...u, isOnline: false, lastSeen: now }
        : u
    ));

    // Chat listini yenilə  
    setChats(prev => prev.map(chat => 
      chat.id === `private_${userData.userId}`
        ? { 
            ...chat, 
            lastMessage: `Son giriş: İndi`,
            lastMessageTime: 'İndi',
            isOnline: false 
          }
        : chat
    ));
  };

  const loadChats = async () => {
    // fetchUsers funksiyası artıq chat listini yaradacaq
    await fetchUsers();
  };

  const handleNewMessage = (messageData: any) => {
    // Update chat list with new message
    setChats(prev => prev.map(chat => 
      chat.id === messageData.chatId 
        ? {
            ...chat,
            lastMessage: messageData.content || 'Yeni mesaj',
            lastMessageTime: new Date().toLocaleTimeString('az-AZ', { 
              hour: '2-digit', 
              minute: '2-digit' 
            }),
            unreadCount: chat.unreadCount + 1,
          }
        : chat
    ));
  };

  const handleNewGroupMessage = (messageData: any) => {
    // Update group chat
    setChats(prev => prev.map(chat => 
      chat.isGroup
        ? {
            ...chat,
            lastMessage: `${messageData.senderName}: ${messageData.content || 'Yeni mesaj'}`,
            lastMessageTime: new Date().toLocaleTimeString('az-AZ', { 
              hour: '2-digit', 
              minute: '2-digit' 
            }),
            unreadCount: chat.unreadCount + 1,
          }
        : chat
    ));
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUsers(); // loadChats əvəzinə fetchUsers
    setRefreshing(false);
  };

  const handleChatPress = (chat: Chat) => {
    // Navigate to chat screen
    navigation.navigate('Chat', {
      chatId: chat.id,
      chatName: chat.name,
      isGroup: chat.isGroup,
    });
  };

  const renderChatItem = ({ item }: { item: Chat }) => (
    <TouchableOpacity 
      style={styles.chatItem} 
      onPress={() => handleChatPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.chatAvatarContainer}>
        <View style={[styles.chatAvatar, item.isGroup && styles.groupAvatar]}>
          {item.isGroup ? (
            <Ionicons name="people" size={24} color="white" />
          ) : (
            <Ionicons name="person" size={24} color="white" />
          )}
        </View>
        
        {/* Online status indicator - only for private chats */}
        {!item.isGroup && (
          <View style={[styles.onlineIndicator, { backgroundColor: item.isOnline ? '#10b981' : '#6b7280' }]} />
        )}
      </View>

      <View style={styles.chatInfo}>
        <View style={styles.chatHeader}>
          <View style={styles.nameContainer}>
            <Text style={styles.chatName}>{item.name}</Text>
            {!item.isGroup && item.isOnline && (
              <Text style={styles.onlineText}>online</Text>
            )}
          </View>
          <Text style={styles.chatTime}>{item.lastMessageTime}</Text>
        </View>
        
        <View style={styles.chatBottom}>
          <Text style={[styles.lastMessage, item.isOnline && !item.isGroup && styles.onlineMessage]} numberOfLines={1}>
            {item.lastMessage}
          </Text>
          {item.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>
                {item.unreadCount > 99 ? '99+' : item.unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {chats.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>Hələ heç bir çat yoxdur</Text>
          <Text style={styles.emptySubtitle}>
            Ana səhifədən istifadəçi seçərək çat başladın
          </Text>
        </View>
      ) : (
        <FlatList
          data={chats}
          renderItem={renderChatItem}
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContainer: {
    paddingVertical: 8,
  },
  chatItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  chatAvatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  chatAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupAvatar: {
    backgroundColor: '#10b981',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'white',
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
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginRight: 8,
  },
  onlineText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '500',
  },
  chatTime: {
    fontSize: 12,
    color: '#6b7280',
  },
  chatBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    flex: 1,
    fontSize: 14,
    color: '#6b7280',
    marginRight: 8,
  },
  onlineMessage: {
    color: '#10b981',
    fontWeight: '500',
  },
  unreadBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
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
});

export default ChatListScreen;
