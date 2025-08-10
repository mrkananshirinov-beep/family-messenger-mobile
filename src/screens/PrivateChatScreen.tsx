import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Platform,
} from 'react-native';

interface User {
  id: string;
  username: string;
  name: string;
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  type: 'text' | 'voice' | 'video' | 'image' | 'file';
  duration?: number; // For voice/video messages
  size?: number; // For files
}

interface PrivateChatScreenProps {
  currentUser: User;
  otherUser: User;
  chatId: string;
  onBack: () => void;
  onStartCall?: (type: 'voice' | 'video') => void;
}

const PrivateChatScreen: React.FC<PrivateChatScreenProps> = ({
  currentUser,
  otherUser,
  chatId,
  onBack,
  onStartCall,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingType, setRecordingType] = useState<'voice' | 'video' | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunks = useRef<Blob[]>([]);

  useEffect(() => {
    loadMessages();
  }, [chatId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = () => {
    try {
      const savedMessages = localStorage.getItem(`chat_${chatId}_messages`);
      if (savedMessages) {
        setMessages(JSON.parse(savedMessages));
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const saveMessages = (newMessages: Message[]) => {
    try {
      localStorage.setItem(`chat_${chatId}_messages`, JSON.stringify(newMessages));
      
      // Update chat preview
      const lastMessage = newMessages[newMessages.length - 1];
      if (lastMessage) {
        updateChatPreview(lastMessage);
      }
    } catch (error) {
      console.error('Error saving messages:', error);
    }
  };

  const updateChatPreview = (message: Message) => {
    try {
      const chats = JSON.parse(localStorage.getItem('privateChats') || '[]');
      const chatIndex = chats.findIndex((chat: any) => chat.id === chatId);
      
      if (chatIndex !== -1) {
        chats[chatIndex].lastMessage = getMessagePreview(message);
        chats[chatIndex].timestamp = message.timestamp;
        
        // Update unread count for the other user
        if (message.senderId !== currentUser.id) {
          chats[chatIndex].unreadCount = (chats[chatIndex].unreadCount || 0) + 1;
        }
        
        localStorage.setItem('privateChats', JSON.stringify(chats));
      }
    } catch (error) {
      console.error('Error updating chat preview:', error);
    }
  };

  const getMessagePreview = (message: Message): string => {
    switch (message.type) {
      case 'voice':
        return '🎤 Səs mesajı';
      case 'video':
        return '📹 Video mesajı';
      case 'image':
        return '🖼️ Şəkil';
      case 'file':
        return '📎 Fayl';
      default:
        return message.content;
    }
  };

  const sendMessage = () => {
    if (!messageText.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: currentUser.id,
      senderName: currentUser.name,
      content: messageText.trim(),
      timestamp: new Date().toISOString(),
      type: 'text',
    };

    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    saveMessages(updatedMessages);
    setMessageText('');

    // Show typing indicator for demo
    simulateOtherUserTyping();
  };

  const simulateOtherUserTyping = () => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      
      // Random response for demo
      const responses = [
        'Salamlar! 👋',
        'Necəsən? 😊',
        'Yaxşıyam, sağ ol! ❤️',
        'Bu gözəl xəbərdir! 🎉',
        'Razıyam! 👍',
        'Gec cavab verdiyim üçün üzr istəyirəm 🙏',
      ];
      
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      
      const responseMessage: Message = {
        id: (Date.now() + 1).toString(),
        senderId: otherUser.id,
        senderName: otherUser.name,
        content: randomResponse,
        timestamp: new Date().toISOString(),
        type: 'text',
      };

      const updatedMessages = [...messages, responseMessage];
      setMessages(prevMessages => [...prevMessages, responseMessage]);
      saveMessages(updatedMessages);
    }, 1000 + Math.random() * 2000);
  };

  const startRecording = async (type: 'voice' | 'video') => {
    try {
      const constraints = type === 'video' 
        ? { video: true, audio: true }
        : { audio: true };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      recordedChunks.current = [];
      mediaRecorderRef.current = new MediaRecorder(stream);
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunks.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(recordedChunks.current, { 
          type: type === 'video' ? 'video/webm' : 'audio/webm' 
        });
        
        saveMediaMessage(blob, type);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingType(type);

    } catch (error) {
      console.error('Error starting recording:', error);
      Alert.alert('Xəta', 'Qeyd başladılmadı. Mikrofon/kamera icazəsi verilməyib.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingType(null);
    }
  };

  const saveMediaMessage = async (blob: Blob, type: 'voice' | 'video') => {
    try {
      // Convert blob to base64 for storage
      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = reader.result as string;
        
        const newMessage: Message = {
          id: Date.now().toString(),
          senderId: currentUser.id,
          senderName: currentUser.name,
          content: base64Data,
          timestamp: new Date().toISOString(),
          type: type,
          duration: 5, // Demo duration
          size: blob.size,
        };

        const updatedMessages = [...messages, newMessage];
        setMessages(updatedMessages);
        saveMessages(updatedMessages);
      };
      reader.readAsDataURL(blob);

    } catch (error) {
      console.error('Error saving media message:', error);
      Alert.alert('Xəta', 'Media mesajı saxlanılmadı.');
    }
  };

  const playMediaMessage = (message: Message) => {
    if (message.type === 'voice' || message.type === 'video') {
      // Create audio/video element and play
      const element = message.type === 'video' 
        ? document.createElement('video')
        : document.createElement('audio');
      
      element.src = message.content;
      element.controls = true;
      element.autoplay = true;
      
      if (message.type === 'video') {
        element.style.maxWidth = '300px';
        element.style.maxHeight = '200px';
      }

      // Show in a simple modal for demo
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.top = '50%';
      container.style.left = '50%';
      container.style.transform = 'translate(-50%, -50%)';
      container.style.background = 'white';
      container.style.padding = '20px';
      container.style.borderRadius = '10px';
      container.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
      container.style.zIndex = '1000';

      const closeButton = document.createElement('button');
      closeButton.textContent = 'Bağla';
      closeButton.style.marginTop = '10px';
      closeButton.style.width = '100%';
      closeButton.onclick = () => {
        document.body.removeChild(container);
        element.pause();
      };

      container.appendChild(element);
      container.appendChild(closeButton);
      document.body.appendChild(container);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('az-AZ', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDuration = (duration?: number) => {
    if (!duration) return '';
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const renderMessage = (message: Message) => {
    const isMyMessage = message.senderId === currentUser.id;

    return (
      <View key={message.id} style={[
        styles.messageContainer,
        isMyMessage ? styles.myMessage : styles.otherMessage
      ]}>
        {!isMyMessage && (
          <Text style={styles.senderName}>{message.senderName}</Text>
        )}
        
        {message.type === 'text' ? (
          <Text style={[
            styles.messageText,
            isMyMessage ? styles.myMessageText : styles.otherMessageText
          ]}>
            {message.content}
          </Text>
        ) : (
          <TouchableOpacity 
            style={styles.mediaMessage}
            onPress={() => playMediaMessage(message)}
          >
            <View style={styles.mediaIcon}>
              <Text style={styles.mediaIconText}>
                {message.type === 'voice' ? '🎤' : '📹'}
              </Text>
            </View>
            <View style={styles.mediaInfo}>
              <Text style={styles.mediaType}>
                {message.type === 'voice' ? 'Səs mesajı' : 'Video mesajı'}
              </Text>
              <Text style={styles.mediaDuration}>
                {formatDuration(message.duration)}
              </Text>
            </View>
            <Text style={styles.playButton}>▶️</Text>
          </TouchableOpacity>
        )}
        
        <Text style={[
          styles.messageTime,
          isMyMessage ? styles.myMessageTime : styles.otherMessageTime
        ]}>
          {formatTime(message.timestamp)}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Geri</Text>
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <View style={styles.userAvatar}>
            <Text style={styles.avatarText}>{otherUser.name.charAt(0)}</Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.headerName}>{otherUser.name}</Text>
            <Text style={styles.headerStatus}>
              {isTyping ? 'yazır...' : 'online'}
            </Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => onStartCall?.('voice')}
          >
            <Text style={styles.actionButtonText}>📞</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => onStartCall?.('video')}
          >
            <Text style={styles.actionButtonText}>📹</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages */}
      <ScrollView 
        ref={scrollViewRef}
        style={styles.messagesContainer}
        showsVerticalScrollIndicator={false}
      >
        {messages.map(renderMessage)}
        
        {isTyping && (
          <View style={styles.typingIndicator}>
            <Text style={styles.typingText}>{otherUser.name} yazır...</Text>
            <View style={styles.typingDots}>
              <Text style={styles.dot}>●</Text>
              <Text style={styles.dot}>●</Text>
              <Text style={styles.dot}>●</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input Area */}
      <View style={styles.inputContainer}>
        <TouchableOpacity
          style={[styles.mediaButton, isRecording && recordingType === 'voice' && styles.recordingButton]}
          onPress={() => isRecording ? stopRecording() : startRecording('voice')}
        >
          <Text style={styles.mediaButtonText}>
            {isRecording && recordingType === 'voice' ? '🛑' : '🎤'}
          </Text>
        </TouchableOpacity>

        <TextInput
          style={styles.textInput}
          placeholder="Mesaj yazın..."
          value={messageText}
          onChangeText={setMessageText}
          multiline
          maxLength={1000}
        />

        <TouchableOpacity
          style={[styles.mediaButton, isRecording && recordingType === 'video' && styles.recordingButton]}
          onPress={() => isRecording ? stopRecording() : startRecording('video')}
        >
          <Text style={styles.mediaButtonText}>
            {isRecording && recordingType === 'video' ? '🛑' : '📹'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.sendButton}
          onPress={sendMessage}
          disabled={!messageText.trim()}
        >
          <Text style={styles.sendButtonText}>📤</Text>
        </TouchableOpacity>
      </View>

      {isRecording && (
        <View style={styles.recordingIndicator}>
          <Text style={styles.recordingText}>
            🔴 {recordingType === 'voice' ? 'Səs qeyd edilir' : 'Video qeyd edilir'}...
          </Text>
        </View>
      )}
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
    padding: 15,
    paddingTop: 50,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  backButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 15,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerStatus: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  headerActions: {
    flexDirection: 'row',
  },
  actionButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginLeft: 5,
  },
  actionButtonText: {
    fontSize: 16,
  },
  messagesContainer: {
    flex: 1,
    padding: 15,
  },
  messageContainer: {
    marginBottom: 15,
    maxWidth: '80%',
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#667eea',
    borderRadius: 18,
    borderBottomRightRadius: 4,
    padding: 12,
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: 'white',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
  },
  senderName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#667eea',
    marginBottom: 5,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  myMessageText: {
    color: 'white',
  },
  otherMessageText: {
    color: '#333',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 5,
  },
  myMessageTime: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'right',
  },
  otherMessageTime: {
    color: '#999',
  },
  mediaMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: 10,
    marginVertical: 5,
  },
  mediaIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  mediaIconText: {
    fontSize: 16,
  },
  mediaInfo: {
    flex: 1,
  },
  mediaType: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  mediaDuration: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  playButton: {
    fontSize: 20,
    marginLeft: 10,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 12,
    marginBottom: 15,
    maxWidth: '60%',
    alignSelf: 'flex-start',
  },
  typingText: {
    fontSize: 12,
    color: '#666',
    marginRight: 10,
  },
  typingDots: {
    flexDirection: 'row',
  },
  dot: {
    fontSize: 8,
    color: '#667eea',
    marginHorizontal: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 15,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  mediaButton: {
    backgroundColor: '#667eea',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  recordingButton: {
    backgroundColor: '#ff4757',
  },
  mediaButtonText: {
    fontSize: 16,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginHorizontal: 5,
    maxHeight: 100,
    fontSize: 14,
  },
  sendButton: {
    backgroundColor: '#48c78e',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 5,
  },
  sendButtonText: {
    fontSize: 16,
  },
  recordingIndicator: {
    backgroundColor: '#ff4757',
    padding: 10,
    alignItems: 'center',
  },
  recordingText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default PrivateChatScreen;
