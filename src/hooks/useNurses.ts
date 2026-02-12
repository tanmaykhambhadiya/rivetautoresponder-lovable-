import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import type { Nurse, NurseAvailability } from '@/types/database';

export function useNurses() {
  const queryClient = useQueryClient();
  const { organizationId } = useAuth();

  const { data: nurses = [], isLoading } = useQuery({
    queryKey: ['nurses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nurses')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Nurse[];
    }
  });

  const addNurse = useMutation({
    mutationFn: async (nurse: Omit<Nurse, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('nurses')
        .insert({ ...nurse, organization_id: organizationId })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nurses'] });
      toast.success('Nurse added successfully');
    },
    onError: (error) => {
      toast.error('Failed to add nurse: ' + error.message);
    }
  });

  const updateNurse = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Nurse> & { id: string }) => {
      const { error } = await supabase
        .from('nurses')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nurses'] });
      toast.success('Nurse updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update nurse: ' + error.message);
    }
  });

  const deleteNurse = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('nurses')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nurses'] });
      toast.success('Nurse deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete nurse: ' + error.message);
    }
  });

  return {
    nurses,
    isLoading,
    addNurse,
    updateNurse,
    deleteNurse
  };
}

export function useNurseAvailability() {
  const queryClient = useQueryClient();
  const { organizationId } = useAuth();

  const { data: availability = [], isLoading } = useQuery({
    queryKey: ['nurse-availability'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nurse_availability')
        .select('*, nurse:nurses(*)')
        .order('available_date');
      
      if (error) throw error;
      return data as (NurseAvailability & { nurse: Nurse })[];
    }
  });

  const addAvailability = useMutation({
    mutationFn: async (avail: Omit<NurseAvailability, 'id' | 'created_at' | 'is_assigned' | 'nurse'>) => {
      const { data, error } = await supabase
        .from('nurse_availability')
        .insert({ ...avail, organization_id: organizationId })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nurse-availability'] });
      toast.success('Availability added successfully');
    },
    onError: (error) => {
      toast.error('Failed to add availability: ' + error.message);
    }
  });

  const deleteAvailability = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('nurse_availability')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nurse-availability'] });
      toast.success('Availability removed');
    },
    onError: (error) => {
      toast.error('Failed to remove availability: ' + error.message);
    }
  });

  return {
    availability,
    isLoading,
    addAvailability,
    deleteAvailability
  };
}