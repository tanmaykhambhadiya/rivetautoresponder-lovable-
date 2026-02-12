import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface OutlookSettings {
  client_id: string;
  tenant_id: string;
  is_connected: boolean;
  connected_email?: string;
  last_sync?: string;
}

export function useOutlookSettings() {
  const queryClient = useQueryClient();

  const { data: outlookSettings, isLoading } = useQuery({
    queryKey: ['outlook-settings'],
    queryFn: async (): Promise<OutlookSettings | null> => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .in('key', ['outlook_client_id', 'outlook_tenant_id', 'outlook_connected', 'outlook_email', 'outlook_last_sync']);
      
      if (error) throw error;
      
      const settings: OutlookSettings = {
        client_id: String(data.find(s => s.key === 'outlook_client_id')?.value || ''),
        tenant_id: String(data.find(s => s.key === 'outlook_tenant_id')?.value || ''),
        is_connected: data.find(s => s.key === 'outlook_connected')?.value === true,
        connected_email: data.find(s => s.key === 'outlook_email')?.value ? String(data.find(s => s.key === 'outlook_email')?.value) : undefined,
        last_sync: data.find(s => s.key === 'outlook_last_sync')?.value ? String(data.find(s => s.key === 'outlook_last_sync')?.value) : undefined,
      };
      
      return settings;
    }
  });

  const saveOutlookCredentials = useMutation({
    mutationFn: async ({ clientId, clientSecret, tenantId }: { clientId: string; clientSecret: string; tenantId: string }) => {
      // Save client ID and tenant ID to system_settings (non-secret)
      const updates = [
        { key: 'outlook_client_id', value: clientId },
        { key: 'outlook_tenant_id', value: tenantId },
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

      // The client secret should be stored securely via edge function
      // For now, we'll call an edge function to store it
      const { error: secretError } = await supabase.functions.invoke('store-outlook-secret', {
        body: { clientSecret }
      });

      if (secretError) throw secretError;

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outlook-settings'] });
      toast.success('Outlook credentials saved successfully');
    },
    onError: (error) => {
      toast.error('Failed to save credentials: ' + error.message);
    }
  });

  const disconnectOutlook = useMutation({
    mutationFn: async () => {
      const keys = ['outlook_client_id', 'outlook_tenant_id', 'outlook_connected', 'outlook_email', 'outlook_last_sync'];
      
      for (const key of keys) {
        await supabase
          .from('system_settings')
          .delete()
          .eq('key', key);
      }

      // Also clear the secret via edge function
      await supabase.functions.invoke('store-outlook-secret', {
        body: { clientSecret: null, disconnect: true }
      });

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outlook-settings'] });
      toast.success('Outlook disconnected');
    },
    onError: (error) => {
      toast.error('Failed to disconnect: ' + error.message);
    }
  });

  const testConnection = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('test-outlook-connection');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['outlook-settings'] });
      toast.success('Connection successful! Email: ' + data.email);
    },
    onError: (error) => {
      toast.error('Connection failed: ' + error.message);
    }
  });

  return {
    outlookSettings,
    isLoading,
    saveOutlookCredentials,
    disconnectOutlook,
    testConnection,
  };
}
