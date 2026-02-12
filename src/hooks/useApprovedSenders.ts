import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import type { ApprovedSender } from '@/types/database';

export function useApprovedSenders() {
  const queryClient = useQueryClient();
  const { organizationId } = useAuth();

  const { data: senders = [], isLoading } = useQuery({
    queryKey: ['approved-senders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('approved_senders')
        .select('*')
        .order('email');
      
      if (error) throw error;
      return data as ApprovedSender[];
    }
  });

  const addSender = useMutation({
    mutationFn: async (sender: Omit<ApprovedSender, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('approved_senders')
        .insert({ ...sender, organization_id: organizationId })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approved-senders'] });
      toast.success('Sender added successfully');
    },
    onError: (error) => {
      toast.error('Failed to add sender: ' + error.message);
    }
  });

  const updateSender = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ApprovedSender> & { id: string }) => {
      const { error } = await supabase
        .from('approved_senders')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approved-senders'] });
      toast.success('Sender updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update sender: ' + error.message);
    }
  });

  const deleteSender = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('approved_senders')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approved-senders'] });
      toast.success('Sender removed');
    },
    onError: (error) => {
      toast.error('Failed to remove sender: ' + error.message);
    }
  });

  return {
    senders,
    isLoading,
    addSender,
    updateSender,
    deleteSender,
    activeSenders: senders.filter(s => s.is_active)
  };
}