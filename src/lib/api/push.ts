import { supabase } from '@/integrations/supabase/client';

export interface UserPushSubscription {
  id: string;
  user_id: string;
  subscription_type: 'web_push' | 'fcm';
  endpoint?: string;
  p256dh?: string;
  auth_key?: string;
  fcm_token?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Request notification permission
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('Notifications not supported');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    return await Notification.requestPermission();
  }

  return Notification.permission;
}

// Subscribe to Web Push
export async function subscribeToWebPush(
  vapidPublicKey: string
): Promise<UserPushSubscription | null> {
  try {
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission denied');
      return null;
    }

    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;

    // Subscribe to push notifications
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
    });

    const pushSubscription = subscription.toJSON();

    // Save to database
    const { data, error } = await supabase
      .from('push_subscriptions')
      .insert({
        subscription_type: 'web_push',
        endpoint: pushSubscription.endpoint || '',
        p256dh: pushSubscription.keys?.p256dh || '',
        auth_key: pushSubscription.keys?.auth || '',
        is_active: true,
      } as any)
      .select()
      .single();

    if (error) {
      console.error('Error saving push subscription:', error);
      return null;
    }

    return data as UserPushSubscription;
  } catch (err) {
    console.error('Error subscribing to push:', err);
    return null;
  }
}

// Unsubscribe from Web Push
export async function unsubscribeFromWebPush(subscriptionId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('push_subscriptions')
      .update({ is_active: false })
      .eq('id', subscriptionId);

    if (error) {
      console.error('Error unsubscribing:', error);
      return false;
    }

    // Unsubscribe from push manager
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
    }

    return true;
  } catch (err) {
    console.error('Error unsubscribing:', err);
    return false;
  }
}

// Get user's push subscriptions
export async function getPushSubscriptions(): Promise<UserPushSubscription[]> {
  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching push subscriptions:', error);
    return [];
  }

  return (data as UserPushSubscription[]) || [];
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
