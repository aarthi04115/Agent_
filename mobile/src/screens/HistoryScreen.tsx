import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppHeader, BottomNav, Page, StateMessage } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { colors, styles as theme } from '../theme';
import { PeriodResponse } from '../types';

function displayDate(value: string) { return new Date(`${value}T12:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }); }

export function HistoryScreen({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { token } = useAuth();
  const [data, setData] = useState<PeriodResponse | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => { if (!token) return; try { setData(await api.getPeriods(token)); } catch { setError('Unable to load your history.'); } }, [token]);
  useEffect(() => { load(); }, [load]);
  return <View style={theme.page}><AppHeader subtitle="History" /><Page>
    <Text style={theme.title}>Your records</Text><Text style={[theme.subtitle, history.intro]}>A simple view of the dates that shape your personal estimate.</Text>
    {error ? <StateMessage title="History unavailable" detail={error} action="Try again" onAction={load} /> : !data ? <StateMessage title="Loading your history..." /> : data.periods.length === 0 ? <StateMessage title="No period records yet." detail="Record a date to begin building your cycle history." action="Record period" onAction={() => onNavigate('record')} /> : <>
      <View style={history.summary}><Text style={theme.eyebrow}>YOUR CURRENT ESTIMATE</Text><Text style={history.summaryValue}>{data.average_cycle ? `${data.average_cycle} days` : 'Building your estimate'}</Text><Text style={theme.subtitle}>{data.predicted_next_period ? `Next estimate ${displayDate(data.predicted_next_period)}` : 'Record one more period to see a prediction.'}</Text></View>
      {data.periods.slice().reverse().map((date, index, dates) => { const cycleLength = index < data.cycle_lengths.length ? data.cycle_lengths[data.cycle_lengths.length - 1 - index] : null; return <View key={date} style={history.row}><View style={history.marker}><View style={history.dot} />{index < dates.length - 1 && <View style={history.line} />}</View><View style={{ flex: 1 }}><Text style={history.date}>{displayDate(date)}</Text><Text style={history.detail}>{cycleLength ? `Cycle length: ${cycleLength} days` : 'First recorded period'}</Text></View><Text style={history.status}>Confirmed</Text></View>; })}
    </>}
  </Page><BottomNav active="history" onChange={onNavigate} /></View>;
}
const history = StyleSheet.create({ intro: { marginTop: 7, marginBottom: 20 }, summary: { backgroundColor: colors.plum, borderRadius: 24, padding: 21, marginBottom: 22 }, summaryValue: { color: colors.paper, fontSize: 25, fontWeight: '800', marginVertical: 10 }, row: { flexDirection: 'row', alignItems: 'flex-start', minHeight: 77 }, marker: { width: 25, alignItems: 'center' }, dot: { width: 13, height: 13, borderRadius: 7, backgroundColor: colors.burgundy, borderWidth: 3, borderColor: colors.blush }, line: { width: 2, flex: 1, backgroundColor: colors.line, marginTop: 2 }, date: { color: colors.ink, fontSize: 16, fontWeight: '700' }, detail: { color: colors.muted, fontSize: 13, marginTop: 5 }, status: { color: colors.burgundy, fontSize: 11, fontWeight: '700', marginTop: 3 } });
