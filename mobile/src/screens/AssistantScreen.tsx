import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppHeader, BottomNav, Page } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { colors, styles as theme } from '../theme';

type Message = { id: string; role: 'user' | 'assistant'; content: string };

export function AssistantScreen({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { token } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmationPending, setConfirmationPending] = useState(false);

  async function send(message = draft, confirm = false) {
    const trimmed = message.trim();
    if (!token || !trimmed || loading) return;
    setDraft('');
    setError('');
    setLoading(true);
    setMessages(current => [...current, { id: `${Date.now()}-user`, role: 'user', content: trimmed }]);
    try {
      const result = await api.assistant(token, trimmed, confirm);
      setMessages(current => [...current, { id: `${Date.now()}-assistant`, role: 'assistant', content: result.response }]);
      setConfirmationPending(result.action === 'confirm_record_period');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The assistant is unavailable right now.');
    } finally {
      setLoading(false);
    }
  }

  return <KeyboardAvoidingView style={theme.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><AppHeader subtitle="Assistant" /><Page>
    {messages.length === 0 && <View style={assistant.hero}><View style={assistant.orbit}><Text style={assistant.orbitText}>✦</Text></View><Text style={theme.eyebrow}>YOUR CYCLE COMPANION</Text><Text style={theme.title}>What would you like to know?</Text><Text style={theme.subtitle}>Ask about menstrual wellness or your own verified cycle history.</Text><View style={assistant.suggestions}>{['What is a menstrual cycle?', 'When was my last period?', 'What is my average cycle?'].map(question => <Pressable key={question} onPress={() => send(question)} style={assistant.suggestion}><Text style={assistant.suggestionText}>{question}</Text></Pressable>)}</View></View>}
    {messages.map(message => <View key={message.id} style={[assistant.message, message.role === 'user' ? assistant.userMessage : assistant.assistantMessage]}><Text style={assistant.messageLabel}>{message.role === 'user' ? 'You' : 'CycleCare'}</Text><Text style={[assistant.messageText, message.role === 'user' && assistant.userMessageText]}>{message.content}</Text></View>)}
    {confirmationPending && <View style={assistant.confirm}><Text style={assistant.confirmText}>This action needs your confirmation.</Text><View style={assistant.confirmRow}><Pressable onPress={() => { setConfirmationPending(false); send('My period started today.', true); }} style={assistant.confirmButton}><Text style={assistant.confirmButtonText}>Confirm record</Text></Pressable><Pressable onPress={() => setConfirmationPending(false)} style={assistant.cancelButton}><Text style={assistant.cancelButtonText}>Cancel</Text></Pressable></View></View>}
    {loading && <View style={assistant.loading}><ActivityIndicator color={colors.burgundy} /><Text style={assistant.loadingText}>CycleCare is thinking...</Text></View>}
    {error && <View style={assistant.error}><Text style={assistant.errorText}>{error}</Text></View>}
    <View style={assistant.composer}><TextInput value={draft} onChangeText={setDraft} onSubmitEditing={() => send()} placeholder="Ask a cycle question..." placeholderTextColor={colors.muted} style={assistant.input} editable={!loading} returnKeyType="send" /><Pressable onPress={() => send()} disabled={loading || !draft.trim()} style={[assistant.send, (loading || !draft.trim()) && { opacity: 0.45 }]}><Text style={assistant.sendText}>↑</Text></Pressable></View>
  </Page><BottomNav active="assistant" onChange={onNavigate} /></KeyboardAvoidingView>;
}

const assistant = StyleSheet.create({ hero: { alignItems: 'center', backgroundColor: colors.lavender, borderRadius: 27, padding: 24, marginBottom: 18 }, orbit: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center', marginBottom: 17 }, orbitText: { color: colors.burgundy, fontSize: 30 }, suggestions: { width: '100%', gap: 8, marginTop: 18 }, suggestion: { backgroundColor: colors.paper, borderRadius: 14, padding: 12 }, suggestionText: { color: colors.plum, fontSize: 13, fontWeight: '700' }, message: { maxWidth: '88%', borderRadius: 18, padding: 14, marginBottom: 10 }, userMessage: { alignSelf: 'flex-end', backgroundColor: colors.plum }, assistantMessage: { alignSelf: 'flex-start', backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line }, messageLabel: { color: colors.rose, fontSize: 10, fontWeight: '800', marginBottom: 5 }, messageText: { color: colors.ink, fontSize: 14, lineHeight: 20 }, userMessageText: { color: colors.paper }, confirm: { backgroundColor: colors.peach, borderRadius: 16, padding: 14, marginBottom: 10 }, confirmText: { color: colors.plum, fontSize: 13, fontWeight: '700' }, confirmRow: { flexDirection: 'row', gap: 8, marginTop: 10 }, confirmButton: { backgroundColor: colors.plum, borderRadius: 12, padding: 10 }, confirmButtonText: { color: colors.paper, fontWeight: '700', fontSize: 12 }, cancelButton: { padding: 10 }, cancelButtonText: { color: colors.burgundy, fontWeight: '700', fontSize: 12 }, loading: { flexDirection: 'row', gap: 8, alignItems: 'center', padding: 10 }, loadingText: { color: colors.muted, fontSize: 12 }, error: { backgroundColor: colors.warning, borderRadius: 12, padding: 11, marginBottom: 10 }, errorText: { color: colors.burgundy, fontSize: 13 }, composer: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.paper, borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 6, marginTop: 8 }, input: { flex: 1, color: colors.ink, paddingHorizontal: 10, minHeight: 42 }, send: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.plum, alignItems: 'center', justifyContent: 'center' }, sendText: { color: colors.paper, fontSize: 22, fontWeight: '700' } });
