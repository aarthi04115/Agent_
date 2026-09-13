import { Reminder } from '../types';

export async function requestNotificationPermission() {
  return 'unavailable' as const;
}

export async function scheduleDevelopmentTestNotification() {
  return 'unavailable' as const;
}

export async function syncLocalNotifications(_reminders: Reminder[], _name: string) {
  return 'unavailable' as const;
}

export function addNotificationResponseListener(_handler: (route: string) => void) {
  return { remove: () => undefined };
}