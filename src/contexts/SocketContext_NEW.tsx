import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
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
        transports: ['websocket'],
        timeout: 20000,
        auth: {
          token,
        },
      });

      newSocket.on('connect', () => {
        console.log('Connected to server');
        newSocket.emit('user_join', {
          userId: user.id,
          username: user.username,
          name: user.name,
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
            body: `${userData.name} online oldu`,
            sound: 'default',
          },
          trigger: null,
        });
      });

      newSocket.on('user_offline', (userData) => {
        console.log(`${userData.name} offline oldu`);
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
            body: `${birthdayData.name} bugün doğum günüdür!`,
            sound: 'default',
          },
          trigger: null,
        });
      });

      newSocket.on('receive_message', async (messageData) => {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: messageData.senderName,
            body: messageData.content,
            sound: 'default',
          },
          trigger: null,
        });
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
      });

      newSocket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
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
        require('../../assets/emergency-sound.mp3'), // You'll need to add this sound file
        { shouldPlay: true, volume: 1.0 }
      );
      await sound.playAsync();
    } catch (error) {
      console.log('Emergency sound not available:', error);
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

export default SocketProvider;
