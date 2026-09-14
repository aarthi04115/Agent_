export type Role = 'user' | 'mom';

export type UserProfile = {
  id: number;
  name: string;
  email: string;
  role: Role;
};

export type PeriodResponse = {
  periods: string[];
  cycle_lengths: number[];
  average_cycle: number | null;
  predicted_next_period: string | null;
  current_cycle_day: number | null;
};

export type AddPeriodResponse = PeriodResponse & {
  message: string;
  start_date: string;
};

export type FamilyMember = {
  name: string;
  role: Role;
  periods: string[];
  average_cycle: number | null;
  predicted_next_period: string | null;
  current_cycle_day: number | null;
};

export type FamilyResponse = {
  family: FamilyMember[];
};

export type ReminderSettings = {
  period_checkin_enabled: boolean;
  upcoming_enabled: boolean;
  upcoming_timing: '3_days' | '1_day' | 'both';
  timezone: string;
  updated_at: string;
};

export type Reminder = {
  id: number;
  notification_type: 'period_checkin' | 'upcoming_3_days' | 'upcoming_1_day';
  scheduled_for: string;
  prediction_date: string;
  status: string;
};

export type AssistantResponse = {
  response: string;
  action?: 'confirm_record_period' | null;
};
