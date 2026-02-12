import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { useEmailProcessor } from '@/hooks/useEmailProcessor';
import { Power, PowerOff, Play, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function EmailToggle() {
  const { isEmailProcessingEnabled, updateSetting, isLoading } = useSystemSettings();
  const { processEmails, isProcessing } = useEmailProcessor();

  const handleToggle = () => {
    updateSetting.mutate({ 
      key: 'email_processing_enabled', 
      value: !isEmailProcessingEnabled 
    });
  };

  const handleProcessNow = () => {
    processEmails.mutate();
  };

  return (
    <Card className={cn(
      "overflow-hidden transition-all duration-300",
      isEmailProcessingEnabled 
        ? "border-success/50 bg-success/5" 
        : "border-destructive/50 bg-destructive/5"
    )}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={cn(
              "p-3 rounded-xl transition-colors",
              isEmailProcessingEnabled 
                ? "bg-success/20 text-success" 
                : "bg-destructive/20 text-destructive"
            )}>
              {isEmailProcessingEnabled ? (
                <Power className="h-8 w-8" />
              ) : (
                <PowerOff className="h-8 w-8" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold">Email Auto-Response</h3>
              <p className="text-sm text-muted-foreground">
                {isEmailProcessingEnabled 
                  ? "System is actively processing and responding to emails" 
                  : "Email processing is paused - no automatic responses"
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleProcessNow}
              disabled={!isEmailProcessingEnabled || isProcessing}
              className="gap-2"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {isProcessing ? 'Processing...' : 'Process Now'}
            </Button>
            <Switch
              checked={isEmailProcessingEnabled}
              onCheckedChange={handleToggle}
              disabled={isLoading || updateSetting.isPending}
              className="data-[state=checked]:bg-success"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}