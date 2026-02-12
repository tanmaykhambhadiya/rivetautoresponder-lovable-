import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import type { Report } from '@/types/database';

export function useReports() {
  const queryClient = useQueryClient();
  const { organizationId } = useAuth();

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('generated_at', { ascending: false });
      
      if (error) throw error;
      return data as Report[];
    }
  });

  const generateReport = useMutation({
    mutationFn: async ({ reportType, periodStart, periodEnd }: { 
      reportType: string; 
      periodStart: string; 
      periodEnd: string 
    }) => {
      // Fetch email logs for the period
      const { data: logs, error: logsError } = await supabase
        .from('email_logs')
        .select('*')
        .gte('created_at', periodStart)
        .lte('created_at', periodEnd + 'T23:59:59');

      if (logsError) throw logsError;

      // Fetch shift assignments for the period
      const { data: assignments, error: assignError } = await supabase
        .from('shift_assignments')
        .select('*, nurse:nurses(*)')
        .gte('shift_date', periodStart)
        .lte('shift_date', periodEnd);

      if (assignError) throw assignError;

      // Calculate report data
      const totalShiftsRequested = logs?.length || 0;
      const shiftsFilled = logs?.filter(l => l.status === 'sent').length || 0;
      const fillRate = totalShiftsRequested > 0 ? (shiftsFilled / totalShiftsRequested * 100).toFixed(1) : 0;

      // Nurse utilization
      const nurseShiftCounts: Record<string, { name: string; count: number }> = {};
      assignments?.forEach(a => {
        if (a.nurse) {
          const key = a.nurse_id;
          if (!nurseShiftCounts[key]) {
            nurseShiftCounts[key] = { name: a.nurse.name, count: 0 };
          }
          nurseShiftCounts[key].count++;
        }
      });

      const nurseUtilization = Object.values(nurseShiftCounts).sort((a, b) => b.count - a.count);

      // Email success rates
      const emailStats = {
        sent: logs?.filter(l => l.status === 'sent').length || 0,
        failed: logs?.filter(l => l.status === 'failed').length || 0,
        blocked: logs?.filter(l => l.status === 'blocked').length || 0,
        pending: logs?.filter(l => l.status === 'pending').length || 0
      };

      // Shifts by unit
      const shiftsByUnit: Record<string, number> = {};
      assignments?.forEach(a => {
        shiftsByUnit[a.unit] = (shiftsByUnit[a.unit] || 0) + 1;
      });

      const reportData = {
        totalShiftsRequested,
        shiftsFilled,
        fillRate,
        nurseUtilization,
        emailStats,
        shiftsByUnit
      };

      const { data, error } = await supabase
        .from('reports')
        .insert({
          report_type: reportType,
          period_start: periodStart,
          period_end: periodEnd,
          data: reportData,
          organization_id: organizationId
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success('Report generated successfully');
    },
    onError: (error) => {
      toast.error('Failed to generate report: ' + error.message);
    }
  });

  const weeklyReports = reports.filter(r => r.report_type === 'weekly');
  const monthlyReports = reports.filter(r => r.report_type === 'monthly');

  return {
    reports,
    weeklyReports,
    monthlyReports,
    isLoading,
    generateReport
  };
}