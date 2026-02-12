-- Create table for storing synced Outlook emails
CREATE TABLE public.inbox_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  outlook_message_id TEXT NOT NULL UNIQUE,
  from_email TEXT NOT NULL,
  from_name TEXT,
  subject TEXT,
  body_preview TEXT,
  body TEXT,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_starred BOOLEAN NOT NULL DEFAULT false,
  has_attachments BOOLEAN NOT NULL DEFAULT false,
  category TEXT NOT NULL DEFAULT 'other',
  importance TEXT DEFAULT 'normal',
  synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_inbox_emails_received_at ON public.inbox_emails(received_at DESC);
CREATE INDEX idx_inbox_emails_is_read ON public.inbox_emails(is_read);
CREATE INDEX idx_inbox_emails_category ON public.inbox_emails(category);

-- Enable RLS
ALTER TABLE public.inbox_emails ENABLE ROW LEVEL SECURITY;

-- Policies for inbox_emails
CREATE POLICY "Authenticated users can view emails"
ON public.inbox_emails
FOR SELECT
USING (has_any_role(auth.uid()));

CREATE POLICY "Authenticated users can update emails"
ON public.inbox_emails
FOR UPDATE
USING (has_any_role(auth.uid()));

CREATE POLICY "System can insert emails"
ON public.inbox_emails
FOR INSERT
WITH CHECK (has_any_role(auth.uid()));

CREATE POLICY "Admins can delete emails"
ON public.inbox_emails
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));