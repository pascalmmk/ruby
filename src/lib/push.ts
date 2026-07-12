import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Alert, Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

// Show notifications as a banner even when the app is in the foreground.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Register this device's Expo push token for the signed-in user, so the database
 * trigger can deliver notifications to it. No-op on web, simulators, and Expo Go
 * (getExpoPushTokenAsync requires a development/production build).
 */
export async function registerPushToken(userId: string): Promise<void> {
  try {
    if (Platform.OS === 'web' || !Device.isDevice) return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('list-updates', {
        name: 'List updates',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    let granted = (await Notifications.getPermissionsAsync()).granted;
    if (!granted) granted = (await Notifications.requestPermissionsAsync()).granted;
    if (!granted) {
      Alert.alert('Ruby diagnostics', 'Notification permission NOT granted.');
      return;
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    if (!projectId) {
      Alert.alert('Ruby diagnostics', 'No EAS projectId found in app config.');
      return;
    }

    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    const { error } = await supabase.from('push_tokens').upsert(
      { user_id: userId, token, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,token' },
    );
    if (error) {
      Alert.alert('Ruby diagnostics', 'Saving token failed: ' + error.message);
    } else {
      Alert.alert('Ruby diagnostics', 'Push token registered ✅');
    }
  } catch (err) {
    Alert.alert('Ruby diagnostics', 'getExpoPushToken failed: ' + (err instanceof Error ? err.message : String(err)));
    console.warn('Push registration failed', err);
  }
}
