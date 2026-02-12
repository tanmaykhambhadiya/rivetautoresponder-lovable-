import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Settings2, Loader2, CheckCircle, ExternalLink, Copy, Shield, Key, AlertCircle, Plug } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface OutlookConfig {
  clientId: string;
  tenantId: string;
  hasSecret?: boolean;
}

export function OutlookAdminConfig() {
  const queryClient = useQueryClient();
  const [config, setConfig] = useState<OutlookConfig>({
    clientId: '',
    tenantId: '',
    hasSecret: false,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [isAddingSecret, setIsAddingSecret] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const redirectUri = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/outlook-oauth-callback`;

  // Fetch current config
  const { data: currentConfig, isLoading } = useQuery({
    queryKey: ['outlook-admin-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', ['outlook_client_id', 'outlook_tenant_id', 'outlook_client_secret_encrypted']);

      if (error) throw error;

      return {
        clientId: String(data.find(s => s.key === 'outlook_client_id')?.value || ''),
        tenantId: String(data.find(s => s.key === 'outlook_tenant_id')?.value || ''),
        hasSecret: !!data.find(s => s.key === 'outlook_client_secret_encrypted')?.value,
      };
    },
  });

  useEffect(() => {
    if (currentConfig) {
      setConfig(currentConfig);
    }
  }, [currentConfig]);

  const saveConfig = useMutation({
    mutationFn: async (newConfig: OutlookConfig) => {
      const updates = [
        { key: 'outlook_client_id', value: newConfig.clientId },
        { key: 'outlook_tenant_id', value: newConfig.tenantId },
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
      queryClient.invalidateQueries({ queryKey: ['outlook-admin-config'] });
      queryClient.invalidateQueries({ queryKey: ['email-accounts'] });
      toast.success('Outlook configuration saved');
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

  const saveClientSecret = useMutation({
    mutationFn: async (secret: string) => {
      const { error } = await supabase.functions.invoke('store-outlook-secret', {
        body: { clientSecret: secret }
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Client secret saved successfully');
      setClientSecret('');
      setIsAddingSecret(false);
    },
    onError: (error) => {
      toast.error('Failed to save secret: ' + error.message);
    },
  });

  // Check if input looks like a GUID (Secret ID) instead of a Secret Value
  const isGuidFormat = (value: string): boolean => {
    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return guidRegex.test(value.trim());
  };

  // Check if input looks like a URL (wrong input)
  const isUrlFormat = (value: string): boolean => {
    const urlRegex = /^https?:\/\//i;
    return urlRegex.test(value.trim());
  };

  const secretIsGuid = isGuidFormat(clientSecret);
  const secretIsUrl = isUrlFormat(clientSecret);
  const secretHasError = secretIsGuid || secretIsUrl;

  const handleSaveSecret = () => {
    if (!clientSecret.trim()) {
      toast.error('Please enter the client secret value');
      return;
    }
    if (secretIsGuid) {
      toast.error('This looks like a Secret ID (GUID). Please enter the Secret VALUE instead.');
      return;
    }
    if (secretIsUrl) {
      toast.error('This looks like a URL. Please enter the Secret VALUE from Azure.');
      return;
    }
    saveClientSecret.mutate(clientSecret);
  };

  const handleTestConnection = async () => {
    if (!currentConfig?.clientId) {
      toast.error('Please configure Client ID first');
      return;
    }
    if (!currentConfig?.hasSecret) {
      toast.error('Please add a Client Secret first');
      return;
    }

    setIsTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-outlook-connection');
      
      if (error) throw error;
      
      if (data?.success) {
        toast.success(`Connection successful! Connected as: ${data.email || 'Unknown'}`);
        queryClient.invalidateQueries({ queryKey: ['outlook-admin-config'] });
      } else {
        toast.error(data?.error || 'Connection test failed');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Connection test failed';
      toast.error(message);
    } finally {
      setIsTesting(false);
    }
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
              Outlook OAuth Configuration
            </CardTitle>
            <CardDescription>
              Configure Azure App credentials for user OAuth authentication
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
        <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <h4 className="font-medium mb-2 text-blue-600 dark:text-blue-400">Required Redirect URI</h4>
          <p className="text-sm text-muted-foreground mb-3">
            Add this redirect URI to your Azure App Registration:
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
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground mb-1">Client ID</p>
                <p className="font-mono text-sm truncate">{currentConfig?.clientId}</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground mb-1">Tenant ID</p>
                <p className="font-mono text-sm truncate">{currentConfig?.tenantId || 'common'}</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              <Settings2 className="h-4 w-4 mr-2" />
              Edit Configuration
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clientId">Application (Client) ID *</Label>
              <Input
                id="clientId"
                value={config.clientId}
                onChange={(e) => setConfig({ ...config, clientId: e.target.value })}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              />
              <p className="text-xs text-muted-foreground">
                Found on your Azure App Registration Overview page
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tenantId">Directory (Tenant) ID</Label>
              <Input
                id="tenantId"
                value={config.tenantId}
                onChange={(e) => setConfig({ ...config, tenantId: e.target.value })}
                placeholder="common (for any Microsoft account)"
              />
              <p className="text-xs text-muted-foreground">
                Use "common" for multi-tenant apps, or specify your tenant ID for single-tenant
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
          <h4 className="font-medium mb-2">Azure Setup Instructions</h4>
          <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
            <li>
              Go to{' '}
              <a 
                href="https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                Azure App Registrations <ExternalLink className="h-3 w-3" />
              </a>
            </li>
            <li>Create a new registration or select existing app</li>
            <li>Under "Authentication", add the redirect URI shown above</li>
            <li>Under "API permissions", add delegated permissions:
              <ul className="list-disc list-inside ml-4 mt-1">
                <li><code className="bg-muted px-1 rounded">Mail.Read</code></li>
                <li><code className="bg-muted px-1 rounded">Mail.Send</code></li>
                <li><code className="bg-muted px-1 rounded">Mail.ReadWrite</code></li>
                <li><code className="bg-muted px-1 rounded">User.Read</code></li>
                <li><code className="bg-muted px-1 rounded">offline_access</code></li>
              </ul>
            </li>
            <li>Under "Certificates & secrets", create a client secret</li>
            <li>Copy the <strong>Secret Value</strong> (not the Secret ID!) and add it below</li>
          </ol>
        </div>

        {/* Client Secret Section */}
        <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <h4 className="font-medium text-amber-600 dark:text-amber-400">Client Secret</h4>
            </div>
            {currentConfig?.hasSecret && (
              <Badge variant="outline" className="border-green-500 text-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                Secret Saved
              </Badge>
            )}
          </div>
          
          <Alert variant="default" className="mb-4 border-amber-500/30 bg-amber-500/5">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Important:</strong> When creating a secret in Azure, you get two values:
              <ul className="list-disc list-inside mt-1 ml-2">
                <li><strong>Secret ID</strong> - A GUID identifier (do NOT use this)</li>
                <li><strong>Value</strong> - The actual secret string (use THIS one)</li>
              </ul>
              The Value is only shown once when created. If you can't see it, create a new secret.
            </AlertDescription>
          </Alert>

          {!isAddingSecret ? (
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={() => setIsAddingSecret(true)}>
                <Key className="h-4 w-4 mr-2" />
                {currentConfig?.hasSecret ? 'Update Client Secret' : 'Add Client Secret'}
              </Button>
              {currentConfig?.hasSecret && isConfigured && (
                <Button 
                  variant="default" 
                  onClick={handleTestConnection} 
                  disabled={isTesting}
                >
                  {isTesting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plug className="h-4 w-4 mr-2" />
                  )}
                  Test Connection
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="clientSecret">Client Secret Value</Label>
                <Input
                  id="clientSecret"
                  type="password"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder="Enter the secret VALUE (not the ID)"
                  className={secretHasError ? 'border-destructive focus-visible:ring-destructive' : ''}
                />
                {secretIsGuid && (
                  <Alert variant="destructive" className="py-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      This looks like a <strong>Secret ID</strong> (GUID format). 
                      Please enter the <strong>Secret Value</strong> instead - it's a longer random string like <code>abc~XYZ123...</code>
                    </AlertDescription>
                  </Alert>
                )}
                {secretIsUrl && (
                  <Alert variant="destructive" className="py-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      This looks like a <strong>URL</strong>. 
                      Please enter the <strong>Secret Value</strong> from Azure instead - it's a random string like <code>abc~XYZ123...</code>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveSecret} disabled={saveClientSecret.isPending || secretHasError}>
                  {saveClientSecret.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Secret
                </Button>
                <Button variant="outline" onClick={() => {
                  setIsAddingSecret(false);
                  setClientSecret('');
                }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
