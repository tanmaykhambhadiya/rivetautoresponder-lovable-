import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEmailLogs } from '@/hooks/useEmailLogs';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { Mail, CheckCircle2, XCircle, Clock, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';

const statusConfig = {
  pending: { icon: Clock, className: 'bg-warning/10 text-warning', label: 'Pending' },
  sent: { icon: CheckCircle2, className: 'bg-success/10 text-success', label: 'Sent' },
  failed: { icon: XCircle, className: 'bg-destructive/10 text-destructive', label: 'Failed' },
  blocked: { icon: Ban, className: 'bg-muted text-muted-foreground', label: 'Blocked' }
};

export function RecentActivity() {
  const { logs, isLoading } = useEmailLogs();
  const recentLogs = logs.slice(0, 10);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recentLogs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Mail className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No email activity yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentLogs.map((log) => {
              const status = statusConfig[log.status];
              const StatusIcon = status.icon;
              
              return (
                <div 
                  key={log.id} 
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className={cn("p-2 rounded-lg", status.className)}>
                    <StatusIcon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">
                        {log.subject || 'No subject'}
                      </p>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {status.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      From: {log.sender_email}
                    </p>
                    {log.nurse && (
                      <p className="text-xs text-accent">
                        Matched: {log.nurse.name}
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground shrink-0">
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}