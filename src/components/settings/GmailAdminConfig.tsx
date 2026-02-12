import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Settings2, Loader2, CheckCircle, ExternalLink, Copy, Shield } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface GmailConfig {
  clientId: string;
}

export function GmailAdminConfig() {
  const queryClient = useQueryClient();
  const [config, setConfig] = useState<GmailConfig>({
    clientId: '',
  });
  const [isEditing, setIsEditing] = useState(false);

  const redirectUri = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gmail-oauth-callback`;

  // Fetch current config
  const { data: currentConfig, isLoading } = useQuery({
    queryKey: ['gmail-admin-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', ['gmail_client_id']);

      if (error) throw error;

      return {
        clientId: String(data.find(s => s.key === 'gmail_client_id')?.value || ''),
      };
    },
  });

  useEffect(() => {
    if (currentConfig) {
      setConfig(currentConfig);
    }
  }, [currentConfig]);

  const saveConfig = useMutation({
    mutationFn: async (newConfig: GmailConfig) => {
      const updates = [
        { key: 'gmail_client_id', value: newConfig.clientId },
      ];

      for (const update of updates) {
        const { data: existing } = await supabase
          .from('system_settings')
          .select('id')
          .eq('key', update.key)
          .single();

        if (existing) {
          const { error } = await supabase
            .from('system_settings')
            .update({ value: update.value, updated_at: new Date().toISOString() })
            .eq('key', update.key);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('system_settings')
            .insert({ key: update.key, value: update.value });
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gmail-admin-config'] });
      queryClient.invalidateQueries({ queryKey: ['email-accounts'] });
      toast.success('Gmail configuration saved');
      setIsEditing(false);
    },
    onError: (error) => {
      toast.error('Failed to save: ' + error.message);
    },
  });

  const handleSave = () => {
    if (!config.clientId) {
      toast.error('Client ID is required');
      return;
    }
    saveConfig.mutate(config);
  };

  const copyRedirectUri = () => {
    navigator.clipboard.writeText(redirectUri);
    toast.success('Redirect URI copied to clipboard');
  };

  const isConfigured = currentConfig?.clientId && currentConfig?.clientId.length > 0;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Gmail OAuth Configuration
            </CardTitle>
            <CardDescription>
              Configure Google Cloud credentials for user OAuth authentication
            </CardDescription>
          </div>
          <Badge variant={isConfigured ? 'default' : 'secondary'}>
            {isConfigured ? (
              <>
                <CheckCircle className="h-3 w-3 mr-1" />
                Configured
              </>
            ) : (
              'Not Configured'
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Redirect URI Info */}
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
          <h4 className="font-medium mb-2 text-red-600 dark:text-red-400">Required Redirect URI</h4>
          <p className="text-sm text-muted-foreground mb-3">
            Add this redirect URI to your Google Cloud OAuth consent screen:
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-muted px-3 py-2 rounded text-xs break-all font-mono">
              {redirectUri}
            </code>
            <Button variant="outline" size="sm" onClick={copyRedirectUri}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Current Configuration or Edit Form */}
        {!isEditing && isConfigured ? (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground mb-1">Client ID</p>
              <p className="font-mono text-sm truncate">{currentConfig?.clientId}</p>
            </div>
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              <Settings2 className="h-4 w-4 mr-2" />
              Edit Configuration
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="gmail-clientId">OAuth Client ID *</Label>
              <Input
                id="gmail-clientId"
                value={config.clientId}
                onChange={(e) => setConfig({ ...config, clientId: e.target.value })}
                placeholder="xxxxxxxx.apps.googleusercontent.com"
              />
              <p className="text-xs text-muted-foreground">
                Found on your Google Cloud Console → Credentials page
              </p>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saveConfig.isPending}>
                {saveConfig.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Configuration
              </Button>
              {isConfigured && (
                <Button variant="outline" onClick={() => {
                  setConfig(currentConfig!);
                  setIsEditing(false);
                }}>
                  Cancel
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Setup Instructions */}
        <div className="p-4 rounded-lg bg-muted/50">
          <h4 className="font-medium mb-2">Google Cloud Setup Instructions</h4>
          <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
            <li>
              Go to{' '}
              <a 
                href="https://console.cloud.google.com/apis/credentials" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                Google Cloud Credentials <ExternalLink className="h-3 w-3" />
              </a>
            </li>
            <li>Create a new project or select an existing one</li>
            <li>Configure the OAuth consent screen (external or internal)</li>
            <li>Create OAuth 2.0 Client ID (Web application type)</li>
            <li>Add the redirect URI shown above to "Authorized redirect URIs"</li>
            <li>Enable the Gmail API from the{' '}
              <a 
                href="https://console.cloud.google.com/apis/library/gmail.googleapis.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                API Library <ExternalLink className="h-3 w-3" />
              </a>
            </li>
            <li>Required scopes:
              <ul className="list-disc list-inside ml-4 mt-1">
                <li><code className="bg-muted px-1 rounded">https://mail.google.com/</code></li>
                <li><code className="bg-muted px-1 rounded">https://www.googleapis.com/auth/userinfo.email</code></li>
              </ul>
            </li>
            <li>Add <code className="bg-muted px-1 rounded">GMAIL_CLIENT_SECRET</code> to backend secrets</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
