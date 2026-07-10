import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

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
 * Ask for notification permission and set up the Android channel. Safe to call
 * on every launch — it only prompts the first time.
 */
export async function initNotifications(): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('list-updates', {
        name: 'List updates',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted;
  } catch (err) {
    console.warn('Could not set up notifications', err);
    return false;
  }
}

export async function notifyLocal(title: string, body: string): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: null, // deliver immediately
    });
  } catch (err) {
    console.warn('Local notification failed', err);
  }
}
