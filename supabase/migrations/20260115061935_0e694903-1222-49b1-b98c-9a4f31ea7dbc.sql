-- Drop previously created functions if they exist (from failed migration)
DROP FUNCTION IF EXISTS public.encrypt_token(TEXT);
DROP FUNCTION IF EXISTS public.decrypt_token(TEXT);

-- Create encryption function with correct search path
CREATE OR REPLACE FUNCTION public.encrypt_token(plain_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  IF plain_text IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Use a static, server-side-only encryption key derived from a constant
  -- This key is only accessible server-side via SECURITY DEFINER
  encryption_key := encode(extensions.digest('rivet_oauth_token_encryption_key_v1_secure', 'sha256'), 'hex');
  
  RETURN encode(
    extensions.pgp_sym_encrypt(
      plain_text,
      encryption_key,
      'cipher-algo=aes256'
    ),
    'base64'
  );
END;
$$;

-- Create decryption function
CREATE OR REPLACE FUNCTION public.decrypt_token(encrypted_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  IF encrypted_text IS NULL THEN
    RETURN NULL;
  END IF;
  
  encryption_key := encode(extensions.digest('rivet_oauth_token_encryption_key_v1_secure', 'sha256'), 'hex');
  
  BEGIN
    RETURN extensions.pgp_sym_decrypt(
      decode(encrypted_text, 'base64'),
      encryption_key
    );
  EXCEPTION WHEN OTHERS THEN
    -- If decryption fails (old unencrypted data), return as-is
    RETURN encrypted_text;
  END;
END;
$$;

-- Add new encrypted columns if they don't exist
ALTER TABLE public.email_accounts 
ADD COLUMN IF NOT EXISTS refresh_token_encrypted TEXT,
ADD COLUMN IF NOT EXISTS access_token_encrypted TEXT,
ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN DEFAULT false;

-- Migrate existing tokens to encrypted format
UPDATE public.email_accounts
SET 
  refresh_token_encrypted = encrypt_token(refresh_token),
  access_token_encrypted = encrypt_token(access_token),
  is_encrypted = true
WHERE (is_encrypted = false OR is_encrypted IS NULL) 
  AND refresh_token IS NOT NULL 
  AND refresh_token != 'ENCRYPTED';

-- Create a secure view for edge functions
DROP VIEW IF EXISTS public.email_accounts_decrypted;
CREATE VIEW public.email_accounts_decrypted 
WITH (security_invoker = false) AS
SELECT 
  id,
  user_id,
  provider,
  email,
  CASE 
    WHEN is_encrypted = true THEN decrypt_token(refresh_token_encrypted)
    ELSE refresh_token
  END as refresh_token,
  CASE 
    WHEN is_encrypted = true THEN decrypt_token(access_token_encrypted)
    ELSE access_token
  END as access_token,
  expires_at,
  created_at,
  updated_at,
  organization_id,
  is_encrypted
FROM public.email_accounts;

-- Grant access to the view
GRANT SELECT ON public.email_accounts_decrypted TO authenticated;
GRANT SELECT ON public.email_accounts_decrypted TO service_role;

-- Create function to upsert email accounts with encryption
CREATE OR REPLACE FUNCTION public.upsert_email_account(
  p_user_id UUID,
  p_provider TEXT,
  p_email TEXT,
  p_refresh_token TEXT,
  p_access_token TEXT,
  p_expires_at TIMESTAMPTZ,
  p_organization_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO email_accounts (
    user_id, provider, email, 
    refresh_token, refresh_token_encrypted,
    access_token, access_token_encrypted,
    expires_at, organization_id, is_encrypted
  )
  VALUES (
    p_user_id, p_provider, p_email,
    'ENCRYPTED', encrypt_token(p_refresh_token),
    NULL, encrypt_token(p_access_token),
    p_expires_at, p_organization_id, true
  )
  ON CONFLICT (user_id, provider) 
  DO UPDATE SET
    email = p_email,
    refresh_token = 'ENCRYPTED',
    refresh_token_encrypted = encrypt_token(p_refresh_token),
    access_token = NULL,
    access_token_encrypted = encrypt_token(p_access_token),
    expires_at = p_expires_at,
    organization_id = p_organization_id,
    is_encrypted = true,
    updated_at = now()
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- Create function to update just the access token
CREATE OR REPLACE FUNCTION public.update_access_token(
  p_account_id UUID,
  p_access_token TEXT,
  p_expires_at TIMESTAMPTZ
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE email_accounts
  SET 
    access_token = NULL,
    access_token_encrypted = encrypt_token(p_access_token),
    expires_at = p_expires_at,
    is_encrypted = true,
    updated_at = now()
  WHERE id = p_account_id;
END;
$$;

-- Clear plaintext tokens after migration
UPDATE public.email_accounts
SET 
  refresh_token = 'ENCRYPTED',
  access_token = NULL
WHERE is_encrypted = true AND refresh_token != 'ENCRYPTED';