import { api } from './api/client';

export type PushSetupResult =
  | { status: 'subscribed' }
  | { status: 'unsupported' }
  | { status: 'denied' }
  | { status: 'error'; message: string };

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const bytes = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) bytes[i] = rawData.charCodeAt(i);
  return bytes;
}

export async function setupPush(memberId: string): Promise<PushSetupResult> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return { status: 'unsupported' };
  }

  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!vapidKey) {
    return { status: 'error', message: 'Missing VAPID public key' };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { status: 'denied' };
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
    }
    await api.saveSubscription(subscription.toJSON() as PushSubscriptionJSON, memberId);
    return { status: 'subscribed' };
  } catch (err) {
    return { status: 'error', message: err instanceof Error ? err.message : 'Failed to subscribe' };
  }
}
