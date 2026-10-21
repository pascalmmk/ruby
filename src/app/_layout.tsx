import { useEffect } from 'react';
import { OfflineStatus } from '@/components/offline-status';
import { registerOfflineWeb } from '@/lib/register-offline';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthGate } from '@/components/auth-gate';
import { NotificationCenter } from '@/components/notification-center';
import { AuthProvider } from '@/lib/auth';
import { ProfileProvider } from '@/lib/profile';

export default function RootLayout() {
  useEffect(() => { registerOfflineWeb(); }, []);
  const colorScheme = useColorScheme();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AuthProvider>
          <AuthGate>
            <ProfileProvider>
              <OfflineStatus />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="list/[id]" />
                <Stack.Screen name="profile" options={{ presentation: 'modal' }} />
              </Stack>
              <NotificationCenter />
            </ProfileProvider>
          </AuthGate>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
