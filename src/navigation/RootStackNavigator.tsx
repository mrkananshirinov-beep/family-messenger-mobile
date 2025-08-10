import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import MainTabNavigator from './MainTabNavigator';
import ChatScreen from '../screens/ChatScreen';

export type RootStackParamList = {
  MainTabs: undefined;
  Chat: { 
    chatId: string; 
    chatName: string; 
    isGroup?: boolean; 
  };
};

const Stack = createStackNavigator<RootStackParamList>();

const RootStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#667eea',
        },
        headerTintColor: 'white',
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Stack.Screen 
        name="MainTabs" 
        component={MainTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Chat" 
        component={ChatScreen}
        options={({ route }) => ({
          title: route.params.chatName,
          headerBackTitleVisible: false,
        })}
      />
    </Stack.Navigator>
  );
};

export default RootStackNavigator;
