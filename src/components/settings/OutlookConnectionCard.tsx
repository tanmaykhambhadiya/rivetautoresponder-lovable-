import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useEmailAccounts } from '@/hooks/useEmailAccounts';
import { Mail, Unlink, CheckCircle, Loader2, ExternalLink, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export function OutlookConnectionCard() {
  const { accounts, isLoading, getOutlookAccount, disconnectAccount, startOutlookOAuth, syncEmails } = useEmailAccounts();
  const [searchParams, setSearchParams] = useSearchParams();

  const outlookAccount = getOutlookAccount();
  const isConnected = !!outlookAccount;

  // Handle OAuth callback results
  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const email = searchParams.get('email');

    if (success) {
      toast.success(success + (email ? ` (${email})` : ''));
      // Clear query params
      searchParams.delete('success');
      searchParams.delete('email');
      setSearchParams(searchParams, { replace: true });
    }

    if (error) {
      toast.error(decodeURIComponent(error));
      searchParams.delete('error');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleConnectOutlook = () => {
    startOutlookOAuth();
  };

  const handleDisconnect = () => {
    disconnectAccount.mutate('outlook');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-[#0078d4]/10">
            <Mail className="h-5 w-5 text-[#0078d4]" />
          </div>
          <span className="font-medium">Microsoft Outlook</span>
        </div>
        <Badge 
          variant={isConnected ? 'default' : 'outline'}
          className={isConnected ? 'bg-success text-success-foreground' : ''}
        >
          {isConnected ? (
            <>
              <CheckCircle className="h-3 w-3 mr-1" />
              Connected
            </>
          ) : (
            'Not Connected'
          )}
        </Badge>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : isConnected ? (
        // Connected State
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-success/10 border border-success/20">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-success/20">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="font-medium text-success">Connected Successfully</p>
                <p className="text-sm text-muted-foreground">{outlookAccount.email}</p>
              </div>
            </div>
            {outlookAccount.expires_at && (
              <p className="text-xs text-muted-foreground mt-2">
                Token expires: {new Date(outlookAccount.expires_at).toLocaleString()}
              </p>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => syncEmails.mutate()}
              disabled={syncEmails.isPending}
            >
              {syncEmails.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Sync Emails
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Unlink className="h-4 w-4 mr-2" />
                  Disconnect
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Disconnect Outlook?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove your Outlook connection and stop all email automation. 
                    You can reconnect at any time.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDisconnect}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Disconnect
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      ) : (
        // Not connected
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-muted/50">
            <h4 className="font-medium mb-2">How it works</h4>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Click "Connect Outlook" below</li>
              <li>Sign in with your Microsoft account</li>
              <li>Grant permission to read and send emails</li>
              <li>You'll be redirected back here once connected</li>
            </ol>
          </div>

          <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <h4 className="font-medium mb-2 text-blue-600 dark:text-blue-400">Admin Setup Required</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Before users can connect, an administrator must configure the Azure App:
            </p>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>
                Go to{' '}
                <a href="https://portal.azure.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                  Azure Portal <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>Create an App Registration with redirect URI:</li>
              <li className="ml-4">
                <code className="bg-muted px-2 py-0.5 rounded text-xs break-all">
                  https://ajaegyvfielffgajuodc.supabase.co/functions/v1/outlook-oauth-callback
                </code>
              </li>
              <li>Add delegated permissions: Mail.Read, Mail.Send, Mail.ReadWrite, User.Read</li>
              <li>Add MICROSOFT_CLIENT_SECRET to backend secrets</li>
            </ol>
          </div>
          
          <Button onClick={handleConnectOutlook} className="w-full">
            <Mail className="h-4 w-4 mr-2" />
            Connect Outlook
          </Button>
        </div>
      )}
    </div>
  );
}
