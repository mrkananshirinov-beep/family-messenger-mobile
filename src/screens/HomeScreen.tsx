import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as Location from 'expo-location';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import UserCard from '../components/UserCard';
import SOSButton from '../components/SOSButton';
import { RootStackParamList } from '../navigation/RootStackNavigator';

type NavigationProp = StackNavigationProp<RootStackParamList>;

interface User {
  id: string;
  username: string;
  name: string;
  profilePicture?: string;
  isOnline: boolean;
  lastSeen: string;
  birthday: string;
}

const HomeScreen: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { user, token } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const navigation = useNavigation<NavigationProp>();

  useEffect(() => {
    fetchUsers();
    checkBirthdays();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('user_online', handleUserOnline);
      socket.on('user_offline', handleUserOffline);
      socket.on('birthday_alert', handleBirthdayAlert);

      return () => {
        socket.off('user_online', handleUserOnline);
        socket.off('user_offline', handleUserOffline);
        socket.off('birthday_alert', handleBirthdayAlert);
      };
    }
  }, [socket]);

  const fetchUsers = async () => {
    if (!token) return;

    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkBirthdays = async () => {
    if (!token) return;

    try {
      const response = await fetch('http://localhost:5000/api/users/birthdays/today', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.birthdayUsers && data.birthdayUsers.length > 0) {
          data.birthdayUsers.forEach((birthdayUser: User) => {
            if (socket) {
              socket.emit('birthday_notification', {
                userId: birthdayUser.id,
                fullName: birthdayUser.fullName,
              });
            }
          });
        }
      }
    } catch (error) {
      console.error('Error checking birthdays:', error);
    }
  };

  const handleUserOnline = (userData: any) => {
    setUsers(prev => prev.map(u => 
      u.id === userData.userId 
        ? { ...u, isOnline: true }
        : u
    ));
  };

  const handleUserOffline = (userData: any) => {
    setUsers(prev => prev.map(u => 
      u.id === userData.userId 
        ? { ...u, isOnline: false, lastSeen: new Date().toISOString() }
        : u
    ));
  };

  const handleBirthdayAlert = (birthdayData: any) => {
    Alert.alert(
      '🎂 Doğum günü!',
      `${birthdayData.fullName} bugün doğum günüdür!`,
      [{ text: 'Təbrik et', onPress: () => {
        // Navigate to chat with birthday user
        navigation.navigate('Chat', {
          chatId: `private_${birthdayData.userId}`,
          chatName: birthdayData.fullName,
          isGroup: false,
        });
      }}]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
    await checkBirthdays();
    setRefreshing(false);
  };

  const handleUserPress = (selectedUser: User) => {
    // Navigate to private chat
    navigation.navigate('Chat', {
      chatId: `private_${selectedUser.id}`,
      chatName: selectedUser.fullName,
      isGroup: false,
    });
  };

  const renderUserItem = ({ item }: { item: User }) => (
    <UserCard 
      user={item} 
      onPress={() => handleUserPress(item)}
    />
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.welcomeContainer}
      >
        <Text style={styles.welcomeText}>
          Xoş gəlmisiniz, {user?.name}!
        </Text>
        <Text style={styles.onlineCount}>
          {onlineUsers.length} istifadəçi online
        </Text>
      </LinearGradient>

      {/* SOS Button */}
      <View style={styles.sosContainer}>
        <SOSButton />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Aile Üzvləri</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Ionicons name="refresh" size={24} color="#667eea" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={users}
        renderItem={renderUserItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContainer: {
    paddingBottom: 20,
  },
  header: {
    paddingBottom: 16,
  },
  welcomeContainer: {
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  onlineCount: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  sosContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
});

export default HomeScreen;
