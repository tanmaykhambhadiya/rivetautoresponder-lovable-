import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export function useSystemSettings() {
  const queryClient = useQueryClient();
  const { organizationId } = useAuth();

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .order('key');
      
      if (error) throw error;
      return data;
    }
  });

  const updateSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const { error } = await supabase
        .from('system_settings')
        .update({ value })
        .eq('key', key);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      toast.success('Setting updated');
    },
    onError: (error) => {
      toast.error('Failed to update setting: ' + error.message);
    }
  });

  const getSetting = (key: string) => {
    const setting = settings.find(s => s.key === key);
    return setting?.value;
  };

  const isEmailProcessingEnabled = getSetting('email_processing_enabled') === true || getSetting('email_processing_enabled') === 'true';
  const isAutoResponseEnabled = getSetting('auto_response_enabled') === true || getSetting('auto_response_enabled') === 'true';

  return {
    settings,
    isLoading,
    updateSetting,
    getSetting,
    isEmailProcessingEnabled,
    isAutoResponseEnabled
  };
}