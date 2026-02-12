import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Mail, Key, AlertTriangle, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface EmailStats {
  total: number;
  sent: number;
  failed: number;
  pending: number;
  blocked: number;
}

interface TokenStatus {
  provider: string;
  email: string;
  expiresAt: Date | null;
  isExpired: boolean;
  expiresIn: string;
}

export function EmailHealthWidget() {
  // Fetch email stats
  const { data: emailStats } = useQuery({
    queryKey: ['email-health-stats'],
    queryFn: async (): Promise<EmailStats> => {
      const { data, error } = await supabase
        .from('email_logs')
        .select('status');
      
      if (error) throw error;
      
      const stats: EmailStats = {
        total: data?.length || 0,
        sent: data?.filter(e => e.status === 'sent').length || 0,
        failed: data?.filter(e => e.status === 'failed').length || 0,
        pending: data?.filter(e => e.status === 'pending').length || 0,
        blocked: data?.filter(e => e.status === 'blocked').length || 0,
      };
      
      return stats;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch token status
  const { data: tokenStatus } = useQuery({
    queryKey: ['email-token-status'],
    queryFn: async (): Promise<TokenStatus | null> => {
      const { data, error } = await supabase
        .from('email_accounts')
        .select('provider, email, expires_at')
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      if (!data) return null;
      
      const expiresAt = data.expires_at ? new Date(data.expires_at) : null;
      const now = new Date();
      const isExpired = expiresAt ? expiresAt < now : true;
      
      let expiresIn = 'Unknown';
      if (expiresAt) {
        if (isExpired) {
          expiresIn = 'Expired';
        } else {
          expiresIn = formatDistanceToNow(expiresAt, { addSuffix: true });
        }
      }
      
      return {
        provider: data.provider,
        email: data.email,
        expiresAt,
        isExpired,
        expiresIn,
      };
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const successRate = emailStats && emailStats.total > 0
    ? Math.round((emailStats.sent / emailStats.total) * 100)
    : 0;

  const failureRate = emailStats && emailStats.total > 0
    ? Math.round((emailStats.failed / emailStats.total) * 100)
    : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Mail className="h-5 w-5" />
          Email Health
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Success Rate */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Success Rate</span>
            <span className="text-sm font-bold">{successRate}%</span>
          </div>
          <Progress value={successRate} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-success" />
              {emailStats?.sent || 0} sent
            </span>
            <span className="flex items-center gap-1">
              <XCircle className="h-3 w-3 text-destructive" />
              {emailStats?.failed || 0} failed ({failureRate}%)
            </span>
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="space-y-1">
            <p className="text-2xl font-bold text-success">{emailStats?.sent || 0}</p>
            <p className="text-xs text-muted-foreground">Sent</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-warning">{emailStats?.pending || 0}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-destructive">{emailStats?.failed || 0}</p>
            <p className="text-xs text-muted-foreground">Failed</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-muted-foreground">{emailStats?.blocked || 0}</p>
            <p className="text-xs text-muted-foreground">Blocked</p>
          </div>
        </div>

        {/* Token Status */}
        <div className="border-t pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Key className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">OAuth Token Status</span>
          </div>
          
          {tokenStatus ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">
                    {tokenStatus.provider}
                  </Badge>
                  <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                    {tokenStatus.email}
                  </span>
                </div>
                {tokenStatus.isExpired ? (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Expired
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="flex items-center gap-1 bg-success/10 text-success border-success/20">
                    <CheckCircle2 className="h-3 w-3" />
                    Valid
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {tokenStatus.isExpired ? (
                  <span className="text-destructive">Token needs refresh (auto-refreshes on next send)</span>
                ) : (
                  <span>Expires {tokenStatus.expiresIn}</span>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertTriangle className="h-4 w-4 text-warning" />
              No email account connected
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
