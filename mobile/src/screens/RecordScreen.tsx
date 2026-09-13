import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppHeader, BottomNav, Page, PrimaryButton, StateMessage } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { syncLocalNotifications } from '../services/notificationService';
import { colors, styles as theme } from '../theme';

const isoToday = () => new Date().toISOString().slice(0, 10);
const isoOffset = (days: number) => { const date = new Date(); date.setDate(date.getDate() + days); return date.toISOString().slice(0, 10); };
const displayDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export function RecordScreen({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { token, user } = useAuth();
  const [date, setDate] = useState(isoToday());
  const [custom, setCustom] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const selected = custom || date;
  const readable = useMemo(() => { try { return displayDate(selected); } catch { return selected; } }, [selected]);

  async function submit() {
    setError(''); setMessage(''); setSuccess(false);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(selected) || Number.isNaN(new Date(`${selected}T12:00:00`).getTime())) { setError('Choose a valid date in YYYY-MM-DD format.'); return; }
    if (!token) return;
    setLoading(true);
    try { const result = await api.addPeriod(token, selected); const reminders = await api.getReminders(token); if (user) await syncLocalNotifications(reminders.reminders, user.name); setSuccess(true); setMessage(`Next estimate: ${result.predicted_next_period ? displayDate(result.predicted_next_period) : 'available after one more record'}`); } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to record this date.'); } finally { setLoading(false); }
  }

  return <View style={theme.page}><AppHeader subtitle="Record a period" /><Page>
    <View style={record.hero}><Text style={theme.eyebrow}>CYCLE MILESTONE</Text><Text style={record.heroTitle}>When did your period start?</Text><Text style={theme.subtitle}>Keeping your log up to date helps CycleCare refine your next estimate.</Text></View>
    <View style={theme.card}><Text style={record.label}>QUICK SELECT</Text><View style={record.quickRow}>{[['Today', isoToday()], ['Yesterday', isoOffset(-1)]].map(([label, value]) => <Pressable key={label} onPress={() => { setDate(value); setCustom(''); }} style={[record.quick, selected === value && record.quickSelected]}><Text style={[record.quickLabel, selected === value && record.quickSelectedText]}>{label}</Text><Text style={[record.quickDate, selected === value && record.quickSelectedText]}>{displayDate(value)}</Text></Pressable>)}<Pressable onPress={() => setCustom(date)} style={[record.quick, custom && record.quickSelected]}><Text style={[record.quickLabel, custom && record.quickSelectedText]}>Custom</Text><Text style={[record.quickDate, custom && record.quickSelectedText]}>Date</Text></Pressable></View>
      {custom && <TextInput value={custom} onChangeText={setCustom} placeholder="YYYY-MM-DD" placeholderTextColor={colors.muted} style={record.input} autoCapitalize="none" />}
      <View style={record.selected}><Text style={record.selectedCaption}>SELECTED DATE</Text><Text style={record.selectedDate}>{readable}</Text><Text style={record.selectedHint}>{selected}</Text></View>
      <View style={record.future}><Text style={record.label}>OPTIONAL DETAILS</Text><Text style={record.futureText}>Flow and symptom notes will be available when the backend supports them.</Text></View>
      {error && <Text style={record.error}>{error}</Text>}{success && <StateMessage title="Period recorded successfully" detail={message} action="View history" onAction={() => onNavigate('history')} />}
      <PrimaryButton label="Record period" onPress={submit} loading={loading} />
    </View>
  </Page><BottomNav active="record" onChange={onNavigate} /></View>;
}

const record = StyleSheet.create({ hero: { backgroundColor: colors.mist, borderRadius: 22, padding: 20, marginBottom: 17, gap: 6 }, heroTitle: { color: colors.ink, fontSize: 24, fontWeight: '700' }, label: { color: colors.burgundy, fontSize: 11, fontWeight: '800', letterSpacing: 1.1, marginBottom: 10 }, quickRow: { flexDirection: 'row', gap: 8 }, quick: { flex: 1, backgroundColor: colors.mist, paddingVertical: 13, borderRadius: 14, alignItems: 'center' }, quickSelected: { backgroundColor: colors.plum }, quickLabel: { color: colors.ink, fontWeight: '700', fontSize: 13 }, quickDate: { color: colors.muted, fontSize: 11, marginTop: 4 }, quickSelectedText: { color: colors.paper }, input: { borderWidth: 1, borderColor: colors.rose, borderRadius: 14, padding: 14, color: colors.ink, marginTop: 14 }, selected: { borderTopWidth: 1, borderTopColor: colors.line, marginTop: 22, paddingTop: 18 }, selectedCaption: { color: colors.muted, fontSize: 11, letterSpacing: 1, fontWeight: '700' }, selectedDate: { color: colors.ink, fontSize: 23, fontWeight: '700', marginTop: 8 }, selectedHint: { color: colors.burgundy, marginTop: 3 }, future: { marginTop: 25, backgroundColor: colors.blush, borderRadius: 16, padding: 15 }, futureText: { color: colors.plum, fontSize: 13, lineHeight: 19 }, error: { color: colors.burgundy, backgroundColor: colors.warning, padding: 12, borderRadius: 13, marginTop: 16, lineHeight: 18 } });
