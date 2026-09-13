import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { AppHeader, BottomNav, MetricCard, Page, PrimaryButton, SecondaryButton, StateMessage } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { colors, shadows, styles as theme } from '../theme';
import { PeriodResponse } from '../types';

function formatDate(value: string | null) { return value ? new Date(`${value}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Not available'; }
function daysBetween(from: string, to: string) { return Math.ceil((new Date(`${to}T12:00:00`).getTime() - new Date(`${from}T12:00:00`).getTime()) / 86400000); }

export function HomeScreen({ onNavigate, onProfile }: { onNavigate: (tab: string) => void; onProfile: () => void }) {
  const { user, token, logout } = useAuth();
  const [data, setData] = useState<PeriodResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => { if (!token) return; setLoading(true); try { setData(await api.getPeriods(token)); setError(''); } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to connect.'); } finally { setLoading(false); } }, [token]);
  useEffect(() => { load(); }, [load]);
  const last = data?.periods.at(-1) ?? null;
  const today = new Date().toISOString().slice(0, 10);
  const remaining = data?.predicted_next_period ? daysBetween(today, data.predicted_next_period) : null;
  const cycleDay = data?.current_cycle_day ?? null;

  return <View style={theme.page}><AppHeader subtitle="Home" onAvatar={onProfile} /><Page>
    <View style={home.greeting}><Text style={theme.title}>Good morning, {user?.name} ✨</Text><Text style={theme.subtitle}>Let's check in with your cycle today.</Text></View>
    <View style={home.sync}><View style={home.dot} /><Text style={home.syncText}>Synced with your account</Text></View>
    {error ? <StateMessage title="Could not load your cycle" detail={error} action="Try again" onAction={load} /> : loading ? <StateMessage title="Loading your cycle..." /> : !data ? null : <>
      <View style={home.prediction}><Text style={theme.eyebrow}>NEXT PREDICTED PERIOD</Text><Text style={home.predictionDate}>{formatDate(data.predicted_next_period)}</Text><Text style={home.predictionDetail}>{remaining === null ? 'Record one more period to start seeing your cycle prediction.' : remaining < 0 ? 'Your estimate has passed. Check in when your period starts.' : `About ${remaining} days away`}</Text><View style={home.ring}><Text style={home.ringSmall}>CURRENT CYCLE DAY</Text><Text style={home.ringDay}>{cycleDay ? `Day ${cycleDay}` : '—'}</Text><Text style={home.ringCaption}>Estimate based on your history</Text></View><View style={home.track}><View style={home.trackActive} /><View style={home.trackMuted} /><View style={home.trackMuted} /></View></View>
      <PrimaryButton label="Period started today" onPress={() => onNavigate('record')} />
      <SecondaryButton label="Log another date" onPress={() => onNavigate('record')} />
      {data.periods.length < 2 && <View style={home.info}><Text style={home.infoIcon}>i</Text><Text style={home.infoText}>Record one more period to start seeing your cycle prediction.</Text></View>}
      <View style={home.metrics}><MetricCard label="Average cycle" value={data.average_cycle ? `${data.average_cycle} days` : '—'} detail={data.average_cycle ? 'Your recent average' : 'Needs more history'} /><MetricCard label="Last recorded" value={formatDate(last)} detail={cycleDay ? `Day ${cycleDay} today` : 'No records yet'} /></View>
      <View style={home.historyHeader}><Text style={home.sectionTitle}>Recent history</Text><Pressable onPress={() => onNavigate('history')}><Text style={home.link}>View all</Text></Pressable></View>
      {data.periods.slice(-3).reverse().map(date => <View key={date} style={home.historyRow}><View style={home.historyBullet} /><Text style={home.historyDate}>{formatDate(date)}</Text><Text style={home.historyLabel}>Confirmed period</Text></View>)}
    </>}
  </Page><BottomNav active="home" onChange={onNavigate} /></View>;
}

const home = StyleSheet.create({ greeting: { gap: 5, marginBottom: 13 }, sync: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 7, backgroundColor: colors.paper, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 12, marginBottom: 16, ...shadows }, dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.rose }, syncText: { color: colors.muted, fontSize: 12 }, prediction: { backgroundColor: colors.plum, borderRadius: 28, padding: 22, minHeight: 300, marginBottom: 16, overflow: 'hidden' }, predictionDate: { color: colors.paper, fontSize: 31, fontWeight: '800', marginTop: 12 }, predictionDetail: { color: colors.rose, fontSize: 14, marginTop: 3 }, ring: { width: 150, height: 150, borderWidth: 13, borderColor: colors.rose, borderLeftColor: '#8B6075', borderRadius: 90, alignSelf: 'center', marginTop: 17, alignItems: 'center', justifyContent: 'center' }, ringSmall: { color: colors.rose, fontSize: 9, fontWeight: '800' }, ringDay: { color: colors.paper, fontSize: 24, fontWeight: '800', marginTop: 2 }, ringCaption: { color: colors.blush, fontSize: 10, marginTop: 3 }, track: { flexDirection: 'row', gap: 7, marginTop: 18 }, trackActive: { flex: 1, height: 5, borderRadius: 3, backgroundColor: colors.rose }, trackMuted: { flex: 1, height: 5, borderRadius: 3, backgroundColor: '#765368' }, info: { flexDirection: 'row', gap: 10, backgroundColor: colors.lavender, padding: 14, borderRadius: 16, marginTop: 14 }, infoIcon: { width: 20, height: 20, borderRadius: 10, textAlign: 'center', color: colors.plum, borderWidth: 1, borderColor: colors.plum }, infoText: { flex: 1, color: colors.plum, fontSize: 13, lineHeight: 18 }, metrics: { flexDirection: 'row', gap: 12, marginTop: 18 }, historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 27, marginBottom: 8 }, sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: '700' }, link: { color: colors.burgundy, fontWeight: '700', fontSize: 13 }, historyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line }, historyBullet: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.burgundy }, historyDate: { color: colors.ink, fontWeight: '700' }, historyLabel: { color: colors.muted, fontSize: 12, marginLeft: 'auto' } });
