-- Add user_id column to inbox_emails to scope emails per user
ALTER TABLE public.inbox_emails 
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add provider column to track email source
ALTER TABLE public.inbox_emails 
ADD COLUMN provider text DEFAULT 'outlook';

-- Create index for faster user-scoped queries
CREATE INDEX idx_inbox_emails_user_id ON public.inbox_emails(user_id);

-- Drop existing RLS policies and recreate with user scoping
DROP POLICY IF EXISTS "Service role or authenticated can insert emails" ON public.inbox_emails;
DROP POLICY IF EXISTS "Authenticated users can view emails" ON public.inbox_emails;
DROP POLICY IF EXISTS "Authenticated users can update emails" ON public.inbox_emails;
DROP POLICY IF EXISTS "Admins can delete emails" ON public.inbox_emails;

-- Users can only see their own emails
CREATE POLICY "Users can view their own emails"
ON public.inbox_emails
FOR SELECT
USING (auth.uid() = user_id);

-- Service role can insert any emails (for sync functions)
CREATE POLICY "Service role can insert emails"
ON public.inbox_emails
FOR INSERT
WITH CHECK (((auth.jwt() ->> 'role'::text) = 'service_role'::text) OR (auth.uid() = user_id));

-- Users can update their own emails
CREATE POLICY "Users can update their own emails"
ON public.inbox_emails
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own emails
CREATE POLICY "Users can delete their own emails"
ON public.inbox_emails
FOR DELETE
USING (auth.uid() = user_id);