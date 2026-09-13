import * as Notifications from 'expo-notifications';
import { Reminder } from '../types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function configureAndroidChannel() {
  await Notifications.setNotificationChannelAsync('cyclecare-reminders', {
    name: 'CycleCare reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#8E4052',
  });
}

export async function requestNotificationPermission() {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) {
    await configureAndroidChannel();
    return 'granted' as const;
  }
  if (current.canAskAgain === false) return 'denied' as const;
  const requested = await Notifications.requestPermissionsAsync();
  if (requested.granted) await configureAndroidChannel();
  return requested.granted ? 'granted' as const : 'denied' as const;
}

export async function scheduleDevelopmentTestNotification() {
  if (!__DEV__) return 'unavailable' as const;
  const permission = await requestNotificationPermission();
  if (permission !== 'granted') return permission;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'CycleCare Test Reminder',
      body: 'Development-only notification. No period was recorded.',
      data: { route: 'record', developmentTest: true },
      channelId: 'cyclecare-reminders',
    } as Notifications.NotificationContentInput,
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 10, repeats: false },
  });
  return permission;
}

function contentFor(reminder: Reminder, name: string) {
  if (reminder.notification_type === 'period_checkin') {
    return { title: 'CycleCare check-in', body: `Hi ${name} 🌸 Did your period start today?`, data: { route: 'record' } };
  }
  const timing = reminder.notification_type === 'upcoming_3_days' ? 'about 3 days' : 'tomorrow';
  return { title: 'CycleCare reminder', body: `Your estimated period may start ${timing} 🌸`, data: { route: 'home' } };
}

export async function syncLocalNotifications(reminders: Reminder[], name: string) {
  const permission = await requestNotificationPermission();
  if (permission !== 'granted') return permission;
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const reminder of reminders) {
    const triggerDate = new Date(reminder.scheduled_for);
    if (triggerDate <= new Date()) continue;
    await Notifications.scheduleNotificationAsync({
      content: { ...contentFor(reminder, name), channelId: 'cyclecare-reminders' } as Notifications.NotificationContentInput,
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
    });
  }
  return permission;
}

export function addNotificationResponseListener(handler: (route: string) => void) {
  return Notifications.addNotificationResponseReceivedListener(response => {
    const route = response.notification.request.content.data?.route;
    if (typeof route === 'string') handler(route);
  });
}