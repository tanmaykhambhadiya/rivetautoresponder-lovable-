import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface EmailAccount {
  id: string;
  user_id: string;
  provider: 'outlook' | 'gmail';
  email: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  organization_id: string | null;
}

export function useEmailAccounts() {
  const { user, organizationId } = useAuth();
  const queryClient = useQueryClient();

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['email-accounts', user?.id],
    queryFn: async (): Promise<EmailAccount[]> => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('email_accounts')
        .select('id, user_id, provider, email, expires_at, created_at, updated_at')
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data as EmailAccount[];
    },
    enabled: !!user?.id,
  });

  const getOutlookAccount = () => accounts.find(a => a.provider === 'outlook');
  const getGmailAccount = () => accounts.find(a => a.provider === 'gmail');

  const disconnectAccount = useMutation({
    mutationFn: async (provider: 'outlook' | 'gmail') => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('email_accounts')
        .delete()
        .eq('user_id', user.id)
        .eq('provider', provider);
      
      if (error) throw error;
    },
    onSuccess: (_, provider) => {
      queryClient.invalidateQueries({ queryKey: ['email-accounts'] });
      toast.success(`${provider === 'outlook' ? 'Outlook' : 'Gmail'} disconnected`);
    },
    onError: (error) => {
      toast.error('Failed to disconnect: ' + error.message);
    },
  });

  const startOutlookOAuth = async () => {
    if (!user?.id) {
      toast.error('Please sign in first');
      return;
    }

    // Get client_id and tenant_id from system_settings
    const { data: settings, error } = await supabase
      .from('system_settings')
      .select('key, value')
      .in('key', ['outlook_client_id', 'outlook_tenant_id']);

    if (error) {
      toast.error('Failed to get Outlook configuration');
      return;
    }

    const clientId = settings?.find(s => s.key === 'outlook_client_id')?.value;
    const tenantId = settings?.find(s => s.key === 'outlook_tenant_id')?.value || 'common';

    if (!clientId) {
      toast.error('Outlook Client ID not configured. Please contact an administrator.');
      return;
    }

    // Create state parameter with user_id
    const state = btoa(JSON.stringify({ user_id: user.id }));
    
    const redirectUri = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/outlook-oauth-callback`;
    const scopes = ['offline_access', 'Mail.Read', 'Mail.Send', 'Mail.ReadWrite', 'User.Read'];

    const authUrl = new URL(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`);
    authUrl.searchParams.set('client_id', String(clientId));
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', scopes.join(' '));
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('response_mode', 'query');
    authUrl.searchParams.set('prompt', 'consent'); // Always show consent to get refresh token

    // Open in a new window/tab to avoid iframe restrictions from Microsoft
    window.open(authUrl.toString(), '_blank', 'noopener,noreferrer');
  };

  const startGmailOAuth = async () => {
    if (!user?.id) {
      toast.error('Please sign in first');
      return;
    }

    // Get client_id from system_settings
    const { data: settings, error } = await supabase
      .from('system_settings')
      .select('key, value')
      .in('key', ['gmail_client_id']);

    if (error) {
      toast.error('Failed to get Gmail configuration');
      return;
    }

    const clientId = settings?.find(s => s.key === 'gmail_client_id')?.value;

    if (!clientId) {
      toast.error('Gmail Client ID not configured. Please contact an administrator.');
      return;
    }

    // Create state parameter with user_id
    const state = btoa(JSON.stringify({ user_id: user.id }));
    
    const redirectUri = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gmail-oauth-callback`;
    const scopes = [
      'https://mail.google.com/',
      'https://www.googleapis.com/auth/userinfo.email',
    ];

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', String(clientId));
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', scopes.join(' '));
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('access_type', 'offline'); // Get refresh token
    authUrl.searchParams.set('prompt', 'consent'); // Always show consent to get refresh token

    // Open in a new window/tab to avoid iframe restrictions from Google
    window.open(authUrl.toString(), '_blank', 'noopener,noreferrer');
  };

  const syncEmails = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      
      // Fetch fresh account data to ensure we're using the latest
      const { data: freshAccounts, error: fetchError } = await supabase
        .from('email_accounts')
        .select('id, provider')
        .eq('user_id', user.id);
      
      if (fetchError) throw fetchError;
      
      const gmailAccount = freshAccounts?.find(a => a.provider === 'gmail');
      const outlookAccount = freshAccounts?.find(a => a.provider === 'outlook');
      
      let functionName: string;
      if (gmailAccount) {
        functionName = 'gmail-sync-emails';
      } else if (outlookAccount) {
        functionName = 'outlook-sync-emails';
      } else {
        throw new Error('No email account connected. Please connect Outlook or Gmail first.');
      }

      console.log('Syncing with function:', functionName);
      const { data, error } = await supabase.functions.invoke(functionName);
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['inbox-emails'] });
      toast.success(data.message || `Synced ${data.synced} emails`);
    },
    onError: (error) => {
      toast.error('Sync failed: ' + error.message);
    },
  });

  return {
    accounts,
    isLoading,
    getOutlookAccount,
    getGmailAccount,
    disconnectAccount,
    startOutlookOAuth,
    startGmailOAuth,
    syncEmails,
  };
}
