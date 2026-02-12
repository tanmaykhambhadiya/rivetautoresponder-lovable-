import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GmailSettings {
  client_id: string;
  is_connected: boolean;
  connected_email?: string;
  last_sync?: string;
}

export function useGmailSettings() {
  const queryClient = useQueryClient();

  const { data: gmailSettings, isLoading } = useQuery({
    queryKey: ['gmail-settings'],
    queryFn: async (): Promise<GmailSettings | null> => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .in('key', ['gmail_client_id', 'gmail_connected', 'gmail_email', 'gmail_last_sync']);
      
      if (error) throw error;
      
      const settings: GmailSettings = {
        client_id: String(data.find(s => s.key === 'gmail_client_id')?.value || ''),
        is_connected: data.find(s => s.key === 'gmail_connected')?.value === true,
        connected_email: data.find(s => s.key === 'gmail_email')?.value ? String(data.find(s => s.key === 'gmail_email')?.value) : undefined,
        last_sync: data.find(s => s.key === 'gmail_last_sync')?.value ? String(data.find(s => s.key === 'gmail_last_sync')?.value) : undefined,
      };
      
      return settings;
    }
  });

  const saveGmailCredentials = useMutation({
    mutationFn: async ({ clientId, clientSecret, targetEmail }: { 
      clientId: string; 
      clientSecret: string; 
      targetEmail: string;
    }) => {
      // Save client ID and target email to system_settings (non-secret)
      const updates = [
        { key: 'gmail_client_id', value: clientId },
        { key: 'gmail_email', value: targetEmail },
        { key: 'email_provider', value: 'gmail' },
      ];

      for (const update of updates) {
        const { data: existing } = await supabase
          .from('system_settings')
          .select('id')
          .eq('key', update.key)
          .single();

        if (existing) {
          const { error } = await supabase
            .from('system_settings')
            .update({ value: update.value })
            .eq('key', update.key);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('system_settings')
            .insert({ key: update.key, value: update.value });
          if (error) throw error;
        }
      }

      // Store secret via edge function
      const { error: secretError } = await supabase.functions.invoke('store-gmail-secret', {
        body: { clientSecret }
      });

      if (secretError) throw secretError;

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gmail-settings'] });
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      toast.success('Gmail credentials saved successfully');
    },
    onError: (error) => {
      toast.error('Failed to save credentials: ' + error.message);
    }
  });

  const disconnectGmail = useMutation({
    mutationFn: async () => {
      const keys = ['gmail_client_id', 'gmail_connected', 'gmail_email', 'gmail_last_sync'];
      
      for (const key of keys) {
        await supabase
          .from('system_settings')
          .delete()
          .eq('key', key);
      }

      // Update email provider
      const { data: existing } = await supabase
        .from('system_settings')
        .select('id')
        .eq('key', 'email_provider')
        .single();

      if (existing) {
        await supabase
          .from('system_settings')
          .update({ value: 'none' })
          .eq('key', 'email_provider');
      }

      // Clear secrets via edge function
      await supabase.functions.invoke('store-gmail-secret', {
        body: { clientSecret: null, refreshToken: null, disconnect: true }
      });

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gmail-settings'] });
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      toast.success('Gmail disconnected');
    },
    onError: (error) => {
      toast.error('Failed to disconnect: ' + error.message);
    }
  });

  const testConnection = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('test-gmail-connection');
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['gmail-settings'] });
      toast.success('Connection successful! Email: ' + data.email);
    },
    onError: (error) => {
      toast.error('Connection failed: ' + error.message);
    }
  });

  return {
    gmailSettings,
    isLoading,
    saveGmailCredentials,
    disconnectGmail,
    testConnection,
  };
}
