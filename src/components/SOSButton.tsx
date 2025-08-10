import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  Vibration,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import GlobalStorageManager from '../utils/GlobalStorage';

const SOSButton: React.FC = () => {
  const [isPressed, setIsPressed] = useState(false);
  const [animation] = useState(new Animated.Value(1));
  const { user } = useAuth();

  const handleSOSPress = () => {
    Alert.alert(
      '🆘 TƏCİLİ YARDIM',
      'Bu düyməni basaraq bütün aile üzvlərinə təcili yardım siqnalı göndərəcəksiniz. Davam etmək istəyirsiniz?',
      [
        {
          text: 'Ləğv et',
          style: 'cancel',
        },
        {
          text: 'TƏCİLİ YARDIM GÖNDƏR',
          style: 'destructive',
          onPress: sendSOSAlert,
        },
      ]
    );
  };

  const sendSOSAlert = async () => {
    try {
      console.log('🆘 Sending real SOS alert...');
      setIsPressed(true);

      if (!user) {
        Alert.alert('Xəta', 'İstifadəçi məlumatı tapılmadı');
        return;
      }

      // Get current location
      let location = null;
      let locationText = '📍 Məkan məlumatı əldə edilmədi';
      
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const currentLocation = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          
          location = {
            latitude: currentLocation.coords.latitude,
            longitude: currentLocation.coords.longitude,
            accuracy: currentLocation.coords.accuracy,
            timestamp: new Date().toISOString(),
          };

          locationText = `📍 Lat: ${location.latitude.toFixed(6)}, Lng: ${location.longitude.toFixed(6)}`;
          
          // Try to get address
          try {
            const reverseGeocode = await Location.reverseGeocodeAsync({
              latitude: location.latitude,
              longitude: location.longitude,
            });
            
            if (reverseGeocode.length > 0) {
              const address = reverseGeocode[0];
              const fullAddress = [
                address.name,
                address.street,
                address.district,
                address.city,
                address.region,
              ].filter(Boolean).join(', ');
              
              if (fullAddress) {
                locationText = `📍 ${fullAddress}`;
              }
            }
          } catch (geocodeError) {
            console.error('❌ Geocoding error:', geocodeError);
          }
          
          console.log('📍 Location obtained:', location);
        } else {
          console.log('⚠️ Location permission denied');
        }
      } catch (locationError) {
        console.error('❌ Location error:', locationError);
      }

      // Create SOS message with real data
      const sosMessage = {
        id: `sos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'SOS_ALERT',
        sender: {
          id: user.id,
          name: user.name,
          username: user.username,
          profilePicture: user.profilePicture,
        },
        location: location,
        locationText: locationText,
        timestamp: new Date().toISOString(),
        message: `🆘 ${user.name} tərəfindən TƏCİLİ YARDIM siqnalı!`,
        urgency: 'HIGH',
        isEmergency: true,
        deviceType: Platform.OS,
      };

      // Get all family members for notification
      const globalStorage = GlobalStorageManager.getInstance();
      const allUsers = await globalStorage.getAllUsers();
      const familyMembers = allUsers.filter(u => u.id !== user.id && u.isOnline);
      
      console.log('👥 Active family members to notify:', familyMembers.length);

      // Store SOS alert in global storage for cross-platform access
      let sosAlerts = [];
      try {
        if (Platform.OS === 'web') {
          sosAlerts = JSON.parse(localStorage.getItem('global_sos_alerts') || '[]');
        } else {
          sosAlerts = JSON.parse(await AsyncStorage.getItem('global_sos_alerts') || '[]');
        }
      } catch (parseError) {
        console.error('❌ Error parsing existing SOS alerts:', parseError);
        sosAlerts = [];
      }
      
      sosAlerts.unshift(sosMessage);
      
      // Keep only last 50 SOS alerts
      sosAlerts = sosAlerts.slice(0, 50);
      
      try {
        if (Platform.OS === 'web') {
          localStorage.setItem('global_sos_alerts', JSON.stringify(sosAlerts));
        } else {
          await AsyncStorage.setItem('global_sos_alerts', JSON.stringify(sosAlerts));
        }
        console.log('✅ SOS alert stored in global storage');
      } catch (storageError) {
        console.error('❌ Error storing SOS alert:', storageError);
      }

      // Strong haptic feedback and vibration for emergency
      try {
        if (Platform.OS !== 'web') {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          
          // Emergency vibration pattern: 3 long vibrations
          Vibration.vibrate([0, 1000, 500, 1000, 500, 1000]);
        }
      } catch (hapticError) {
        console.error('❌ Haptic feedback error:', hapticError);
      }

      // Visual feedback animation
      Animated.sequence([
        Animated.timing(animation, {
          toValue: 1.3,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(animation, {
          toValue: 0.9,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(animation, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Show comprehensive success message
      const timestamp = new Date().toLocaleString('az-AZ', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      Alert.alert(
        '✅ TƏCİLİ YARDIM SİQNALI GÖNDƏRİLDİ',
        `🆘 SOS siqnalınız uğurla göndərildi!\n\n` +
        `👤 Göndərən: ${user.name}\n` +
        `⏰ Zaman: ${timestamp}\n` +
        `${locationText}\n\n` +
        `👥 Bildiriş göndərilən üzvlər: ${familyMembers.length} nəfər\n\n` +
        `💡 Ailə üzvləri bu təcili yardım mesajını chat siyahısında görəcəklər.`,
        [
          {
            text: 'Bağla',
            style: 'default',
          },
        ]
      );

      console.log('✅ SOS alert sent successfully');
      console.log('📊 SOS Message:', sosMessage);

    } catch (error) {
      console.error('❌ Error sending SOS alert:', error);
      Alert.alert(
        'Xəta',
        'SOS siqnalı göndərilə bilmədi. Zəhmət olmasa yenidən cəhd edin.\n\nXəta: ' + 
        (error instanceof Error ? error.message : 'Naməlum xəta')
      );
    } finally {
      setIsPressed(false);
    }
  };

  if (!user) {
    return null; // Don't show SOS button if user is not logged in
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={handleSOSPress}
        disabled={isPressed}
        activeOpacity={0.8}
      >
        <Animated.View style={[styles.buttonContainer, { transform: [{ scale: animation }] }]}>
          <LinearGradient
            colors={isPressed ? ['#8B0000', '#FF0000'] : ['#FF0000', '#8B0000']}
            style={styles.gradientButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="warning" size={40} color="white" />
            <Text style={styles.buttonText}>SOS</Text>
            <Text style={styles.subText}>TƏCİLİ YARDIM</Text>
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
      
      <Text style={styles.infoText}>
        Təcili vəziyyətdə basın{'\n'}
        Bütün ailə üzvlərinə bildiriş göndəriləcək
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 20,
  },
  buttonContainer: {
    marginBottom: 10,
  },
  gradientButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#FF0000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderWidth: 3,
    borderColor: 'white',
  },
  buttonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 5,
  },
  subText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
  },
  infoText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
    maxWidth: 200,
  },
});

export default SOSButton;
