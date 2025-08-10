import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Screens
import HomeScreen from '../screens/HomeScreen';
import ChatListScreen from '../screens/ChatListScreen';
// import AlbumScreen from '../screens/AlbumScreen'; // Temporarily disabled due to syntax errors
import ProfileScreen from '../screens/ProfileScreenTemp';

const Tab = createBottomTabNavigator();

const MainTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Ana Səhifə') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Çatlar') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Album') {
            iconName = focused ? 'images' : 'images-outline';
          } else if (route.name === 'Profil') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'home-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#667eea',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#eee',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        headerStyle: {
          backgroundColor: '#667eea',
        },
        headerTintColor: 'white',
        headerTitleStyle: {
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen 
        name="Ana Səhifə" 
        component={HomeScreen}
        options={{
          title: 'Family Messenger',
        }}
      />
      <Tab.Screen 
        name="Çatlar" 
        component={ChatListScreen}
        options={{
          title: 'Çatlar',
        }}
      />
      <Tab.Screen 
        name="Album" 
        component={HomeScreen}
        options={{
          title: 'Aile Albumu (Təmir edilir)',
        }}
      />
      <Tab.Screen 
        name="Profil" 
        component={ProfileScreen}
        options={{
          title: 'Profil',
        }}
      />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;
