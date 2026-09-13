import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppHeader, BottomNav, MetricCard, Page, StateMessage } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { colors, styles as theme } from '../theme';
import { FamilyResponse } from '../types';

function displayDate(value: string | null) { return value ? new Date(`${value}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No estimate'; }
export function FamilyScreen({ onNavigate, onProfile }: { onNavigate: (tab: string) => void; onProfile: () => void }) {
  const { token, user } = useAuth();
  const [data, setData] = useState<FamilyResponse | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => { if (!token) return; try { setData(await api.getFamilyPeriods(token)); } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to load family data.'); } }, [token]);
  useEffect(() => { load(); }, [load]);
  return <View style={theme.page}><AppHeader title="CycleCare" subtitle="Mother Dashboard" onAvatar={onProfile} /><Page>
    <View style={family.readonly}><Text style={family.lock}>▣</Text><Text style={family.readonlyText}>Mother Account • Read-only family access</Text></View><Text style={theme.eyebrow}>SYNCHRONIZED HOUSEHOLD CARE</Text><Text style={[theme.title, { marginTop: 7 }]}>Family Cycle Overview</Text><Text style={[theme.subtitle, { marginTop: 7, marginBottom: 22 }]}>Private, supportive visibility into your daughters' cycle rhythms.</Text>
    {error ? <StateMessage title="Family data unavailable" detail={error} action="Try again" onAction={load} /> : !data ? <StateMessage title="Loading family overview..." /> : data.family.length === 0 ? <StateMessage title="No daughter profiles yet." detail="Family data will appear here once a daughter has an account and period records." /> : data.family.map(member => <View key={`${member.name}-${member.role}`} style={family.member}><View style={family.memberHead}><View style={family.avatar}><Text style={family.avatarText}>{member.name.slice(0, 1)}</Text></View><View style={{ flex: 1 }}><Text style={family.name}>{member.name}</Text><Text style={family.role}>{member.role === 'sister' ? 'Sister' : 'Daughter'} • private history</Text></View><View style={family.badge}><Text style={family.badgeText}>{member.predicted_next_period ? 'Estimate ready' : 'Building history'}</Text></View></View><View style={family.metrics}><MetricCard label="Next expected" value={displayDate(member.predicted_next_period)} /><MetricCard label="Average cycle" value={member.average_cycle ? `${member.average_cycle} days` : '—'} /></View><Text style={family.last}>Current cycle day: {member.current_cycle_day ?? 'Not available'}  •  Last recorded: {displayDate(member.periods.at(-1) ?? null)}</Text></View>)}
  </Page><BottomNav active="family" onChange={onNavigate} /></View>;
}
const family = StyleSheet.create({ readonly: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: colors.mist, borderRadius: 22, padding: 13, marginBottom: 25 }, lock: { color: colors.plum, fontSize: 17 }, readonlyText: { color: colors.plum, fontSize: 12, fontWeight: '700' }, member: { backgroundColor: colors.paper, borderRadius: 24, padding: 18, marginBottom: 17 }, memberHead: { flexDirection: 'row', alignItems: 'center', gap: 10 }, avatar: { width: 42, height: 42, borderRadius: 22, backgroundColor: colors.peach, alignItems: 'center', justifyContent: 'center' }, avatarText: { color: colors.plum, fontSize: 18, fontWeight: '800' }, name: { color: colors.ink, fontSize: 18, fontWeight: '700' }, role: { color: colors.muted, fontSize: 12, marginTop: 3 }, badge: { backgroundColor: colors.success, borderRadius: 14, paddingVertical: 6, paddingHorizontal: 9 }, badgeText: { color: '#245B36', fontSize: 10, fontWeight: '700' }, metrics: { flexDirection: 'row', gap: 9, marginTop: 17 }, last: { color: colors.muted, fontSize: 12, marginTop: 13 } });
