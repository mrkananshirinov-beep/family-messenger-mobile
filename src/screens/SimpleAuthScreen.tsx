import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import SimpleChatListScreen from './SimpleChatListScreen';

const SimpleAuthScreen: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const handleLogin = async () => {
    Alert.alert('Test Login', `Username: ${username}\nPassword length: ${password.length}`);
    
    if (!username.trim() || !password.trim()) {
      Alert.alert('Xəta', 'İstifadəçi adı və şifrə daxil edin');
      return;
    }

    setIsLoading(true);
    try {
      console.log('🔐 Starting simple login test...');
      
      // Simple localStorage test for web
      if (Platform.OS === 'web') {
        const storedUsers = JSON.parse(localStorage.getItem('simple_users') || '[]');
        console.log('📋 Found users:', storedUsers);
        
        const user = storedUsers.find((u: any) => 
          u.username === username.trim() && u.password === password.trim()
        );

        if (user) {
          Alert.alert('✅ Giriş Uğurlu!', `Xoş gəldiniz, ${user.name}!`);
          console.log('🎉 Login successful:', user);
          
          // Set current user and go to chat screen
          setCurrentUser(user);
          setUsername('');
          setPassword('');
        } else {
          Alert.alert('❌ Xəta', 'İstifadəçi adı və ya şifrə yanlışdır');
        }
      } else {
        // Mobile platform - use SecureStore instead of localStorage
        const storedUsersJson = await SecurityManager.getToken('simple_users');
        const storedUsers = storedUsersJson ? JSON.parse(storedUsersJson) : [];
        console.log('📋 Found users in SecureStore:', storedUsers.length);
        
        const user = storedUsers.find((u: any) => 
          u.username === username.trim() && u.password === password.trim()
        );

        if (user) {
          Alert.alert('✅ Giriş Uğurlu!', `Xoş gəldiniz, ${user.name}!`);
          console.log('🎉 Mobile login successful:', user);
          
          // Set current user and go to chat screen
          setCurrentUser(user);
          setUsername('');
          setPassword('');
        } else {
          Alert.alert('❌ Xəta', 'İstifadəçi adı və ya şifrə yanlışdır');
        }
      }
      
    } catch (error) {
      console.error('❌ Login error:', error);
      Alert.alert('❌ Xəta', 'Giriş zamanı xəta: ' + error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    Alert.alert('Test', `Qeydiyyat düyməsi işləyir!\nUsername: ${username}\nName: ${name}`);
    
    if (!username.trim() || !password.trim() || !name.trim()) {
      Alert.alert('Xəta', 'Bütün sahələri doldurun');
      return;
    }

    setIsLoading(true);
    try {
      console.log('🔍 Starting registration process...');
      
      // Simple registration test
      const newUser = {
        id: `user_${Date.now()}`,
        username: username.trim(),
        name: name.trim(),
        password: password.trim(),
        createdAt: new Date().toISOString(),
      };

      console.log('👤 New user created:', newUser);
      
      // Store in localStorage for web
      if (Platform.OS === 'web') {
        const existingUsers = JSON.parse(localStorage.getItem('simple_users') || '[]');
        existingUsers.push(newUser);
        localStorage.setItem('simple_users', JSON.stringify(existingUsers));
        console.log('💾 User saved to localStorage');
      }

      Alert.alert('✅ Uğurlu!', `${newUser.name}, qeydiyyatınız tamamlandı!`);
      
      // Clear form and switch to login
      setUsername('');
      setPassword('');
      setName('');
      setIsRegister(false);
      
    } catch (error) {
      console.error('❌ Registration error:', error);
      Alert.alert('❌ Xəta', 'Qeydiyyat zamanı xəta: ' + error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setUsername('');
    setPassword('');
    setName('');
    setIsRegister(false);
    Alert.alert('👋 Çıxış', 'Uğurla çıxış etdiniz!');
  };

  // If user is logged in, show chat screen
  if (currentUser) {
    return (
      <SimpleChatListScreen 
        user={currentUser} 
        onLogout={handleLogout}
      />
    );
  }

  // Otherwise show login/register screen
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Family Messenger</Text>
      <Text style={styles.subtitle}>
        {isRegister ? '📝 Qeydiyyat' : '🔐 Daxil ol'}
      </Text>
      
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="İstifadəçi adı"
          value={username}
          onChangeText={setUsername}
          placeholderTextColor="#999"
          autoCapitalize="none"
        />
        
        <TextInput
          style={styles.input}
          placeholder="Şifrə"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholderTextColor="#999"
        />
        
        {isRegister && (
          <TextInput
            style={styles.input}
            placeholder="Ad və Soyad"
            value={name}
            onChangeText={setName}
            placeholderTextColor="#999"
          />
        )}
        
        <TouchableOpacity 
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={isRegister ? handleRegister : handleLogin}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? '⏳ Gözləyin...' : (isRegister ? 'Qeydiyyat' : 'Daxil ol')}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.switchButton]}
          onPress={() => setIsRegister(!isRegister)}
        >
          <Text style={styles.buttonText}>
            {isRegister ? 'Artıq hesabınız var?' : 'Hesabınız yoxdur?'}
          </Text>
        </TouchableOpacity>
        
        <Text style={styles.debugText}>
          🔍 DEBUG: Real qeydiyyat sistemi aktiv ✅
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#667eea',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: 'white',
    marginBottom: 40,
  },
  form: {
    width: '100%',
    maxWidth: 300,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonDisabled: {
    backgroundColor: '#cccccc',
  },
  switchButton: {
    backgroundColor: '#2196F3',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  debugText: {
    color: 'white',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 20,
    opacity: 0.7,
  },
});

export default SimpleAuthScreen;
