import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppHeader, BottomNav, Page, StateMessage } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { colors, styles as theme } from '../theme';
import { PeriodResponse } from '../types';

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const key = (date: Date) => date.toISOString().slice(0, 10);
const dateFor = (year: number, month: number, day: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

export function CalendarScreen({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { token } = useAuth();
  const [data, setData] = useState<PeriodResponse | null>(null);
  const [month, setMonth] = useState(new Date());
  const [selected, setSelected] = useState(key(new Date()));
  const [error, setError] = useState('');
  const load = useCallback(async () => { if (!token) return; try { setData(await api.getPeriods(token)); } catch { setError('Unable to load your calendar.'); } }, [token]);
  useEffect(() => { load(); }, [load]);
  const confirmed = useMemo(() => new Set(data?.periods ?? []), [data]);
  const predicted = data?.predicted_next_period;
  const cells = useMemo(() => { const first = new Date(month.getFullYear(), month.getMonth(), 1); const start = first.getDay(); const total = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate(); return Array.from({ length: 42 }, (_, index) => { const day = index - start + 1; return day < 1 || day > total ? null : dateFor(month.getFullYear(), month.getMonth(), day); }); }, [month]);
  const selectedLabel = new Date(`${selected}T12:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return <View style={theme.page}><AppHeader subtitle="Calendar" /><Page>
    {error ? <StateMessage title="Calendar unavailable" detail={error} action="Try again" onAction={load} /> : <>
      <View style={calendar.monthHead}><Pressable onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><Text style={calendar.arrow}>‹</Text></Pressable><View><Text style={calendar.monthTitle}>{monthNames[month.getMonth()]} {month.getFullYear()}</Text><Text style={calendar.monthSubtitle}>{data?.average_cycle ? `Average cycle ${data.average_cycle} days` : 'Cycle history building'}</Text></View><Pressable onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><Text style={calendar.arrow}>›</Text></Pressable></View>
      <View style={theme.card}><View style={calendar.legend}><Legend color={colors.burgundy} label="Confirmed" /><Legend color={colors.rose} label="Predicted" /><Legend color={colors.plum} label="Today" /></View><View style={calendar.week}><Text>S</Text><Text>M</Text><Text>T</Text><Text>W</Text><Text>T</Text><Text>F</Text><Text>S</Text></View><View style={calendar.grid}>{cells.map((date, index) => { const isConfirmed = !!date && confirmed.has(date); const isPredicted = !!date && date === predicted; const isToday = !!date && date === key(new Date()); const isSelected = !!date && date === selected; return <Pressable key={`${date}-${index}`} disabled={!date} onPress={() => date && setSelected(date)} style={[calendar.cell, isSelected && calendar.selectedCell, isConfirmed && calendar.confirmedCell, isPredicted && calendar.predictedCell, isToday && calendar.todayCell]}><Text style={[calendar.cellText, (isConfirmed || isPredicted || isToday) && calendar.markedText]}>{date ? Number(date.slice(-2)) : ''}</Text></Pressable>; })}</View></View>
      <View style={calendar.selectedCard}><Text style={theme.eyebrow}>SELECTED DATE</Text><Text style={calendar.selectedTitle}>{selectedLabel}</Text><Text style={calendar.selectedDetail}>{confirmed.has(selected) ? 'Confirmed period' : predicted === selected ? 'Predicted period estimate' : 'No period recorded'}</Text></View>
    </>}
  </Page><BottomNav active="calendar" onChange={onNavigate} /></View>;
}
function Legend({ color, label }: { color: string; label: string }) { return <View style={calendar.legendItem}><View style={[calendar.legendDot, { backgroundColor: color }]} /><Text style={calendar.legendText}>{label}</Text></View>; }
const calendar = StyleSheet.create({ monthHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.mist, borderRadius: 25, padding: 13, marginBottom: 16 }, monthTitle: { color: colors.ink, textAlign: 'center', fontSize: 21, fontWeight: '700' }, monthSubtitle: { color: colors.muted, textAlign: 'center', fontSize: 12, marginTop: 3 }, arrow: { color: colors.burgundy, fontSize: 30, paddingHorizontal: 9 }, legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingBottom: 17, borderBottomWidth: 1, borderBottomColor: colors.line }, legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 }, legendDot: { width: 11, height: 11, borderRadius: 6 }, legendText: { color: colors.muted, fontSize: 12 }, week: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 15 }, grid: { flexDirection: 'row', flexWrap: 'wrap' }, cell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 22 }, cellText: { color: colors.ink, fontSize: 13 }, selectedCell: { borderWidth: 2, borderColor: colors.rose }, confirmedCell: { backgroundColor: colors.burgundy }, predictedCell: { backgroundColor: colors.blush }, todayCell: { borderWidth: 2, borderColor: colors.plum }, markedText: { color: colors.paper, fontWeight: '700' }, selectedCard: { backgroundColor: colors.mist, borderRadius: 22, padding: 20, marginTop: 17 }, selectedTitle: { color: colors.ink, fontSize: 21, fontWeight: '700', marginTop: 8 }, selectedDetail: { color: colors.burgundy, marginTop: 8 } });
