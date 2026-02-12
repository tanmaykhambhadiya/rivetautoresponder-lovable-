export type AppRole = 'admin' | 'editor' | 'viewer' | 'super_admin';

export type EmailStatus = 'pending' | 'sent' | 'failed' | 'blocked';

export type EmailClassification = 'nhs_shift_asking' | 'nhs_shift_confirmed' | 'other';

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

export interface Nurse {
  id: string;
  name: string;
  grade: string;
  units: string[];
  created_at: string;
  updated_at: string;
}

export interface NurseAvailability {
  id: string;
  nurse_id: string;
  available_date: string;
  shift_start: string;
  shift_end: string;
  unit: string;
  is_assigned: boolean;
  created_at: string;
  nurse?: Nurse;
}

export interface ApprovedSender {
  id: string;
  email: string;
  name: string | null;
  is_active: boolean;
  created_at: string;
}

export interface EmailLog {
  id: string;
  sender_email: string;
  subject: string | null;
  body: string | null;
  classification: EmailClassification | null;
  shift_date: string | null;
  shift_start: string | null;
  shift_end: string | null;
  unit: string | null;
  grade: string | null;
  matched_nurse_id: string | null;
  response_body: string | null;
  status: EmailStatus;
  error_message: string | null;
  processed_at: string | null;
  created_at: string;
  nurse?: Nurse;
  retry_count?: number;
  last_retry_at?: string | null;
  response_time_ms?: number | null;
}

export interface Prompt {
  id: string;
  name: string;
  content: string;
  description: string | null;
  is_active: boolean;
  updated_at: string;
  updated_by: string | null;
}

export interface MatchingRule {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  priority: number;
  created_at: string;
}

export interface SystemSetting {
  id: string;
  key: string;
  value: any;
  updated_at: string;
  updated_by: string | null;
}

export interface Report {
  id: string;
  report_type: string;
  period_start: string;
  period_end: string;
  data: any;
  generated_at: string;
}

export interface ShiftAssignment {
  id: string;
  nurse_id: string;
  email_log_id: string | null;
  shift_date: string;
  shift_start: string;
  shift_end: string;
  unit: string;
  grade: string;
  created_at: string;
  nurse?: Nurse;
  email_log?: EmailLog;
}