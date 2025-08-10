import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../contexts/AuthContext';

const AuthScreen: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    name: '', // Changed from fullName to name
    birthday: new Date(1990, 0, 1), // Default to January 1, 1990
    profilePicture: '',
  });

  const { login, register } = useAuth();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    const isWeb = Platform.OS === 'web';
    
    if (isWeb) {
      // For web, get date from input element
      const target = event.target as HTMLInputElement;
      if (target && target.value) {
        const newDate = new Date(target.value);
        setFormData(prev => ({ ...prev, birthday: newDate }));
      }
    } else {
      // For mobile platforms
      setShowDatePicker(false);
      if (selectedDate) {
        setFormData(prev => ({ ...prev, birthday: selectedDate }));
      }
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('İcazə', 'Şəkil seçmək üçün icazə lazımdır');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setFormData(prev => ({ 
          ...prev, 
          profilePicture: result.assets[0].uri 
        }));
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Xəta', 'Şəkil seçərkən xəta baş verdi');
    }
  };

  // Demo Mode Function
  const handleDemoMode = () => {
    console.log('🚀 Demo Mode activated!');
    Alert.alert(
      'Demo Rejimi',
      'Family Messenger demo rejimində açılır!',
      [
        {
          text: 'Davam et',
          onPress: () => {
            // Demo user data
            const demoUser = {
              id: 'demo-user-' + Date.now(),
              username: 'Demo İstifadəçi',
              email: 'demo@family.com',
              name: 'Demo Family User',
              profilePicture: ''
            };
            
            // Set demo user
            // Demo user aktivləşdirmə (burada localStorage və ya AsyncStorage istifadə oluna bilər)
            
            // Bypass authentication
            // Demo user üçün authentication bypass (burada state dəyişə bilər)
            
            console.log('✅ Demo mode authentication completed');
          }
        },
        {
          text: 'Ləğv et',
          style: 'cancel'
        }
      ]
    );
  };

  const handleSubmit = async () => {
    console.log('🔥 SUBMIT FUNCTION CALLED!');
    console.log('Form data:', formData);
    console.log('Is login mode:', isLogin);
    
    if (isLogin) {
      if (!formData.username || !formData.password) {
        console.log('❌ Login validation failed');
        Alert.alert('Xəta', 'Bütün sahələri doldurun');
        return;
      }
    } else {
      if (!formData.username || !formData.password || !formData.name) {
        console.log('❌ Registration validation failed - missing fields');
        Alert.alert('Xəta', 'Bütün sahələri doldurun');
        return;
      }
      
      if (formData.password !== formData.confirmPassword) {
        console.log('❌ Password mismatch');
        Alert.alert('Xəta', 'Parollar uyğun gəlmir');
        return;
      }
      
      if (formData.password.length < 6) {
        console.log('❌ Password too short');
        Alert.alert('Xəta', 'Parol ən azı 6 simvol olmalıdır');
        return;
      }
    }

    console.log('✅ Validation passed, calling auth function...');
    
    setIsLoading(true);
    try {
      if (isLogin) {
        console.log('🔑 Calling login...');
        await login(formData.username, formData.password);
      } else {
        console.log('📝 Calling register...');
        const registerData = {
          username: formData.username,
          password: formData.password,
          name: formData.name,
          birthday: formData.birthday,
          profilePicture: formData.profilePicture,
        };
        console.log('Register data:', registerData);
        await register(registerData);
      }
      console.log('🎉 Authentication successful!');
      // User will be automatically redirected to home screen by App.tsx
    } catch (error: any) {
      console.error('💥 Authentication error:', error);
      Alert.alert('Xəta', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#667eea', '#764ba2']} style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Family Messenger</Text>
            <Text style={styles.subtitle}>
              {isLogin ? 'Xoş gəlmisiniz' : 'Qeydiyyatdan keçin'}
            </Text>
            <Text style={{ color: 'white', fontSize: 14, marginTop: 10 }}>
              🔍 DEBUG: AuthScreen yükləndi ✅
            </Text>
          </View>

          <View style={styles.formContainer}>
            {/* Demo Mode Button - EN YUXARIDA */}
            <TouchableOpacity 
              style={[styles.submitButton, styles.demoButton]}
              onPress={handleDemoMode}
            >
              <Text style={styles.submitButtonText}>
                🚀 Demo Rejimi
              </Text>
            </TouchableOpacity>

            {!isLogin && (
              <>
                {/* Profile Picture */}
                <TouchableOpacity style={styles.imageContainer} onPress={pickImage}>
                  {formData.profilePicture ? (
                    <Image source={{ uri: formData.profilePicture }} style={styles.profileImage} />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Ionicons name="camera" size={40} color="#667eea" />
                      <Text style={styles.imageText}>Profil şəkli</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Full Name */}
                <View style={styles.inputContainer}>
                  <Ionicons name="person" size={20} color="#667eea" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Ad və Soyad"
                    value={formData.name}
                    onChangeText={(text) => handleInputChange('name', text)}
                    placeholderTextColor="#999"
                  />
                </View>

                {/* Birthday */}
                {Platform.OS === 'web' ? (
                  <View style={styles.inputContainer}>
                    <Ionicons name="calendar" size={20} color="#667eea" style={styles.inputIcon} />
                    <input
                      type="date"
                      value={formData.birthday.toISOString().split('T')[0]}
                      onChange={handleDateChange}
                      style={{
                        flex: 1,
                        fontSize: 16,
                        color: '#333',
                        border: 'none',
                        outline: 'none',
                        backgroundColor: 'transparent',
                        padding: 4,
                        width: '100%',
                        fontFamily: 'inherit',
                      }}
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </View>
                ) : (
                  <>
                    <TouchableOpacity 
                      style={styles.inputContainer} 
                      onPress={() => setShowDatePicker(true)}
                    >
                      <Ionicons name="calendar" size={20} color="#667eea" style={styles.inputIcon} />
                      <Text style={styles.dateText}>
                        {formData.birthday.toLocaleDateString('az-AZ')}
                      </Text>
                    </TouchableOpacity>

                    {showDatePicker && (
                      <DateTimePicker
                        value={formData.birthday}
                        mode="date"
                        display="default"
                        onChange={handleDateChange}
                        maximumDate={new Date()}
                      />
                    )}
                  </>
                )}
              </>
            )}

            {/* Username */}
            <View style={styles.inputContainer}>
              <Ionicons name="at" size={20} color="#667eea" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="İstifadəçi adı"
                value={formData.username}
                onChangeText={(text) => handleInputChange('username', text)}
                autoCapitalize="none"
                placeholderTextColor="#999"
              />
            </View>

            {/* Password */}
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed" size={20} color="#667eea" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Parol"
                value={formData.password}
                onChangeText={(text) => handleInputChange('password', text)}
                secureTextEntry={!showPassword}
                placeholderTextColor="#999"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons 
                  name={showPassword ? "eye-off" : "eye"} 
                  size={20} 
                  color="#667eea" 
                />
              </TouchableOpacity>
            </View>

            {/* Confirm Password - Only show in registration mode */}
            {!isLogin && (
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed" size={20} color="#667eea" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Parolun təkrarı"
                  value={formData.confirmPassword}
                  onChangeText={(text) => handleInputChange('confirmPassword', text)}
                  secureTextEntry={!showPassword}
                  placeholderTextColor="#999"
                />
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity 
              style={[styles.submitButton, isLoading && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              <Text style={styles.submitButtonText}>
                {isLoading ? 'Gözləyin...' : (isLogin ? 'Daxil ol' : 'Qeydiyyat')}
              </Text>
            </TouchableOpacity>

            {/* Switch Mode */}
            <TouchableOpacity 
              style={styles.switchButton}
              onPress={() => setIsLogin(!isLogin)}
            >
              <Text style={styles.switchButtonText}>
                {isLogin ? 'Hesabınız yoxdur? Qeydiyyatdan keçin' : 'Hesabınız var? Daxil olun'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  imageContainer: {
    alignSelf: 'center',
    marginBottom: 20,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  imagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#667eea',
    borderStyle: 'dashed',
  },
  imageText: {
    color: '#667eea',
    fontSize: 12,
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    backgroundColor: '#fafafa',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  dateText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  submitButton: {
    backgroundColor: '#667eea',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  demoButton: {
    backgroundColor: '#ff6b6b',
    marginTop: 0,
    marginBottom: 24,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  switchButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  switchButtonText: {
    color: '#667eea',
    fontSize: 14,
  },
});

export default AuthScreen;