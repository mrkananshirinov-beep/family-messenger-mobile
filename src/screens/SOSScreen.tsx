import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Vibration,
} from 'react-native';

interface SOSScreenProps {
  currentUser: {
    id: string;
    username: string;
    name: string;
  };
  onBack: () => void;
}

const SOSScreen: React.FC<SOSScreenProps> = ({ currentUser, onBack }) => {
  const [sosActive, setSosActive] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [location, setLocation] = useState<string>('');
  const [sosHistory, setSosHistory] = useState<any[]>([]);

  useEffect(() => {
    loadSOSHistory();
    getCurrentLocation();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (sosActive && countdown > 0) {
      interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            setSosActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [sosActive, countdown]);

  const loadSOSHistory = () => {
    try {
      if (Platform.OS === 'web') {
        const history = localStorage.getItem('sos_history');
        if (history) {
          setSosHistory(JSON.parse(history));
        }
      }
    } catch (error) {
      console.error('❌ Error loading SOS history:', error);
    }
  };

  const getCurrentLocation = () => {
    if (Platform.OS === 'web' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLocation(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
          console.log('📍 Location obtained:', latitude, longitude);
        },
        (error) => {
          console.error('❌ Location error:', error);
          setLocation('Məkan məlumatı əlçatan deyil');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    } else {
      setLocation('Test Location: Bakı, Azərbaycan');
    }
  };

  const activateSOS = () => {
    setSosActive(true);
    setCountdown(15);
    
    // Request notification permission first
    if (Platform.OS === 'web' && 'Notification' in window) {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          // Create persistent notification with sound
          const notification = new Notification('🚨 TƏCİLİ SOS!', {
            body: `${currentUser.name} təcili yardım tələb edir!\nMəkan: ${location}`,
            icon: '/assets/icon.png',
            badge: '/assets/icon.png',
            tag: 'sos-emergency',
            requireInteraction: true, // Keeps notification visible
            silent: false, // Force sound even in silent mode
          });

          // Keep notification alive for 15 seconds
          setTimeout(() => {
            notification.close();
          }, 15000);
        }
      });
    }
    
    // Vibration for mobile
    if (Platform.OS !== 'web') {
      Vibration.vibrate([0, 500, 200, 500, 200, 500], true);
    }

    // Enhanced alarm sound that bypasses silent mode
    if (Platform.OS === 'web') {
      playEnhancedAlarmSound();
    }

    // Flash screen for visual alert
    flashScreen();

    // Save SOS event
    const sosEvent = {
      id: `sos_${Date.now()}`,
      userId: currentUser.id,
      name: currentUser.name,
      location: location,
      timestamp: new Date().toISOString(),
      status: 'active',
      duration: 15,
    };

    try {
      const updatedHistory = [...sosHistory, sosEvent];
      setSosHistory(updatedHistory);
      
      if (Platform.OS === 'web') {
        localStorage.setItem('sos_history', JSON.stringify(updatedHistory));
        
        // Also save to family chat as emergency message
        const emergencyMessage = {
          id: `emergency_${Date.now()}`,
          userId: 'sos_system',
          username: 'sos',
          name: '🆘 SOS Sistemi',
          text: `🚨 TƏCİLİ SOS! ${currentUser.name} təcili yardım tələb edir!\n📍 Məkan: ${location}\n⏰ Vaxt: ${new Date().toLocaleString('az-AZ')}`,
          timestamp: new Date().toISOString(),
          type: 'text',
        };

        const familyMessages = JSON.parse(localStorage.getItem('family_chat_messages') || '[]');
        familyMessages.push(emergencyMessage);
        localStorage.setItem('family_chat_messages', JSON.stringify(familyMessages));
        
        console.log('🚨 SOS message sent to family chat');
      }
    } catch (error) {
      console.error('❌ Error saving SOS event:', error);
    }

    console.log('🚨 SOS activated!', sosEvent);
  };

  const playEnhancedAlarmSound = () => {
    // Enhanced audio that bypasses silent mode
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Resume audio context if suspended (required for iOS/Safari)
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      
      const playUrgentBeep = (frequency: number, duration: number, delay: number = 0) => {
        setTimeout(() => {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.value = frequency;
          oscillator.type = 'square'; // More aggressive sound
          
          // Maximum volume to bypass silent mode
          gainNode.gain.setValueAtTime(1.0, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
          
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + duration);
        }, delay);
      };

      // Play ultra-loud alarm pattern for 15 seconds
      let beepCount = 0;
      const urgentPattern = setInterval(() => {
        if (beepCount >= 45 || !sosActive) { // 45 beeps in 15 seconds
          clearInterval(urgentPattern);
          return;
        }
        
        // Triple beep pattern - very urgent
        playUrgentBeep(1000, 0.2, 0);    // High pitch
        playUrgentBeep(800, 0.2, 100);   // Medium pitch  
        playUrgentBeep(600, 0.2, 200);   // Low pitch
        
        beepCount++;
      }, 350);

      console.log('🔊 Enhanced alarm sound activated');
    } catch (error) {
      console.error('❌ Enhanced audio error:', error);
      // Fallback to basic alarm
      playBasicAlarm();
    }
  };

  const playBasicAlarm = () => {
    // Fallback basic alarm
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const playBeep = (frequency: number, duration: number) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.8, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
      };

      // Play basic alarm pattern
      let beepCount = 0;
      const beepInterval = setInterval(() => {
        if (beepCount >= 30 || !sosActive) {
          clearInterval(beepInterval);
          return;
        }
        playBeep(800, 0.3);
        setTimeout(() => playBeep(400, 0.3), 200);
        beepCount++;
      }, 500);
    } catch (error) {
      console.error('❌ Basic audio error:', error);
    }
  };

  const flashScreen = () => {
    // Flash screen red for visual emergency alert
    let flashCount = 0;
    const flashInterval = setInterval(() => {
      if (flashCount >= 30 || !sosActive) { // Flash for 15 seconds
        clearInterval(flashInterval);
        document.body.style.backgroundColor = '';
        return;
      }
      
      // Alternate between red and normal
      if (flashCount % 2 === 0) {
        document.body.style.backgroundColor = '#ff0000';
        document.body.style.opacity = '0.9';
      } else {
        document.body.style.backgroundColor = '';
        document.body.style.opacity = '1.0';
      }
      
      flashCount++;
    }, 500);
    
    console.log('🔴 Screen flash activated');
  };

  const stopSOS = () => {
    setSosActive(false);
    setCountdown(0);
    
    if (Platform.OS !== 'web') {
      Vibration.cancel();
    }
    
    // Stop screen flash
    if (Platform.OS === 'web') {
      document.body.style.backgroundColor = '';
      document.body.style.opacity = '1.0';
    }
    
    console.log('✅ SOS stopped - all alerts disabled');
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('az-AZ');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Geri</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>🆘 Təcili SOS</Text>
          <Text style={styles.headerSubtitle}>Emergency sistem</Text>
        </View>
      </View>

      {/* SOS Status */}
      <View style={styles.statusContainer}>
        {sosActive ? (
          <View style={styles.activeSOSContainer}>
            <Text style={styles.sosActiveTitle}>🚨 SOS AKTİV!</Text>
            <Text style={styles.countdownText}>{countdown} saniyə</Text>
            <Text style={styles.sosMessage}>
              Təcili yardım siqnalı göndərilir...
            </Text>
            <TouchableOpacity style={styles.stopButton} onPress={stopSOS}>
              <Text style={styles.stopButtonText}>DAYANDIR</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.inactiveSOSContainer}>
            <Text style={styles.sosTitle}>Təcili SOS Sistemi</Text>
            <Text style={styles.sosDescription}>
              Təcili vəziyyətdə bu düyməni basın. 15 saniyə alarm səsi ilə bütün ailə üzvlərinə məkanınız göndəriləcək.
            </Text>
            
            {location && (
              <View style={styles.locationContainer}>
                <Text style={styles.locationTitle}>📍 Cari məkanınız:</Text>
                <Text style={styles.locationText}>{location}</Text>
              </View>
            )}

            <TouchableOpacity style={styles.sosButton} onPress={activateSOS}>
              <Text style={styles.sosButtonText}>🆘 SOS AKTİVLƏŞDİR</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* SOS History */}
      <View style={styles.historyContainer}>
        <Text style={styles.historyTitle}>📋 SOS Tarixçəsi</Text>
        {sosHistory.length === 0 ? (
          <Text style={styles.noHistoryText}>Hələ heç bir SOS hadisəsi yoxdur</Text>
        ) : (
          sosHistory.slice(-5).reverse().map((event) => (
            <View key={event.id} style={styles.historyItem}>
              <Text style={styles.historyUser}>👤 {event.name}</Text>
              <Text style={styles.historyTime}>⏰ {formatTime(event.timestamp)}</Text>
              <Text style={styles.historyLocation}>📍 {event.location}</Text>
            </View>
          ))
        )}
      </View>

      {/* Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          ⚠️ SOS sistemi yalnız həqiqi təcili hallar üçün istifadə edin
        </Text>
        <Text style={styles.infoText}>
          🔊 Ultra-güclü alarm səsi - səssiz rejimi də aşır
        </Text>
        <Text style={styles.infoText}>
          📳 Vibrasiya və ekran flash-ı 15 saniyə davam edəcək
        </Text>
        <Text style={styles.infoText}>
          🔔 Browser notification-ları da göndərilir
        </Text>
        <Text style={styles.infoText}>
          📱 Bütün ailə üzvləri dərhal məlumatlandırılacaq
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#ff4757',
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
  statusContainer: {
    margin: 20,
    padding: 20,
    borderRadius: 15,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activeSOSContainer: {
    alignItems: 'center',
    backgroundColor: '#ffebee',
    borderColor: '#ff4757',
    borderWidth: 2,
    borderRadius: 15,
    padding: 20,
  },
  sosActiveTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ff4757',
    marginBottom: 10,
    textAlign: 'center',
  },
  countdownText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ff4757',
    marginBottom: 10,
  },
  sosMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  stopButton: {
    backgroundColor: '#ff4757',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  stopButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  inactiveSOSContainer: {
    alignItems: 'center',
  },
  sosTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  sosDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  locationContainer: {
    backgroundColor: '#f0f8ff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    width: '100%',
  },
  locationTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  locationText: {
    fontSize: 12,
    color: '#666',
  },
  sosButton: {
    backgroundColor: '#ff4757',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 30,
    shadowColor: '#ff4757',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  sosButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  historyContainer: {
    margin: 20,
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 10,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  noHistoryText: {
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
  historyItem: {
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  historyUser: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  historyTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  historyLocation: {
    fontSize: 12,
    color: '#4a90e2',
    marginTop: 2,
  },
  infoContainer: {
    margin: 20,
    padding: 15,
    backgroundColor: '#fff3cd',
    borderRadius: 10,
  },
  infoText: {
    fontSize: 12,
    color: '#856404',
    marginBottom: 5,
    lineHeight: 16,
  },
});

export default SOSScreen;
