-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'editor', 'viewer');

-- Create enum for email status
CREATE TYPE public.email_status AS ENUM ('pending', 'sent', 'failed', 'blocked');

-- Create enum for email classification
CREATE TYPE public.email_classification AS ENUM ('nhs_shift_asking', 'nhs_shift_confirmed', 'other');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'viewer',
  UNIQUE (user_id, role)
);

-- Create nurses table
CREATE TABLE public.nurses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  grade TEXT NOT NULL,
  units TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create nurse_availability table
CREATE TABLE public.nurse_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nurse_id UUID NOT NULL REFERENCES public.nurses(id) ON DELETE CASCADE,
  available_date DATE NOT NULL,
  shift_start TIME NOT NULL,
  shift_end TIME NOT NULL,
  unit TEXT NOT NULL,
  is_assigned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create approved_senders table
CREATE TABLE public.approved_senders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create email_logs table
CREATE TABLE public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_email TEXT NOT NULL,
  subject TEXT,
  body TEXT,
  classification email_classification,
  shift_date DATE,
  shift_start TIME,
  shift_end TIME,
  unit TEXT,
  grade TEXT,
  matched_nurse_id UUID REFERENCES public.nurses(id),
  response_body TEXT,
  status email_status NOT NULL DEFAULT 'pending',
  error_message TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create prompts table
CREATE TABLE public.prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Create matching_rules table
CREATE TABLE public.matching_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create system_settings table
CREATE TABLE public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Create reports table
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  data JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create shift_assignments table (for calendar view)
CREATE TABLE public.shift_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nurse_id UUID NOT NULL REFERENCES public.nurses(id) ON DELETE CASCADE,
  email_log_id UUID REFERENCES public.email_logs(id),
  shift_date DATE NOT NULL,
  shift_start TIME NOT NULL,
  shift_end TIME NOT NULL,
  unit TEXT NOT NULL,
  grade TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nurses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nurse_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approved_senders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matching_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_assignments ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if user has any role
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
  )
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid());

-- RLS Policies for user_roles (only admins can manage)
CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR user_id = auth.uid());

CREATE POLICY "Admins can insert roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for nurses (authenticated users with any role can view)
CREATE POLICY "Authenticated users can view nurses"
ON public.nurses FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid()));

CREATE POLICY "Admins and editors can insert nurses"
ON public.nurses FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

CREATE POLICY "Admins and editors can update nurses"
ON public.nurses FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

CREATE POLICY "Admins can delete nurses"
ON public.nurses FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for nurse_availability
CREATE POLICY "Authenticated users can view availability"
ON public.nurse_availability FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid()));

CREATE POLICY "Admins and editors can insert availability"
ON public.nurse_availability FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

CREATE POLICY "Admins and editors can update availability"
ON public.nurse_availability FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

CREATE POLICY "Admins can delete availability"
ON public.nurse_availability FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for approved_senders
CREATE POLICY "Authenticated users can view senders"
ON public.approved_senders FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid()));

CREATE POLICY "Admins can manage senders"
ON public.approved_senders FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for email_logs
CREATE POLICY "Authenticated users can view logs"
ON public.email_logs FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid()));

CREATE POLICY "System can insert logs"
ON public.email_logs FOR INSERT
TO authenticated
WITH CHECK (public.has_any_role(auth.uid()));

CREATE POLICY "System can update logs"
ON public.email_logs FOR UPDATE
TO authenticated
USING (public.has_any_role(auth.uid()));

-- RLS Policies for prompts
CREATE POLICY "Authenticated users can view prompts"
ON public.prompts FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid()));

CREATE POLICY "Admins and editors can manage prompts"
ON public.prompts FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

-- RLS Policies for matching_rules
CREATE POLICY "Authenticated users can view rules"
ON public.matching_rules FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid()));

CREATE POLICY "Admins and editors can manage rules"
ON public.matching_rules FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

-- RLS Policies for system_settings
CREATE POLICY "Authenticated users can view settings"
ON public.system_settings FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid()));

CREATE POLICY "Admins can manage settings"
ON public.system_settings FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for reports
CREATE POLICY "Authenticated users can view reports"
ON public.reports FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid()));

CREATE POLICY "System can insert reports"
ON public.reports FOR INSERT
TO authenticated
WITH CHECK (public.has_any_role(auth.uid()));

-- RLS Policies for shift_assignments
CREATE POLICY "Authenticated users can view assignments"
ON public.shift_assignments FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid()));

CREATE POLICY "System can manage assignments"
ON public.shift_assignments FOR ALL
TO authenticated
USING (public.has_any_role(auth.uid()));

-- Create trigger for new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_nurses_updated_at
  BEFORE UPDATE ON public.nurses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_prompts_updated_at
  BEFORE UPDATE ON public.prompts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default prompts
INSERT INTO public.prompts (name, content, description) VALUES
('email_classifier', 'You are an email classifier. Classify the following email into one of these categories:
1. "nhs_shift_asking" - Email is requesting NHS shift workers
2. "nhs_shift_confirmed" - Email is confirming a shift booking
3. "other" - Email does not match either category

Respond with ONLY the category name, nothing else.', 'Prompt for classifying incoming emails'),
('shift_matcher', 'You are a shift matching assistant for NHS. Given an email requesting shift workers and a list of available nurses, match the best available nurse to each shift request.

Rules:
1. Match exact Date, Start time, End time, Unit, and Grade
2. Never allocate the same nurse to more than one shift on the same date with overlapping times
3. Each shift request gets exactly one nurse
4. If no matching nurse is available, respond with "NO_MATCH"
5. Respond in JSON format: {"nurse_id": "uuid", "nurse_name": "name"}', 'Prompt for matching nurses to shifts');

-- Insert default matching rules
INSERT INTO public.matching_rules (name, description, is_active, priority) VALUES
('exact_match', 'Match exact Date, Start, End, Unit, and Grade', true, 1),
('no_double_booking', 'Never allocate same nurse to overlapping shifts', true, 2),
('one_nurse_per_shift', 'Each shift request gets exactly one nurse', true, 3),
('no_reply_if_no_match', 'Do not reply if no matching nurse available', true, 4);

-- Insert default system settings
INSERT INTO public.system_settings (key, value) VALUES
('email_processing_enabled', 'true'),
('auto_response_enabled', 'true'),
('working_hours_start', '"09:00"'),
('working_hours_end', '"17:00"'),
('weekly_report_day', '"sunday"'),
('monthly_report_day', '1');