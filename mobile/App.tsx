import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AssistantScreen } from './src/screens/AssistantScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { CalendarScreen } from './src/screens/CalendarScreen';
import { FamilyScreen } from './src/screens/FamilyScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { RecordScreen } from './src/screens/RecordScreen';
import { ReminderSettingsScreen } from './src/screens/ReminderSettingsScreen';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { colors } from './src/theme';
import { api } from './src/services/api';
import { addNotificationResponseListener, syncLocalNotifications } from './src/services/notificationService';

function AppContent() {
  const { user, token, loading, logout } = useAuth();
  const [tab, setTab] = useState('home');
  const [profileOpen, setProfileOpen] = useState(false);
  useEffect(() => {
    const subscription = addNotificationResponseListener(route => {
      if (route === 'record' && user?.role !== 'mom') {
        setTab('record');
      }
    });
    return () => subscription.remove();
  }, [user?.role]);
  useEffect(() => {
    if (!user || !token || user.role === 'mom') return;
    api.getReminders(token)
      .then(result => syncLocalNotifications(result.reminders, user.name))
      .catch(() => undefined);
  }, [token, user]);
  if (loading) return <View style={app.loading}><ActivityIndicator color={colors.burgundy} /><Text style={app.loadingText}>Opening your CycleCare space...</Text></View>;
  if (!user) return <AuthScreen />;
  const profile = () => setProfileOpen(true);
  const navigate = (next: string) => setTab(next);
  let screen;
  if (user.role === 'mom' && (tab === 'home' || tab === 'family')) screen = <FamilyScreen onNavigate={navigate} onProfile={profile} />;
  else if (tab === 'home') screen = <HomeScreen onNavigate={navigate} onProfile={profile} />;
  else if (tab === 'calendar') screen = <CalendarScreen onNavigate={navigate} />;
  else if (tab === 'history') screen = <HistoryScreen onNavigate={navigate} />;
  else if (tab === 'family') screen = <FamilyScreen onNavigate={navigate} onProfile={profile} />;
  else if (tab === 'record') screen = <RecordScreen onNavigate={navigate} />;
  else if (tab === 'settings') screen = <ReminderSettingsScreen onNavigate={navigate} />;
  else screen = <AssistantScreen onNavigate={navigate} />;
  return <><View style={{ flex: 1 }}>{screen}{profileOpen && <View style={app.overlay}><View style={app.sheet}><Text style={app.sheetTitle}>{user.name}</Text><Text style={app.sheetEmail}>{user.email}</Text><Text style={app.sheetRole}>{user.role === 'mom' ? 'Mother • manages family cycle' : 'Personal cycle account'}</Text><Pressable onPress={() => { setProfileOpen(false); setTab('settings'); }} style={app.settings}><Text style={app.settingsText}>Reminder settings</Text></Pressable><Pressable onPress={() => { setProfileOpen(false); logout(); }} style={app.logout}><Text style={app.logoutText}>Log out</Text></Pressable><Pressable onPress={() => setProfileOpen(false)} style={app.close}><Text style={app.closeText}>Close</Text></Pressable></View></View>}</View><StatusBar style="dark" /></>;
}

export default function App() { return <AuthProvider><AppContent /></AuthProvider>; }

const app = StyleSheet.create({ loading: { flex: 1, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center', gap: 14 }, loadingText: { color: colors.muted, fontSize: 14 }, overlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(36, 21, 34, 0.28)', justifyContent: 'flex-end' }, sheet: { backgroundColor: colors.paper, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, gap: 9 }, sheetTitle: { color: colors.ink, fontSize: 23, fontWeight: '800' }, sheetEmail: { color: colors.muted, fontSize: 14 }, sheetRole: { color: colors.burgundy, fontSize: 13, marginBottom: 8 }, settings: { backgroundColor: colors.blush, minHeight: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, settingsText: { color: colors.plum, fontWeight: '800', fontSize: 16 }, logout: { backgroundColor: colors.plum, minHeight: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, logoutText: { color: colors.paper, fontWeight: '800', fontSize: 16 }, close: { alignItems: 'center', padding: 12 }, closeText: { color: colors.burgundy, fontWeight: '700' } });
