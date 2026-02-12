import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useEmailProcessor() {
  const queryClient = useQueryClient();

  const processEmails = useMutation({
    mutationFn: async () => {
      console.log('Starting email processing...');
      const { data, error } = await supabase.functions.invoke('process-emails');
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['email-logs'] });
      queryClient.invalidateQueries({ queryKey: ['inbox-emails'] });
      queryClient.invalidateQueries({ queryKey: ['nurse-availability'] });
      queryClient.invalidateQueries({ queryKey: ['shift-assignments'] });
      
      if (data.matched > 0) {
        toast.success(`Successfully matched ${data.matched} shifts!`, {
          description: data.message
        });
      } else if (data.processed > 0) {
        toast.info(`Processed ${data.processed} emails, no matches found`, {
          description: 'Check nurse availability or shift requirements'
        });
      } else {
        toast.info('No new emails to process');
      }
    },
    onError: (error) => {
      console.error('Email processing failed:', error);
      toast.error('Processing failed: ' + error.message);
    },
  });

  return {
    processEmails,
    isProcessing: processEmails.isPending,
  };
}
