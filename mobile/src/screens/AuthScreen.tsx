import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors, styles as theme } from '../theme';
import { Role } from '../types';
import { PrimaryButton } from '../components/UI';

export function AuthScreen() {
  const { login, register, loading, error, clearError } = useAuth();
  const [registering, setRegistering] = useState(false);
  const [name, setName] = useState('Aarthi');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('user');
  const [localError, setLocalError] = useState('');

  async function submit() {
    setLocalError(''); clearError();
    if (!email.trim() || password.length < 6 || (registering && !name.trim())) { setLocalError(registering ? 'Add your name, email, and a password of at least 6 characters.' : 'Enter your email and password.'); return; }
    try { registering ? await register(name, email, password, role) : await login(email, password); } catch { /* AuthContext exposes the server message. */ }
  }

  return <KeyboardAvoidingView style={auth.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View style={auth.hero}><View style={auth.logo}><Text style={auth.logoText}>◔</Text></View><Text style={theme.title}>CycleCare</Text><Text style={theme.subtitle}>Understand your cycle. Care for yourself.</Text></View>
    <View style={auth.form}>
      <Text style={auth.kicker}>{registering ? 'CREATE YOUR SPACE' : 'WELCOME BACK'}</Text>
      <Text style={auth.heading}>{registering ? 'A softer way to track.' : 'Your cycle, at a glance.'}</Text>
      {registering && <TextInput value={name} onChangeText={setName} placeholder="Full name" placeholderTextColor={colors.muted} style={auth.input} />}
      <TextInput value={email} onChangeText={setEmail} placeholder="Email address" placeholderTextColor={colors.muted} autoCapitalize="none" keyboardType="email-address" style={auth.input} />
      <TextInput value={password} onChangeText={setPassword} placeholder="Password" placeholderTextColor={colors.muted} secureTextEntry style={auth.input} />
      {registering && <View><Text style={auth.roleLabel}>I am joining as</Text><View style={auth.roleRow}>{[['user', 'Daughter'], ['sister', 'Sister'], ['mom', 'Mother']].map(([value, label]) => <Pressable key={value} onPress={() => setRole(value as Role)} style={[auth.role, role === value && auth.roleSelected]}><Text style={[auth.roleText, role === value && auth.roleSelectedText]}>{label}</Text></Pressable>)}</View></View>}
      {(localError || error) && <Text style={auth.error}>{localError || error}</Text>}
      <PrimaryButton label={registering ? 'Create account' : 'Sign in'} onPress={submit} loading={loading} />
      <Pressable onPress={() => { setRegistering(!registering); clearError(); setLocalError(''); }}><Text style={auth.switch}>{registering ? 'Already have an account? Sign in' : 'New to CycleCare? Create an account'}</Text></Pressable>
      <Text style={auth.note}>Your data stays connected to your authenticated CycleCare account.</Text>
    </View>
  </KeyboardAvoidingView>;
}

const auth = StyleSheet.create({ page: { flex: 1, backgroundColor: colors.cream, paddingHorizontal: 24, justifyContent: 'center' }, hero: { alignItems: 'center', marginBottom: 35 }, logo: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.blush, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }, logoText: { color: colors.burgundy, fontSize: 44, fontWeight: '700' }, form: { backgroundColor: colors.paper, borderRadius: 28, padding: 22, gap: 13 }, kicker: { color: colors.burgundy, fontSize: 11, fontWeight: '800', letterSpacing: 1.5 }, heading: { color: colors.ink, fontSize: 24, fontWeight: '700', marginBottom: 5 }, input: { minHeight: 52, borderWidth: 1, borderColor: colors.line, borderRadius: 16, paddingHorizontal: 16, color: colors.ink, fontSize: 15, backgroundColor: colors.cream }, switch: { color: colors.burgundy, textAlign: 'center', fontWeight: '700', paddingVertical: 5 }, note: { color: colors.muted, fontSize: 12, textAlign: 'center', lineHeight: 17 }, error: { color: colors.burgundy, backgroundColor: colors.warning, padding: 11, borderRadius: 12, fontSize: 13 }, roleLabel: { color: colors.muted, fontSize: 12, marginBottom: 7 }, roleRow: { flexDirection: 'row', gap: 7 }, role: { flex: 1, borderRadius: 14, borderWidth: 1, borderColor: colors.line, paddingVertical: 11, alignItems: 'center' }, roleSelected: { backgroundColor: colors.plum, borderColor: colors.plum }, roleText: { color: colors.muted, fontSize: 12, fontWeight: '700' }, roleSelectedText: { color: colors.paper } });
