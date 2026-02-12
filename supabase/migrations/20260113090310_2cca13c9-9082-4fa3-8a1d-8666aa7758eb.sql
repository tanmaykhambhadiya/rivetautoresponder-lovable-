-- Create email_accounts table for storing user OAuth tokens
CREATE TABLE public.email_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('outlook', 'gmail')),
  email TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  access_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
);

-- Enable Row Level Security
ALTER TABLE public.email_accounts ENABLE ROW LEVEL SECURITY;

-- Users can only view their own email accounts
CREATE POLICY "Users can view their own email accounts"
ON public.email_accounts
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own email accounts
CREATE POLICY "Users can insert their own email accounts"
ON public.email_accounts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own email accounts
CREATE POLICY "Users can update their own email accounts"
ON public.email_accounts
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own email accounts
CREATE POLICY "Users can delete their own email accounts"
ON public.email_accounts
FOR DELETE
USING (auth.uid() = user_id);

-- Service role can manage all accounts (for edge functions)
CREATE POLICY "Service role can manage all accounts"
ON public.email_accounts
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_email_accounts_updated_at
BEFORE UPDATE ON public.email_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();