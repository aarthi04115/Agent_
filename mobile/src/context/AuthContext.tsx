import * as SecureStore from 'expo-secure-store';
import React, { createContext, PropsWithChildren, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { api } from '../services/api';
import { Role, UserProfile } from '../types';

const TOKEN_KEY = 'cyclecare.access_token';
const PROFILE_KEY = 'cyclecare.profile';

const sessionStore = {
  get: (key: string) => Platform.OS === 'web' ? Promise.resolve(globalThis.localStorage?.getItem(key) ?? null) : SecureStore.getItemAsync(key),
  set: (key: string, value: string) => Platform.OS === 'web' ? Promise.resolve(globalThis.localStorage?.setItem(key, value)) : SecureStore.setItemAsync(key, value),
  delete: (key: string) => Platform.OS === 'web' ? Promise.resolve(globalThis.localStorage?.removeItem(key)) : SecureStore.deleteItemAsync(key),
};

type AuthContextValue = {
  token: string | null;
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role: Role) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([sessionStore.get(TOKEN_KEY), sessionStore.get(PROFILE_KEY)])
      .then(([savedToken, savedProfile]) => {
        setToken(savedToken);
        setUser(savedProfile ? JSON.parse(savedProfile) : null);
      })
      .catch(() => setError(null))
      .finally(() => setLoading(false));
  }, []);

  async function establishSession(nextToken: string, profile: UserProfile) {
    await sessionStore.set(TOKEN_KEY, nextToken);
    await sessionStore.set(PROFILE_KEY, JSON.stringify(profile));
    setToken(nextToken);
    setUser(profile);
    setError(null);
  }

  async function login(email: string, password: string) {
    setLoading(true);
    try {
      const result = await api.login(email.trim(), password);
      await establishSession(result.access_token, result.user);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to sign in.');
      throw caught;
    } finally {
      setLoading(false);
    }
  }

  async function register(name: string, email: string, password: string, role: Role) {
    setLoading(true);
    try {
      await api.register(name.trim(), email.trim(), password, role);
      await login(email, password);
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await sessionStore.delete(TOKEN_KEY);
    await sessionStore.delete(PROFILE_KEY);
    setToken(null);
    setUser(null);
    setError(null);
  }

  return <AuthContext.Provider value={{ token, user, loading, error, login, register, logout, clearError: () => setError(null) }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
