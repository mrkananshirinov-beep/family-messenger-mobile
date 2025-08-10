import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';

interface Message {
  id: string;
  userId: string;
  username: string;
  name: string;
  text: string;
  timestamp: string;
  type: 'text' | 'image' | 'file';
}

interface FamilyChatScreenProps {
  currentUser: {
    id: string;
    username: string;
    name: string;
  };
  onBack: () => void;
}

const FamilyChatScreen: React.FC<FamilyChatScreenProps> = ({ currentUser, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Load messages from localStorage on component mount
  useEffect(() => {
    loadMessages();
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = () => {
    try {
      if (Platform.OS === 'web') {
        const storedMessages = localStorage.getItem('family_chat_messages');
        if (storedMessages) {
          const parsedMessages = JSON.parse(storedMessages);
          setMessages(parsedMessages);
          console.log('📨 Loaded messages:', parsedMessages.length);
        } else {
          // Add welcome message if no messages exist
          const welcomeMessage: Message = {
            id: 'welcome_' + Date.now(),
            userId: 'system',
            username: 'system',
            name: 'Family Messenger',
            text: '👨‍👩‍👧‍👦 Ailə qrupuna xoş gəlmisiniz! Burada ailənizdəki hər kəslə söhbət edə bilərsiniz.',
            timestamp: new Date().toISOString(),
            type: 'text',
          };
          setMessages([welcomeMessage]);
          if (Platform.OS === 'web') {
            localStorage.setItem('family_chat_messages', JSON.stringify([welcomeMessage]));
          }
        }
      }
    } catch (error) {
      console.error('❌ Error loading messages:', error);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const sendMessage = () => {
    if (!newMessage.trim()) return;

    setIsLoading(true);
    
    const message: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: currentUser.id,
      username: currentUser.username,
      name: currentUser.name,
      text: newMessage.trim(),
      timestamp: new Date().toISOString(),
      type: 'text',
    };

    console.log('📤 Sending message:', message);

    try {
      const updatedMessages = [...messages, message];
      setMessages(updatedMessages);
      
      // Save to localStorage
      if (Platform.OS === 'web') {
        localStorage.setItem('family_chat_messages', JSON.stringify(updatedMessages));
        console.log('💾 Message saved to localStorage');
      }

      setNewMessage('');
      
      // Show success feedback
      if (Platform.OS === 'web') {
        console.log('✅ Message sent successfully!');
      }
      
    } catch (error) {
      console.error('❌ Error sending message:', error);
      if (Platform.OS === 'web') {
        window.alert('❌ Xəta: Mesaj göndərilmədi');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('az-AZ', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    
    if (date.toDateString() === today.toDateString()) {
      return 'Bugün';
    }
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Dünən';
    }
    
    return date.toLocaleDateString('az-AZ');
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Geri</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>👨‍👩‍👧‍👦 Ailə Qrupu</Text>
          <Text style={styles.headerSubtitle}>
            {messages.length > 1 ? `${messages.length - 1} mesaj` : 'Yeni söhbət'}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.onlineStatus}>🟢 Online</Text>
        </View>
      </View>

      {/* Messages */}
      <ScrollView 
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
      >
        {messages.map((message, index) => {
          const isOwnMessage = message.userId === currentUser.id;
          const isSystemMessage = message.userId === 'system';
          const showDate = index === 0 || 
            formatDate(message.timestamp) !== formatDate(messages[index - 1].timestamp);

          return (
            <View key={message.id}>
              {showDate && (
                <View style={styles.dateSeparator}>
                  <Text style={styles.dateText}>{formatDate(message.timestamp)}</Text>
                </View>
              )}
              
              <View style={[
                styles.messageContainer,
                isOwnMessage ? styles.ownMessage : styles.otherMessage,
                isSystemMessage && styles.systemMessage
              ]}>
                {!isOwnMessage && !isSystemMessage && (
                  <Text style={styles.senderName}>{message.name}</Text>
                )}
                <Text style={[
                  styles.messageText,
                  isSystemMessage && styles.systemMessageText
                ]}>
                  {message.text}
                </Text>
                <Text style={styles.messageTime}>
                  {formatTime(message.timestamp)}
                  {isOwnMessage && <Text style={styles.messageStatus}> ✓</Text>}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Message Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder="Mesajınızı yazın..."
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
          maxLength={1000}
          placeholderTextColor="#999"
          onSubmitEditing={sendMessage}
        />
        <TouchableOpacity 
          style={[styles.sendButton, (!newMessage.trim() || isLoading) && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!newMessage.trim() || isLoading}
        >
          <Text style={styles.sendButtonText}>
            {isLoading ? '⏳' : '📤'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Debug Info */}
      <View style={styles.debugInfo}>
        <Text style={styles.debugText}>
          👤 {currentUser.name} | 📨 {messages.length} mesaj | 🔄 Real-time chat aktiv
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  header: {
    backgroundColor: '#667eea',
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
  headerRight: {
    alignItems: 'flex-end',
  },
  onlineStatus: {
    color: 'white',
    fontSize: 12,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  messagesContent: {
    padding: 10,
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: 10,
  },
  dateText: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    color: '#666',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
  },
  messageContainer: {
    marginVertical: 2,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    maxWidth: '80%',
  },
  ownMessage: {
    backgroundColor: '#667eea',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  otherMessage: {
    backgroundColor: 'white',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  systemMessage: {
    backgroundColor: '#e8f4fd',
    alignSelf: 'center',
    maxWidth: '90%',
  },
  senderName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#667eea',
    marginBottom: 2,
  },
  messageText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 20,
  },
  systemMessageText: {
    color: '#4a90e2',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  messageTime: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
    textAlign: 'right',
  },
  messageStatus: {
    color: '#4caf50',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 10,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#667eea',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    fontSize: 18,
  },
  debugInfo: {
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    padding: 8,
  },
  debugText: {
    textAlign: 'center',
    fontSize: 10,
    color: '#667eea',
  },
});

export default FamilyChatScreen;
