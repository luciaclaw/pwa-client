/**
 * Push notification permission and subscription store.
 */

import { writable, get } from 'svelte/store';
import { wsClient } from './websocket.js';

export type NotificationPermission = 'default' | 'granted' | 'denied';

export const notificationPermission = writable<NotificationPermission>('default');
export const pushSubscription = writable<PushSubscription | null>(null);

/** Request notification permission from the user. */
export async function requestPermission(): Promise<NotificationPermission> {
  if (!('Notification' in globalThis)) return 'denied';
  const result = await Notification.requestPermission();
  notificationPermission.set(result as NotificationPermission);
  return result as NotificationPermission;
}

/**
 * Subscribe to push notifications and send subscription to CVM.
 * Requires notification permission to be granted and a VAPID public key.
 */
export async function subscribeToPush(): Promise<void> {
  if (!('serviceWorker' in navigator) || !('PushManager' in globalThis)) return;

  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!vapidKey) return;

  // Ensure permission is granted
  const perm = get(notificationPermission);
  if (perm !== 'granted') {
    const result = await requestPermission();
    if (result !== 'granted') return;
  }

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });
  }

  pushSubscription.set(subscription);

  // Send subscription to CVM via encrypted channel
  const sub = subscription.toJSON();
  wsClient.send({
    id: crypto.randomUUID(),
    type: 'push.subscribe',
    timestamp: Date.now(),
    payload: {
      subscription: {
        endpoint: sub.endpoint!,
        expirationTime: sub.expirationTime ?? null,
        keys: {
          p256dh: sub.keys!.p256dh!,
          auth: sub.keys!.auth!,
        },
      },
    },
  });
}

/** Unsubscribe from push notifications. */
export async function unsubscribeFromPush(): Promise<void> {
  const sub = get(pushSubscription);
  if (!sub) return;

  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  pushSubscription.set(null);

  wsClient.send({
    id: crypto.randomUUID(),
    type: 'push.unsubscribe',
    timestamp: Date.now(),
    payload: { endpoint },
  });
}

/** Convert a URL-safe base64 VAPID key to Uint8Array. */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const outputArray = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    outputArray[i] = raw.charCodeAt(i);
  }
  return outputArray;
}
