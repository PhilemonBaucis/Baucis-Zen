import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { storeApi } from './api/client';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface PushNotificationState {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
}

/**
 * Register for push notifications and get Expo push token
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  // Push notifications only work on physical devices
  if (!Device.isDevice) {
    if (__DEV__) console.log('Push notifications require a physical device');
    return null;
  }

  // Check/request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    if (__DEV__) console.log('Push notification permission not granted');
    return null;
  }

  try {
    // Get Expo push token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

    // Check for valid project ID (must be a UUID, not placeholder)
    const isValidUUID = projectId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId);

    if (!isValidUUID) {
      if (__DEV__) console.log('Push notifications require a valid EAS project ID. Configure in app.json');
      return null;
    }

    const pushTokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    token = pushTokenData.data;
    if (__DEV__) console.log('Expo push token:', token);
  } catch (error) {
    if (__DEV__) console.error('Error getting push token:', error);
    return null;
  }

  // Android-specific channel setup
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#7ca163',
    });

    // Order updates channel
    await Notifications.setNotificationChannelAsync('orders', {
      name: 'Order Updates',
      description: 'Notifications about your order status',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#7ca163',
    });

    // Promotional channel
    await Notifications.setNotificationChannelAsync('promotions', {
      name: 'Promotions',
      description: 'Special offers and promotions',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  return token;
}

/**
 * Store push token in customer metadata on backend
 */
export async function storePushToken(token: string, authToken: string): Promise<boolean> {
  try {
    await storeApi.customer.updatePushToken(token, authToken);
    if (__DEV__) console.log('Push token stored on backend');
    return true;
  } catch (error) {
    if (__DEV__) console.error('Failed to store push token:', error);
    return false;
  }
}

/**
 * Schedule a local notification
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>,
  trigger?: Notifications.NotificationTriggerInput
): Promise<string> {
  return await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
    },
    trigger: trigger || null, // null = immediate
  });
}

/**
 * Cancel a scheduled notification
 */
export async function cancelNotification(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Get badge count
 */
export async function getBadgeCount(): Promise<number> {
  return await Notifications.getBadgeCountAsync();
}

/**
 * Set badge count
 */
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

/**
 * Clear badge
 */
export async function clearBadge(): Promise<void> {
  await Notifications.setBadgeCountAsync(0);
}

/**
 * Add notification received listener
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
): Notifications.EventSubscription {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Add notification response listener (when user taps notification)
 */
export function addNotificationResponseReceivedListener(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.EventSubscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Get last notification response (for app launched from notification)
 */
export async function getLastNotificationResponse(): Promise<Notifications.NotificationResponse | null> {
  return await Notifications.getLastNotificationResponseAsync();
}

// Notification types for the app
export type NotificationType =
  | 'order_confirmed'
  | 'order_shipped'
  | 'order_delivered'
  | 'promotion'
  | 'zen_points'
  | 'game_available';

export interface AppNotificationData {
  type: NotificationType;
  orderId?: string;
  points?: number;
  [key: string]: unknown;
}
