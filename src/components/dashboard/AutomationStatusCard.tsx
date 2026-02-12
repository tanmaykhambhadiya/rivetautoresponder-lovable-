import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Send, AlertTriangle, Activity, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface AutomationStatus {
  lastSyncTime: Date | null;
  lastProcessedTime: Date | null;
  lastResponseSentTime: Date | null;
  recentErrors: { message: string; time: Date }[];
}

export function AutomationStatusCard() {
  const { isEmailProcessingEnabled, isAutoResponseEnabled } = useSystemSettings();
  const [status, setStatus] = useState<AutomationStatus>({
    lastSyncTime: null,
    lastProcessedTime: null,
    lastResponseSentTime: null,
    recentErrors: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchStatus = async () => {
    try {
      // Get last synced email (most recent inbox email)
      const { data: lastSynced } = await supabase
        .from('inbox_emails')
        .select('synced_at')
        .order('synced_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Get last processed email
      const { data: lastProcessed } = await supabase
        .from('email_logs')
        .select('processed_at')
        .not('processed_at', 'is', null)
        .order('processed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Get last sent response
      const { data: lastSent } = await supabase
        .from('email_logs')
        .select('processed_at')
        .eq('status', 'sent')
        .order('processed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Get recent errors (last 5)
      const { data: errors } = await supabase
        .from('email_logs')
        .select('error_message, created_at')
        .eq('status', 'failed')
        .not('error_message', 'is', null)
        .order('created_at', { ascending: false })
        .limit(5);

      setStatus({
        lastSyncTime: lastSynced?.synced_at ? new Date(lastSynced.synced_at) : null,
        lastProcessedTime: lastProcessed?.processed_at ? new Date(lastProcessed.processed_at) : null,
        lastResponseSentTime: lastSent?.processed_at ? new Date(lastSent.processed_at) : null,
        recentErrors: (errors || []).map(e => ({
          message: e.error_message || 'Unknown error',
          time: new Date(e.created_at),
        })),
      });
    } catch (err) {
      console.error('Failed to fetch automation status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Refresh every 5 seconds
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('automation-status-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inbox_emails' }, fetchStatus)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'email_logs' }, fetchStatus)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const formatTime = (date: Date | null) => {
    if (!date) return 'Never';
    return formatDistanceToNow(date, { addSuffix: true });
  };

  const isActive = isEmailProcessingEnabled && isAutoResponseEnabled;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Live Automation Status
          </CardTitle>
          <Badge 
            variant={isActive ? 'default' : 'secondary'}
            className={cn(
              isActive && 'bg-success text-success-foreground'
            )}
          >
            {isActive ? (
              <>
                <span className="relative flex h-2 w-2 mr-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-current" />
                </span>
                Active
              </>
            ) : 'Paused'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Items */}
        <div className="grid gap-3">
          <StatusItem
            icon={RefreshCw}
            label="Last Sync"
            value={formatTime(status.lastSyncTime)}
            iconClassName="text-blue-500"
          />
          <StatusItem
            icon={Clock}
            label="Last Processed"
            value={formatTime(status.lastProcessedTime)}
            iconClassName="text-amber-500"
          />
          <StatusItem
            icon={Send}
            label="Last Response Sent"
            value={formatTime(status.lastResponseSentTime)}
            iconClassName="text-green-500"
          />
        </div>

        {/* Recent Errors */}
        {status.recentErrors.length > 0 && (
          <div className="pt-3 border-t">
            <div className="flex items-center gap-2 text-sm font-medium text-destructive mb-2">
              <AlertTriangle className="h-4 w-4" />
              Recent Errors ({status.recentErrors.length})
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {status.recentErrors.map((error, i) => (
                <div 
                  key={i} 
                  className="text-xs bg-destructive/10 text-destructive rounded-md p-2"
                >
                  <p className="font-medium truncate">{error.message}</p>
                  <p className="text-destructive/70 mt-0.5">{formatTime(error.time)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {status.recentErrors.length === 0 && (
          <div className="pt-3 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-success" />
              No recent errors
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatusItem({ 
  icon: Icon, 
  label, 
  value, 
  iconClassName 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string;
  iconClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className={cn('h-4 w-4', iconClassName)} />
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
