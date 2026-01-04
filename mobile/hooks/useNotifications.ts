import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import * as Notifications from 'expo-notifications';

import {
  registerForPushNotificationsAsync,
  storePushToken,
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
  getLastNotificationResponse,
  clearBadge,
  AppNotificationData,
} from '@/lib/notifications';

interface UseNotificationsReturn {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  isRegistered: boolean;
  isLoading: boolean;
  error: string | null;
  registerPushNotifications: () => Promise<void>;
}

export function useNotifications(): UseNotificationsReturn {
  const router = useRouter();
  const { isSignedIn, getToken } = useAuth();

  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();
  const initializedRef = useRef(false);

  // Handle notification response (when user taps notification)
  const handleNotificationResponse = useCallback(
    (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data as AppNotificationData;

      // Clear badge when user interacts with notification
      clearBadge();

      // Navigate based on notification type
      if (data?.type) {
        switch (data.type) {
          case 'order_confirmed':
          case 'order_shipped':
          case 'order_delivered':
            if (data.orderId) {
              router.push(`/orders/${data.orderId}`);
            } else {
              router.push('/orders');
            }
            break;

          case 'zen_points':
            router.push('/(tabs)/zen-points');
            break;

          case 'game_available':
            router.push('/game/memory');
            break;

          case 'promotion':
            router.push('/(tabs)');
            break;

          default:
            // Just open the app
            break;
        }
      }
    },
    [router]
  );

  // Register for push notifications
  const registerPushNotifications = useCallback(async () => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const token = await registerForPushNotificationsAsync();

      if (token) {
        setExpoPushToken(token);
        setIsRegistered(true);

        // Store token on backend if user is signed in
        if (isSignedIn) {
          const authToken = await getToken();
          if (authToken) {
            await storePushToken(token, authToken);
          }
        }
      } else {
        setError('Failed to get push token');
      }
    } catch (err) {
      if (__DEV__) console.error('Push notification registration error:', err);
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, isSignedIn, getToken]);

  // Initialize notifications on mount
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    // Set up notification listeners
    notificationListener.current = addNotificationReceivedListener((notification) => {
      setNotification(notification);
    });

    responseListener.current = addNotificationResponseReceivedListener(handleNotificationResponse);

    // Check if app was opened from a notification
    getLastNotificationResponse().then((response) => {
      if (response) {
        handleNotificationResponse(response);
      }
    });

    // Auto-register for push notifications
    registerPushNotifications();

    // Cleanup
    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  // Re-register when user signs in (to update token on backend)
  useEffect(() => {
    if (isSignedIn && expoPushToken) {
      getToken().then((authToken) => {
        if (authToken) {
          storePushToken(expoPushToken, authToken);
        }
      });
    }
  }, [isSignedIn, expoPushToken, getToken]);

  return {
    expoPushToken,
    notification,
    isRegistered,
    isLoading,
    error,
    registerPushNotifications,
  };
}

// Simpler hook for just checking permission status
export function useNotificationPermission() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    Notifications.getPermissionsAsync().then(({ status }) => {
      setHasPermission(status === 'granted');
    });
  }, []);

  const requestPermission = useCallback(async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    setHasPermission(status === 'granted');
    return status === 'granted';
  }, []);

  return { hasPermission, requestPermission };
}
