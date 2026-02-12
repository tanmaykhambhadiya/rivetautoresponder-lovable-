import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import type { EmailLog, Nurse } from '@/types/database';

export function useEmailLogs() {
  const queryClient = useQueryClient();
  const { organizationId } = useAuth();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['email-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_logs')
        .select('*, nurse:nurses(*)')
        .order('created_at', { ascending: false })
        .limit(500);
      
      if (error) throw error;
      return data as (EmailLog & { nurse: Nurse | null })[];
    }
  });

  const resendEmail = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('email_logs')
        .update({ status: 'pending', error_message: null })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-logs'] });
      toast.success('Email queued for resend');
    },
    onError: (error) => {
      toast.error('Failed to resend email: ' + error.message);
    }
  });

  const todayLogs = logs.filter(log => {
    const today = new Date().toISOString().split('T')[0];
    return log.created_at.startsWith(today);
  });

  const pendingCount = logs.filter(l => l.status === 'pending').length;
  const sentCount = logs.filter(l => l.status === 'sent').length;
  const failedCount = logs.filter(l => l.status === 'failed').length;

  return {
    logs,
    todayLogs,
    isLoading,
    resendEmail,
    pendingCount,
    sentCount,
    failedCount,
    todayCount: todayLogs.length
  };
}