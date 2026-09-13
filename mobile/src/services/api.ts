import { AddPeriodResponse, AssistantResponse, FamilyResponse, PeriodResponse, Reminder, ReminderSettings, Role, UserProfile } from '../types';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://127.0.0.1:8000';

type LoginResponse = { access_token: string; token_type: string; user: UserProfile };
type RegisterResponse = UserProfile;

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = typeof body.detail === 'string' ? body.detail : 'Unable to reach CycleCare right now.';
    throw new Error(detail);
  }
  return body as T;
}

export const api = {
  login: (email: string, password: string) =>
    request<LoginResponse>('/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (name: string, email: string, password: string, role: Role) =>
    request<RegisterResponse>('/register', { method: 'POST', body: JSON.stringify({ name, email, password, role }) }),
  getPeriods: (token: string) => request<PeriodResponse>('/periods', {}, token),
  addPeriod: (token: string, startDate: string) =>
    request<AddPeriodResponse>('/periods', { method: 'POST', body: JSON.stringify({ start_date: startDate }) }, token),
  getFamilyPeriods: (token: string) => request<FamilyResponse>('/family/periods', {}, token),
  getReminderSettings: (token: string) => request<ReminderSettings>('/reminders/settings', {}, token),
  updateReminderSettings: (token: string, settings: Omit<ReminderSettings, 'updated_at'>) =>
    request<ReminderSettings>('/reminders/settings', { method: 'PUT', body: JSON.stringify(settings) }, token),
  getReminders: (token: string) => request<{ reminders: Reminder[] }>('/reminders', {}, token),
  assistant: (token: string, message: string, confirm = false) =>
    request<AssistantResponse>('/assistant', { method: 'POST', body: JSON.stringify({ message, confirm }) }, token),
};
