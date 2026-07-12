import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthGate } from '@/components/auth-gate';
import { NotificationCenter } from '@/components/notification-center';
import { AuthProvider } from '@/lib/auth';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AuthProvider>
          <AuthGate>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="list/[id]" />
            </Stack>
            <NotificationCenter />
          </AuthGate>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
