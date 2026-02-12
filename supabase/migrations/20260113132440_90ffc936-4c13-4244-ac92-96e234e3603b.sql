-- Add new columns to email_logs for tracking response time and retries
ALTER TABLE public.email_logs 
ADD COLUMN IF NOT EXISTS retry_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_retry_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS response_time_ms integer;

-- Insert new system settings for auto-response configuration
INSERT INTO public.system_settings (key, value) VALUES
  ('response_delay_seconds', '0'),
  ('max_response_time_seconds', '30'),
  ('retry_failed_emails', 'true'),
  ('max_retry_attempts', '3'),
  ('retry_delay_minutes', '5'),
  ('send_on_no_match', 'false'),
  ('include_shift_table', 'true'),
  ('include_nurse_contact', 'false'),
  ('instant_response_mode', 'true'),
  ('notify_admin_on_failure', 'false'),
  ('admin_notification_email', '""')
ON CONFLICT (key) DO NOTHING;

-- Insert response template prompt
INSERT INTO public.prompts (name, content, description, is_active) VALUES
  ('response_template', '<h2>NHS Shift Assignment Confirmation</h2>
<p>Dear Team,</p>
<p>We have successfully matched the following nurse(s) for the requested shift(s):</p>
{{shifts_table}}
<p>Please confirm receipt of this assignment.</p>
<p>Best regards,<br>NHS Staffing Team</p>', 'Email template for automated shift assignment responses. Use placeholders: {{nurse_name}}, {{shift_date}}, {{shift_time}}, {{shift_unit}}, {{shift_grade}}, {{shifts_table}}', true)
ON CONFLICT DO NOTHING;