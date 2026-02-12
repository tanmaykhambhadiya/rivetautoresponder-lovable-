import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import type { Prompt } from '@/types/database';

export function usePrompts() {
  const queryClient = useQueryClient();
  const { organizationId } = useAuth();

  const { data: prompts = [], isLoading } = useQuery({
    queryKey: ['prompts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prompts')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Prompt[];
    }
  });

  const updatePrompt = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const { error } = await supabase
        .from('prompts')
        .update({ content })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
      toast.success('Prompt updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update prompt: ' + error.message);
    }
  });

  const getPromptByName = (name: string) => {
    return prompts.find(p => p.name === name);
  };

  return {
    prompts,
    isLoading,
    updatePrompt,
    getPromptByName
  };
}