import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export interface BookingRule {
  id: string;
  name: string;
  rule_type: string;
  description: string | null;
  config: Record<string, any>;
  is_active: boolean;
  priority: number;
  created_at: string;
}

export function useBookingRules() {
  const queryClient = useQueryClient();
  const { organizationId } = useAuth();

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['booking-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('booking_rules')
        .select('*')
        .order('priority');
      
      if (error) throw error;
      return data as BookingRule[];
    }
  });

  const updateRule = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BookingRule> & { id: string }) => {
      const { data, error } = await supabase
        .from('booking_rules')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-rules'] });
      toast.success('Booking rule updated');
    },
    onError: () => {
      toast.error('Failed to update booking rule');
    }
  });

  const addRule = useMutation({
    mutationFn: async (rule: Omit<BookingRule, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('booking_rules')
        .insert({ ...rule, organization_id: organizationId })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-rules'] });
      toast.success('Booking rule added');
    },
    onError: () => {
      toast.error('Failed to add booking rule');
    }
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('booking_rules')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-rules'] });
      toast.success('Booking rule deleted');
    },
    onError: () => {
      toast.error('Failed to delete booking rule');
    }
  });

  return {
    rules,
    activeRules: rules.filter(r => r.is_active),
    isLoading,
    updateRule,
    addRule,
    deleteRule
  };
}
