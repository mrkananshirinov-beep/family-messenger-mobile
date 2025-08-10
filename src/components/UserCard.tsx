import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';

interface User {
  id: string;
  username: string;
  fullName: string;
  profilePicture?: string;
  isOnline: boolean;
  lastSeen: string;
  birthday: string;
}

interface UserCardProps {
  user: User;
  onPress: () => void;
}

const UserCard: React.FC<UserCardProps> = ({ user, onPress }) => {
  const getLastSeenText = () => {
    if (user.isOnline) {
      return 'Online';
    }
    
    const lastSeen = moment(user.lastSeen);
    const now = moment();
    const diffMinutes = now.diff(lastSeen, 'minutes');
    
    if (diffMinutes < 1) {
      return 'Indicə';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} dəqiqə əvvəl`;
    } else if (diffMinutes < 1440) {
      const hours = Math.floor(diffMinutes / 60);
      return `${hours} saat əvvəl`;
    } else {
      return lastSeen.format('DD.MM.YYYY');
    }
  };

  const isBirthdayToday = () => {
    const today = moment();
    const birthday = moment(user.birthday);
    return today.format('DD-MM') === birthday.format('DD-MM');
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.content}>
        {/* Profile Picture */}
        <View style={styles.avatarContainer}>
          {user.profilePicture ? (
            <Image source={{ uri: user.profilePicture }} style={styles.avatar} />
          ) : (
            <View style={styles.defaultAvatar}>
              <Text style={styles.avatarText}>
                {user.fullName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          
          {/* Online indicator */}
          <View style={[
            styles.onlineIndicator,
            { backgroundColor: user.isOnline ? '#4ade80' : '#94a3b8' }
          ]} />
        </View>

        {/* User Info */}
        <View style={styles.userInfo}>
          <View style={styles.nameContainer}>
            <Text style={styles.fullName}>{user.fullName}</Text>
            {isBirthdayToday() && (
              <Ionicons name="gift" size={16} color="#f59e0b" style={styles.birthdayIcon} />
            )}
          </View>
          <Text style={styles.username}>@{user.username}</Text>
          <Text style={[
            styles.lastSeen,
            { color: user.isOnline ? '#4ade80' : '#6b7280' }
          ]}>
            {getLastSeenText()}
          </Text>
        </View>

        {/* Action Icons */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="chatbubble-outline" size={20} color="#667eea" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="call-outline" size={20} color="#10b981" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="videocam-outline" size={20} color="#f59e0b" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Birthday Banner */}
      {isBirthdayToday() && (
        <View style={styles.birthdayBanner}>
          <Ionicons name="gift" size={16} color="white" />
          <Text style={styles.birthdayText}>Bugün doğum günüdür! 🎂</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  content: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  defaultAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
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
  userInfo: {
    flex: 1,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fullName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  birthdayIcon: {
    marginLeft: 6,
  },
  username: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  lastSeen: {
    fontSize: 12,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
  },
  birthdayBanner: {
    backgroundColor: '#f59e0b',
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  birthdayText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
});

export default UserCard;
