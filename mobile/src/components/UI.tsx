import React, { PropsWithChildren } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, shadows, styles as theme } from '../theme';

export function AppHeader({ title = 'CycleCare', subtitle, onAvatar }: { title?: string; subtitle?: string; onAvatar?: () => void }) {
  return <View style={ui.header}>
    <View style={ui.brandMark}><Text style={ui.brandMarkText}>◔</Text></View>
    <View style={{ flex: 1 }}><Text style={ui.brand}>{title}</Text>{subtitle && <Text style={ui.headerSubtitle}>{subtitle}</Text>}</View>
    <Pressable onPress={onAvatar} style={ui.avatar} accessibilityLabel="Open profile"><Text style={ui.avatarText}>✦</Text></Pressable>
  </View>;
}

export function Page({ children, scroll = true }: PropsWithChildren<{ scroll?: boolean }>) {
  const content = scroll ? <ScrollView contentContainerStyle={theme.content} showsVerticalScrollIndicator={false}>{children}</ScrollView> : children;
  return <SafeAreaView style={theme.page}>{content}</SafeAreaView>;
}

export function BottomNav({ active, onChange }: { active: string; onChange: (tab: string) => void }) {
  const tabs = [['home', '⌂', 'Home'], ['calendar', '□', 'Calendar'], ['history', '⌁', 'History'], ['family', '♧', 'Family'], ['assistant', '▢', 'Assistant']];
  return <View style={ui.nav}>{tabs.map(([key, icon, label]) => <Pressable key={key} onPress={() => onChange(key)} style={[ui.navItem, active === key && ui.navItemActive]}><Text style={[ui.navIcon, active === key && ui.navActiveText]}>{icon}</Text><Text style={[ui.navLabel, active === key && ui.navActiveText]}>{label}</Text></Pressable>)}</View>;
}

export function PrimaryButton({ label, onPress, loading, disabled }: { label: string; onPress: () => void; loading?: boolean; disabled?: boolean }) {
  return <Pressable onPress={onPress} disabled={disabled || loading} style={({ pressed }) => [theme.button, ui.primaryButton, pressed && { opacity: 0.82 }, disabled && { opacity: 0.5 }]}>{loading ? <ActivityIndicator color={colors.paper} /> : <Text style={[theme.buttonText, { color: colors.paper }]}>{label}</Text>}</Pressable>;
}

export function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [theme.button, ui.secondaryButton, pressed && { opacity: 0.78 }]}><Text style={[theme.buttonText, { color: colors.plum }]}>{label}</Text></Pressable>;
}

export function StateMessage({ title, detail, action, onAction }: { title: string; detail?: string; action?: string; onAction?: () => void }) {
  return <View style={ui.state}><Text style={ui.stateIcon}>◌</Text><Text style={ui.stateTitle}>{title}</Text>{detail && <Text style={ui.stateDetail}>{detail}</Text>}{action && onAction && <SecondaryButton label={action} onPress={onAction} />}</View>;
}

export function MetricCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <View style={ui.metric}><Text style={ui.metricLabel}>{label}</Text><Text style={ui.metricValue}>{value}</Text>{detail && <Text style={ui.metricDetail}>{detail}</Text>}</View>;
}

const ui = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 22, paddingTop: 10, paddingBottom: 17, backgroundColor: colors.cream },
  brandMark: { width: 35, height: 35, borderRadius: 18, backgroundColor: colors.blush, alignItems: 'center', justifyContent: 'center' },
  brandMarkText: { color: colors.burgundy, fontSize: 24, fontWeight: '700' },
  brand: { color: colors.ink, fontSize: 20, fontWeight: '800' },
  headerSubtitle: { color: colors.muted, fontSize: 11, marginTop: 1 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.peach, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.plum, fontSize: 18 },
  nav: { position: 'absolute', left: 12, right: 12, bottom: 12, borderRadius: 25, paddingVertical: 8, paddingHorizontal: 5, backgroundColor: colors.paper, flexDirection: 'row', justifyContent: 'space-around', ...shadows },
  navItem: { alignItems: 'center', justifyContent: 'center', minWidth: 57, minHeight: 50, borderRadius: 19, gap: 1 },
  navItemActive: { backgroundColor: colors.blush },
  navIcon: { color: colors.muted, fontSize: 21, lineHeight: 23 },
  navLabel: { color: colors.muted, fontSize: 10, fontWeight: '600' },
  navActiveText: { color: colors.burgundy },
  primaryButton: { backgroundColor: colors.plum },
  secondaryButton: { borderWidth: 1, borderColor: colors.rose, backgroundColor: colors.paper },
  state: { alignItems: 'center', gap: 10, paddingVertical: 55 },
  stateIcon: { color: colors.rose, fontSize: 34 },
  stateTitle: { color: colors.ink, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  stateDetail: { color: colors.muted, fontSize: 14, textAlign: 'center', lineHeight: 20, maxWidth: 280 },
  metric: { flex: 1, minHeight: 112, borderRadius: 20, backgroundColor: colors.paper, padding: 16, ...shadows },
  metricLabel: { color: colors.muted, fontSize: 12 },
  metricValue: { color: colors.ink, fontSize: 20, fontWeight: '700', marginTop: 13 },
  metricDetail: { color: colors.burgundy, fontSize: 12, marginTop: 4 },
});
