import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export interface Unit {
  id: string;
  name: string;
  code: string;
  hospital: string | null;
  aliases: string[];
  is_active: boolean;
  created_at: string;
}

export function useUnits() {
  const queryClient = useQueryClient();
  const { organizationId } = useAuth();

  const { data: units = [], isLoading } = useQuery({
    queryKey: ['units'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('units')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Unit[];
    }
  });

  const addUnit = useMutation({
    mutationFn: async (unit: Omit<Unit, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('units')
        .insert({ ...unit, organization_id: organizationId })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      toast.success('Unit added successfully');
    },
    onError: (error: any) => {
      if (error.message?.includes('duplicate')) {
        toast.error('A unit with this name or code already exists');
      } else {
        toast.error('Failed to add unit');
      }
    }
  });

  const updateUnit = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Unit> & { id: string }) => {
      const { data, error } = await supabase
        .from('units')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      toast.success('Unit updated successfully');
    },
    onError: () => {
      toast.error('Failed to update unit');
    }
  });

  const deleteUnit = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('units')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      toast.success('Unit deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete unit');
    }
  });

  return {
    units,
    activeUnits: units.filter(u => u.is_active),
    isLoading,
    addUnit,
    updateUnit,
    deleteUnit
  };
}
