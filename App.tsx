import React from 'react';
import { View, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Providers
import { AuthProvider } from './src/contexts/AuthContext';

// Screens
import TestScreen from './src/screens/TestScreen';
import SimpleAuthScreen from './src/screens/SimpleAuthScreen';
import { useAuth } from './src/contexts/AuthContext';

const Stack = createStackNavigator();

function AppNavigator() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <TestScreen />; // Loading state
  }

  // Always show SimpleAuthScreen for now to test
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Auth" component={SimpleAuthScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <View style={{ flex: 1 }}>
      <SimpleAuthScreen />
    </View>
  );
}
