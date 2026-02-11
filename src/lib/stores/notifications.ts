/**
 * Push notification permission and subscription store.
 */

import { writable } from 'svelte/store';

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
