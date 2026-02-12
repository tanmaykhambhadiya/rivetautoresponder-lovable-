import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { Zap, Clock, Gauge } from 'lucide-react';

export function ResponseSpeedSettings() {
  const { getSetting, updateSetting, isLoading } = useSystemSettings();

  const responseDelay = parseInt(String(getSetting('response_delay_seconds') || '0'), 10);
  const instantMode = getSetting('instant_response_mode') === true || getSetting('instant_response_mode') === 'true';
  const maxResponseTime = parseInt(String(getSetting('max_response_time_seconds') || '30'), 10);

  const handleDelayChange = (value: number[]) => {
    updateSetting.mutate({ key: 'response_delay_seconds', value: value[0].toString() });
  };

  const handleInstantModeChange = (checked: boolean) => {
    updateSetting.mutate({ key: 'instant_response_mode', value: checked });
    if (checked) {
      updateSetting.mutate({ key: 'response_delay_seconds', value: '0' });
    }
  };

  const handleMaxTimeChange = (value: number[]) => {
    updateSetting.mutate({ key: 'max_response_time_seconds', value: value[0].toString() });
  };

  if (isLoading) {
    return <div className="animate-pulse h-64 bg-muted rounded-lg" />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Instant Response Mode
          </CardTitle>
          <CardDescription>
            When enabled, responses are sent immediately upon shift match with zero delay
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="instant-mode">Enable Instant Response</Label>
              <p className="text-sm text-muted-foreground">
                Bypass all delays and send replies within seconds
              </p>
            </div>
            <Switch
              id="instant-mode"
              checked={instantMode}
              onCheckedChange={handleInstantModeChange}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            Response Delay
          </CardTitle>
          <CardDescription>
            Add a delay before sending the response (disabled when Instant Mode is on)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Delay before sending</Label>
              <span className="text-2xl font-bold text-primary">
                {instantMode ? '0' : responseDelay}s
              </span>
            </div>
            <Slider
              value={[instantMode ? 0 : responseDelay]}
              onValueChange={handleDelayChange}
              max={60}
              min={0}
              step={1}
              disabled={instantMode}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Instant</span>
              <span>30 seconds</span>
              <span>60 seconds</span>
            </div>
          </div>

          {!instantMode && responseDelay > 0 && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm">
                Emails will be sent <strong>{responseDelay} seconds</strong> after a shift match is found.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-orange-500" />
            Maximum Response Time
          </CardTitle>
          <CardDescription>
            Maximum time allowed for the entire email processing and sending
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Max processing time</Label>
              <span className="text-2xl font-bold text-primary">{maxResponseTime}s</span>
            </div>
            <Slider
              value={[maxResponseTime]}
              onValueChange={handleMaxTimeChange}
              max={120}
              min={5}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>5 seconds</span>
              <span>60 seconds</span>
              <span>120 seconds</span>
            </div>
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm">
              If processing takes longer than <strong>{maxResponseTime} seconds</strong>, the email will be marked as failed.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
