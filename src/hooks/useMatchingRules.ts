import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import type { MatchingRule } from '@/types/database';

export function useMatchingRules() {
  const queryClient = useQueryClient();
  const { organizationId } = useAuth();

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['matching-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('matching_rules')
        .select('*')
        .order('priority');
      
      if (error) throw error;
      return data as MatchingRule[];
    }
  });

  const updateRule = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('matching_rules')
        .update({ is_active })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matching-rules'] });
      toast.success('Rule updated');
    },
    onError: (error) => {
      toast.error('Failed to update rule: ' + error.message);
    }
  });

  return {
    rules,
    isLoading,
    updateRule,
    activeRules: rules.filter(r => r.is_active)
  };
}