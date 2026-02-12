-- Drop the existing insert policy on inbox_emails
DROP POLICY IF EXISTS "System can insert emails" ON public.inbox_emails;

-- Create a new policy that allows service role to insert
CREATE POLICY "Service role or authenticated can insert emails" 
ON public.inbox_emails 
FOR INSERT 
WITH CHECK (
  ((auth.jwt() ->> 'role'::text) = 'service_role'::text)
  OR has_any_role(auth.uid())
);