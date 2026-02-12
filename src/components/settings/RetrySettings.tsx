import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { useEmailLogs } from '@/hooks/useEmailLogs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RotateCcw, Clock, Hash, Play } from 'lucide-react';
import { useState } from 'react';

export function RetrySettings() {
  const { getSetting, updateSetting, isLoading } = useSystemSettings();
  const { logs: emailLogs } = useEmailLogs();
  const [isRetrying, setIsRetrying] = useState(false);

  const retryEnabled = getSetting('retry_failed_emails') === true || getSetting('retry_failed_emails') === 'true';
  const maxRetries = parseInt(String(getSetting('max_retry_attempts') || '3'), 10);
  const retryDelay = parseInt(String(getSetting('retry_delay_minutes') || '5'), 10);

  const failedEmails = emailLogs.filter(log => log.status === 'failed');
  const retryableEmails = failedEmails.filter(log => (log.retry_count || 0) < maxRetries);

  const handleToggle = (key: string, checked: boolean) => {
    updateSetting.mutate({ key, value: checked });
  };

  const handleNumberChange = (key: string, value: string) => {
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= 0) {
      updateSetting.mutate({ key, value: value });
    }
  };

  const handleRetryAll = async () => {
    if (retryableEmails.length === 0) {
      toast.info('No emails to retry');
      return;
    }

    setIsRetrying(true);
    try {
      const { error } = await supabase.functions.invoke('process-emails');
      if (error) throw error;
      toast.success(`Triggered retry for ${retryableEmails.length} failed emails`);
    } catch (error: any) {
      toast.error('Failed to trigger retry: ' + error.message);
    } finally {
      setIsRetrying(false);
    }
  };

  if (isLoading) {
    return <div className="animate-pulse h-64 bg-muted rounded-lg" />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-blue-500" />
            Auto-Retry Configuration
          </CardTitle>
          <CardDescription>
            Automatically retry failed email sends
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="retry-enabled">Enable auto-retry</Label>
              <p className="text-sm text-muted-foreground">
                Automatically retry failed emails during processing
              </p>
            </div>
            <Switch
              id="retry-enabled"
              checked={retryEnabled}
              onCheckedChange={(checked) => handleToggle('retry_failed_emails', checked)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5 text-purple-500" />
            Retry Limits
          </CardTitle>
          <CardDescription>
            Configure maximum retry attempts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="max-retries">Maximum retry attempts</Label>
              <Input
                id="max-retries"
                type="number"
                min={1}
                max={10}
                value={maxRetries}
                onChange={(e) => handleNumberChange('max_retry_attempts', e.target.value)}
                disabled={!retryEnabled}
              />
              <p className="text-xs text-muted-foreground">
                Stop retrying after this many attempts
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="retry-delay">Retry delay (minutes)</Label>
              <Input
                id="retry-delay"
                type="number"
                min={1}
                max={60}
                value={retryDelay}
                onChange={(e) => handleNumberChange('retry_delay_minutes', e.target.value)}
                disabled={!retryEnabled}
              />
              <p className="text-xs text-muted-foreground">
                Wait this long between retries
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5 text-green-500" />
            Manual Retry
          </CardTitle>
          <CardDescription>
            Manually trigger retry for all failed emails
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="font-medium">Failed emails pending retry</p>
              <p className="text-sm text-muted-foreground">
                {retryableEmails.length} of {failedEmails.length} failed emails can be retried
              </p>
            </div>
            <Button 
              onClick={handleRetryAll} 
              disabled={isRetrying || retryableEmails.length === 0}
            >
              <RotateCcw className={`h-4 w-4 mr-2 ${isRetrying ? 'animate-spin' : ''}`} />
              {isRetrying ? 'Retrying...' : 'Retry All Now'}
            </Button>
          </div>

          {failedEmails.length > 0 && retryableEmails.length === 0 && (
            <p className="text-sm text-amber-600">
              All failed emails have exceeded the maximum retry limit ({maxRetries} attempts).
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
