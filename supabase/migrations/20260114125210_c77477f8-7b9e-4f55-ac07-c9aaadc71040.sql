
-- Phase 1: Create helper function to get user's organization
CREATE OR REPLACE FUNCTION public.get_user_organization_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT organization_id FROM public.profiles WHERE id = _user_id
$$;

-- Phase 2: Add organization_id to all relevant tables
ALTER TABLE public.nurses ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.units ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.approved_senders ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.email_accounts ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.inbox_emails ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.email_logs ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.nurse_availability ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.shift_assignments ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.prompts ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.matching_rules ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.booking_rules ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.system_settings ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.reports ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.access_requests ADD COLUMN organization_id uuid REFERENCES public.organizations(id);

-- Phase 3: Drop existing RLS policies and create organization-scoped ones

-- NURSES TABLE
DROP POLICY IF EXISTS "Authenticated users can view nurses" ON public.nurses;
DROP POLICY IF EXISTS "Admins and editors can insert nurses" ON public.nurses;
DROP POLICY IF EXISTS "Admins and editors can update nurses" ON public.nurses;
DROP POLICY IF EXISTS "Admins can delete nurses" ON public.nurses;
DROP POLICY IF EXISTS "Super admin full access to nurses" ON public.nurses;

CREATE POLICY "View org nurses" ON public.nurses FOR SELECT
USING (is_super_admin(auth.uid()) OR organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Insert org nurses" ON public.nurses FOR INSERT
WITH CHECK (is_super_admin(auth.uid()) OR (organization_id = get_user_organization_id(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'editor'))));

CREATE POLICY "Update org nurses" ON public.nurses FOR UPDATE
USING (is_super_admin(auth.uid()) OR (organization_id = get_user_organization_id(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'editor'))));

CREATE POLICY "Delete org nurses" ON public.nurses FOR DELETE
USING (is_super_admin(auth.uid()) OR (organization_id = get_user_organization_id(auth.uid()) AND has_role(auth.uid(), 'admin')));

-- UNITS TABLE
DROP POLICY IF EXISTS "Authenticated users can view units" ON public.units;
DROP POLICY IF EXISTS "Admins and editors can manage units" ON public.units;
DROP POLICY IF EXISTS "Super admin full access to units" ON public.units;

CREATE POLICY "View org units" ON public.units FOR SELECT
USING (is_super_admin(auth.uid()) OR organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Manage org units" ON public.units FOR ALL
USING (is_super_admin(auth.uid()) OR (organization_id = get_user_organization_id(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'editor'))));

-- APPROVED_SENDERS TABLE
DROP POLICY IF EXISTS "Authenticated users can view senders" ON public.approved_senders;
DROP POLICY IF EXISTS "Admins can manage senders" ON public.approved_senders;
DROP POLICY IF EXISTS "Super admin full access to approved_senders" ON public.approved_senders;

CREATE POLICY "View org senders" ON public.approved_senders FOR SELECT
USING (is_super_admin(auth.uid()) OR organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Manage org senders" ON public.approved_senders FOR ALL
USING (is_super_admin(auth.uid()) OR (organization_id = get_user_organization_id(auth.uid()) AND has_role(auth.uid(), 'admin')));

-- EMAIL_ACCOUNTS TABLE
DROP POLICY IF EXISTS "Users can view their own email accounts" ON public.email_accounts;
DROP POLICY IF EXISTS "Users can insert their own email accounts" ON public.email_accounts;
DROP POLICY IF EXISTS "Users can update their own email accounts" ON public.email_accounts;
DROP POLICY IF EXISTS "Users can delete their own email accounts" ON public.email_accounts;
DROP POLICY IF EXISTS "Service role can manage all accounts" ON public.email_accounts;

CREATE POLICY "View org email accounts" ON public.email_accounts FOR SELECT
USING (is_super_admin(auth.uid()) OR organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Manage own email accounts" ON public.email_accounts FOR ALL
USING (is_super_admin(auth.uid()) OR (auth.uid() = user_id AND organization_id = get_user_organization_id(auth.uid())));

CREATE POLICY "Service role manage accounts" ON public.email_accounts FOR ALL
USING ((auth.jwt() ->> 'role') = 'service_role');

-- INBOX_EMAILS TABLE
DROP POLICY IF EXISTS "Users can view their own emails" ON public.inbox_emails;
DROP POLICY IF EXISTS "Users can update their own emails" ON public.inbox_emails;
DROP POLICY IF EXISTS "Users can delete their own emails" ON public.inbox_emails;
DROP POLICY IF EXISTS "Service role can insert emails" ON public.inbox_emails;

CREATE POLICY "View org inbox emails" ON public.inbox_emails FOR SELECT
USING (is_super_admin(auth.uid()) OR organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Update org inbox emails" ON public.inbox_emails FOR UPDATE
USING (is_super_admin(auth.uid()) OR organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Delete org inbox emails" ON public.inbox_emails FOR DELETE
USING (is_super_admin(auth.uid()) OR organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Service role insert inbox emails" ON public.inbox_emails FOR INSERT
WITH CHECK ((auth.jwt() ->> 'role') = 'service_role' OR organization_id = get_user_organization_id(auth.uid()));

-- EMAIL_LOGS TABLE
DROP POLICY IF EXISTS "Authenticated users can view logs" ON public.email_logs;
DROP POLICY IF EXISTS "System can insert logs" ON public.email_logs;
DROP POLICY IF EXISTS "System can update logs" ON public.email_logs;
DROP POLICY IF EXISTS "Super admin full access to email_logs" ON public.email_logs;

CREATE POLICY "View org email logs" ON public.email_logs FOR SELECT
USING (is_super_admin(auth.uid()) OR organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Insert org email logs" ON public.email_logs FOR INSERT
WITH CHECK (is_super_admin(auth.uid()) OR organization_id = get_user_organization_id(auth.uid()) OR (auth.jwt() ->> 'role') = 'service_role');

CREATE POLICY "Update org email logs" ON public.email_logs FOR UPDATE
USING (is_super_admin(auth.uid()) OR organization_id = get_user_organization_id(auth.uid()) OR (auth.jwt() ->> 'role') = 'service_role');

-- NURSE_AVAILABILITY TABLE
DROP POLICY IF EXISTS "Authenticated users can view availability" ON public.nurse_availability;
DROP POLICY IF EXISTS "Admins and editors can insert availability" ON public.nurse_availability;
DROP POLICY IF EXISTS "Admins and editors can update availability" ON public.nurse_availability;
DROP POLICY IF EXISTS "Admins can delete availability" ON public.nurse_availability;
DROP POLICY IF EXISTS "Super admin full access to nurse_availability" ON public.nurse_availability;

CREATE POLICY "View org availability" ON public.nurse_availability FOR SELECT
USING (is_super_admin(auth.uid()) OR organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Insert org availability" ON public.nurse_availability FOR INSERT
WITH CHECK (is_super_admin(auth.uid()) OR (organization_id = get_user_organization_id(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'editor'))));

CREATE POLICY "Update org availability" ON public.nurse_availability FOR UPDATE
USING (is_super_admin(auth.uid()) OR (organization_id = get_user_organization_id(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'editor'))));

CREATE POLICY "Delete org availability" ON public.nurse_availability FOR DELETE
USING (is_super_admin(auth.uid()) OR (organization_id = get_user_organization_id(auth.uid()) AND has_role(auth.uid(), 'admin')));

-- SHIFT_ASSIGNMENTS TABLE
DROP POLICY IF EXISTS "Authenticated users can view assignments" ON public.shift_assignments;
DROP POLICY IF EXISTS "System can manage assignments" ON public.shift_assignments;
DROP POLICY IF EXISTS "Super admin full access to shift_assignments" ON public.shift_assignments;

CREATE POLICY "View org assignments" ON public.shift_assignments FOR SELECT
USING (is_super_admin(auth.uid()) OR organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Manage org assignments" ON public.shift_assignments FOR ALL
USING (is_super_admin(auth.uid()) OR organization_id = get_user_organization_id(auth.uid()) OR (auth.jwt() ->> 'role') = 'service_role');

-- PROMPTS TABLE
DROP POLICY IF EXISTS "Authenticated users can view prompts" ON public.prompts;
DROP POLICY IF EXISTS "Admins and editors can manage prompts" ON public.prompts;
DROP POLICY IF EXISTS "Super admin full access to prompts" ON public.prompts;

CREATE POLICY "View org prompts" ON public.prompts FOR SELECT
USING (is_super_admin(auth.uid()) OR organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Manage org prompts" ON public.prompts FOR ALL
USING (is_super_admin(auth.uid()) OR (organization_id = get_user_organization_id(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'editor'))));

-- MATCHING_RULES TABLE
DROP POLICY IF EXISTS "Authenticated users can view rules" ON public.matching_rules;
DROP POLICY IF EXISTS "Admins and editors can manage rules" ON public.matching_rules;
DROP POLICY IF EXISTS "Super admin full access to matching_rules" ON public.matching_rules;

CREATE POLICY "View org matching rules" ON public.matching_rules FOR SELECT
USING (is_super_admin(auth.uid()) OR organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Manage org matching rules" ON public.matching_rules FOR ALL
USING (is_super_admin(auth.uid()) OR (organization_id = get_user_organization_id(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'editor'))));

-- BOOKING_RULES TABLE
DROP POLICY IF EXISTS "Authenticated users can view booking rules" ON public.booking_rules;
DROP POLICY IF EXISTS "Admins can manage booking rules" ON public.booking_rules;
DROP POLICY IF EXISTS "Super admin full access to booking_rules" ON public.booking_rules;

CREATE POLICY "View org booking rules" ON public.booking_rules FOR SELECT
USING (is_super_admin(auth.uid()) OR organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Manage org booking rules" ON public.booking_rules FOR ALL
USING (is_super_admin(auth.uid()) OR (organization_id = get_user_organization_id(auth.uid()) AND has_role(auth.uid(), 'admin')));

-- SYSTEM_SETTINGS TABLE
DROP POLICY IF EXISTS "Authenticated users can view settings" ON public.system_settings;
DROP POLICY IF EXISTS "Admins can manage settings" ON public.system_settings;
DROP POLICY IF EXISTS "Super admin full access to system_settings" ON public.system_settings;

CREATE POLICY "View org settings" ON public.system_settings FOR SELECT
USING (is_super_admin(auth.uid()) OR organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Manage org settings" ON public.system_settings FOR ALL
USING (is_super_admin(auth.uid()) OR (organization_id = get_user_organization_id(auth.uid()) AND has_role(auth.uid(), 'admin')));

-- REPORTS TABLE
DROP POLICY IF EXISTS "Authenticated users can view reports" ON public.reports;
DROP POLICY IF EXISTS "System can insert reports" ON public.reports;
DROP POLICY IF EXISTS "Super admin full access to reports" ON public.reports;

CREATE POLICY "View org reports" ON public.reports FOR SELECT
USING (is_super_admin(auth.uid()) OR organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Insert org reports" ON public.reports FOR INSERT
WITH CHECK (is_super_admin(auth.uid()) OR organization_id = get_user_organization_id(auth.uid()));

-- ACCESS_REQUESTS TABLE
DROP POLICY IF EXISTS "Users can view own request" ON public.access_requests;
DROP POLICY IF EXISTS "Users can request access" ON public.access_requests;
DROP POLICY IF EXISTS "Admins can view all requests" ON public.access_requests;
DROP POLICY IF EXISTS "Admins can update requests" ON public.access_requests;
DROP POLICY IF EXISTS "Super admin full access to access_requests" ON public.access_requests;

CREATE POLICY "View own request" ON public.access_requests FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Request access" ON public.access_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin view org requests" ON public.access_requests FOR SELECT
USING (is_super_admin(auth.uid()) OR (organization_id = get_user_organization_id(auth.uid()) AND has_role(auth.uid(), 'admin')));

CREATE POLICY "Admin update org requests" ON public.access_requests FOR UPDATE
USING (is_super_admin(auth.uid()) OR (organization_id = get_user_organization_id(auth.uid()) AND has_role(auth.uid(), 'admin')));
