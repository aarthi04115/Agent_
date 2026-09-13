import { Reminder } from '../types';

export function requestNotificationPermission(): Promise<'granted' | 'denied' | 'unavailable'>;
export function scheduleDevelopmentTestNotification(): Promise<'granted' | 'denied' | 'unavailable'>;
export function syncLocalNotifications(reminders: Reminder[], name: string): Promise<'granted' | 'denied' | 'unavailable'>;
export function addNotificationResponseListener(handler: (route: string) => void): { remove: () => void };
