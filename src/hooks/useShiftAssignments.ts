import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { ShiftAssignment, Nurse } from '@/types/database';

export function useShiftAssignments() {
  const { organizationId } = useAuth();
  
  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['shift-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shift_assignments')
        .select('*, nurse:nurses(*)')
        .order('shift_date', { ascending: false });
      
      if (error) throw error;
      return data as (ShiftAssignment & { nurse: Nurse })[];
    }
  });

  const getAssignmentsByDate = (date: string) => {
    return assignments.filter(a => a.shift_date === date);
  };

  const getAssignmentsByNurse = (nurseId: string) => {
    return assignments.filter(a => a.nurse_id === nurseId);
  };

  return {
    assignments,
    isLoading,
    getAssignmentsByDate,
    getAssignmentsByNurse
  };
}