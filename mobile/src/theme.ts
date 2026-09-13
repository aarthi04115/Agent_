import { Platform, StyleSheet } from 'react-native';

export const colors = {
  ink: '#241522',
  plum: '#442238',
  burgundy: '#8E4052',
  rose: '#E98B9A',
  blush: '#F9DDE0',
  lavender: '#E8E2F0',
  peach: '#F5D5C4',
  cream: '#FBF9F7',
  paper: '#FFFFFF',
  mist: '#F2EFED',
  muted: '#7F6F78',
  line: '#E8E0E2',
  success: '#CDEAD3',
  warning: '#F8D7DA',
};

export const shadows = Platform.select({
  ios: { shadowColor: '#301426', shadowOpacity: 0.09, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
  android: { elevation: 4 },
  default: {},
});

export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.cream },
  content: { paddingHorizontal: 22, paddingBottom: 120 },
  title: { color: colors.ink, fontSize: 29, fontWeight: '700', letterSpacing: 0 },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  card: { backgroundColor: colors.paper, borderRadius: 24, padding: 20, ...shadows },
  eyebrow: { color: colors.burgundy, fontSize: 12, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  button: { minHeight: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  buttonText: { fontSize: 16, fontWeight: '700' },
});
