import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react        newSocket.emit('user_join', {
          userId: user.id,
          username: user.username,
          name: user.name,
          profilePicture: user.profilePicture,
        });port { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';
import { Alert, Platform } from 'react-native';

interface SocketContextType {
  socket: Socket | null;
  onlineUsers: any[];
  connectSocket: () => void;
  disconnectSocket: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: ReactNode;
}

const SOCKET_URL = process.env.EXPO_PUBLIC_SERVER_URL || 'http://localhost:5000';

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const { user, token } = useAuth();

  useEffect(() => {
    setupNotifications();
  }, []);

  useEffect(() => {
    if (user && token) {
      connectSocket();
    } else {
      disconnectSocket();
    }

    return () => {
      disconnectSocket();
    };
  }, [user, token]);

  const setupNotifications = async () => {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      Alert.alert('Bildiriş icazəsi', 'Bildirişlər üçün icazə verilmədi');
      return;
    }

    // Configure notifications
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  };

  const connectSocket = () => {
    if (user && token && !socket) {
      const newSocket = io(SOCKET_URL, {
        auth: {
          token,
        },
      });

      newSocket.on('connect', () => {
        console.log('Connected to server');
        newSocket.emit('user_join', {
          userId: user.id,
          username: user.username,
          fullName: user.fullName,
          profilePicture: user.profilePicture,
        });
      });

      newSocket.on('online_users', (users) => {
        setOnlineUsers(users);
      });

      newSocket.on('user_online', (userData) => {
        Notifications.scheduleNotificationAsync({
          content: {
            title: 'İstifadəçi online oldu',
            body: `${userData.fullName} online oldu`,
            sound: 'default',
          },
          trigger: null,
        });
      });

      newSocket.on('user_offline', (userData) => {
        console.log(`${userData.fullName} offline oldu`);
      });

      newSocket.on('sos_emergency', async (sosData) => {
        // Play emergency sound
        await playEmergencySound();
        
        // Show emergency notification
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '🆘 TƏCİLİ YARDIM!',
            body: `${sosData.senderName} yardım istəyir!\nMəkan: ${sosData.location?.address || 'Bilinmir'}`,
            sound: 'default',
            priority: Notifications.AndroidNotificationPriority.MAX,
            vibrate: [0, 250, 250, 250],
          },
          trigger: null,
        });

        // Show alert
        Alert.alert(
          '🆘 TƏCİLİ YARDIM!',
          `${sosData.senderName} yardım istəyir!\n\nMəkan: ${sosData.location?.address || 'Bilinmir'}`,
          [
            { text: 'Bağla', style: 'cancel' },
            { text: 'Məkanı göstər', onPress: () => {
              // Open maps with location
              console.log('Opening maps with location:', sosData.location);
            }},
          ],
          { cancelable: false }
        );
      });

      newSocket.on('birthday_alert', async (birthdayData) => {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '🎂 Doğum günü!',
            body: `${birthdayData.fullName} bugün doğum günüdür!`,
            sound: 'default',
          },
          trigger: null,
        });
      });

      newSocket.on('receive_message', async (messageData) => {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: messageData.senderName,
            body: messageData.content || 'Yeni mesaj',
            sound: 'default',
          },
          trigger: null,
        });
      });

      newSocket.on('receive_group_message', async (messageData) => {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Qrup mesajı',
            body: `${messageData.senderName}: ${messageData.content || 'Yeni mesaj'}`,
            sound: 'default',
          },
          trigger: null,
        });
      });

      newSocket.on('disconnect', () => {
        console.log('Disconnected from server');
      });

      setSocket(newSocket);
    }
  };

  const disconnectSocket = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setOnlineUsers([]);
    }
  };

  const playEmergencySound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/emergency-sound.mp3'), // We'll need to add this file
        { shouldPlay: true, isLooping: true, volume: 1.0 }
      );
      
      // Stop sound after 15 seconds
      setTimeout(async () => {
        await sound.stopAsync();
        await sound.unloadAsync();
      }, 15000);
    } catch (error) {
      console.error('Error playing emergency sound:', error);
      // Fallback: vibrate pattern for 15 seconds
      if (Platform.OS === 'android') {
        // Vibrate in pattern for 15 seconds
        const vibrationPattern = [1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000];
        // Note: React Native doesn't have direct vibration control, we'll use Expo Haptics
      }
    }
  };

  const value: SocketContextType = {
    socket,
    onlineUsers,
    connectSocket,
    disconnectSocket,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
