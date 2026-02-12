import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useEmailLogs } from '@/hooks/useEmailLogs';
import { BarChart3, CheckCircle, XCircle, Clock, Zap, TrendingUp } from 'lucide-react';
import { startOfDay, isToday } from 'date-fns';

interface ResponseMonitoringCardProps {
  fullView?: boolean;
}

export function ResponseMonitoringCard({ fullView = false }: ResponseMonitoringCardProps) {
  const { logs: emailLogs } = useEmailLogs();

  // Calculate stats
  const todayLogs = emailLogs.filter(log => 
    log.created_at && isToday(new Date(log.created_at))
  );

  const sentToday = todayLogs.filter(log => log.status === 'sent').length;
  const failedToday = todayLogs.filter(log => log.status === 'failed').length;
  const pendingToday = todayLogs.filter(log => log.status === 'pending').length;

  const totalProcessed = sentToday + failedToday;
  const successRate = totalProcessed > 0 ? Math.round((sentToday / totalProcessed) * 100) : 100;

  // Calculate average response time from logs with response_time_ms
  const logsWithTime = emailLogs.filter(log => log.response_time_ms && log.response_time_ms > 0);
  const avgResponseTime = logsWithTime.length > 0 
    ? Math.round(logsWithTime.reduce((sum, log) => sum + (log.response_time_ms || 0), 0) / logsWithTime.length)
    : 0;

  const allTimeSent = emailLogs.filter(log => log.status === 'sent').length;
  const allTimeFailed = emailLogs.filter(log => log.status === 'failed').length;

  if (!fullView) {
    // Compact view for header
    return (
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span className="font-medium">{sentToday}</span>
          <span className="text-muted-foreground">sent</span>
        </div>
        <div className="flex items-center gap-1">
          <XCircle className="h-4 w-4 text-red-500" />
          <span className="font-medium">{failedToday}</span>
          <span className="text-muted-foreground">failed</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="h-4 w-4 text-blue-500" />
          <span className="font-medium">{avgResponseTime}ms</span>
        </div>
      </div>
    );
  }

  // Full view for stats tab
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Sent Today</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{sentToday}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {allTimeSent} total all time
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Failed Today</CardTitle>
          <XCircle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{failedToday}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {allTimeFailed} total all time
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending</CardTitle>
          <Clock className="h-4 w-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{pendingToday}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Awaiting processing
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          <TrendingUp className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{successRate}%</div>
          <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 transition-all" 
              style={{ width: `${successRate}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
          <Zap className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">
            {avgResponseTime > 0 ? `${avgResponseTime}ms` : 'N/A'}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {avgResponseTime > 0 && avgResponseTime < 5000 ? '⚡ Lightning fast!' : 
             avgResponseTime > 0 ? 'Time from match to send' : 'No data yet'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Processed</CardTitle>
          <BarChart3 className="h-4 w-4 text-purple-500" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{emailLogs.length}</div>
          <p className="text-xs text-muted-foreground mt-1">
            All time email records
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
