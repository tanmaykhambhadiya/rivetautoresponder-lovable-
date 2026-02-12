import { useEffect } from 'react';
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
import { Link, Unlink, CheckCircle, Loader2, RefreshCw, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';

export function GmailConnectionCard() {
  const { 
    getGmailAccount, 
    isLoading, 
    disconnectAccount, 
    startGmailOAuth 
  } = useEmailAccounts();
  const [searchParams, setSearchParams] = useSearchParams();

  const gmailAccount = getGmailAccount();
  const isConnected = !!gmailAccount;

  // Handle OAuth redirect success/error
  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const email = searchParams.get('email');

    if (success && success.toLowerCase().includes('gmail')) {
      toast.success(email ? `Gmail connected: ${email}` : 'Gmail connected successfully');
      // Clean up URL params
      searchParams.delete('success');
      searchParams.delete('email');
      setSearchParams(searchParams);
    }

    if (error && !success) {
      // Only show error if it seems Gmail-related or no success
      const isGmailError = error.toLowerCase().includes('gmail') || 
                           error.toLowerCase().includes('google');
      if (isGmailError) {
        toast.error('Gmail connection failed: ' + error);
        searchParams.delete('error');
        setSearchParams(searchParams);
      }
    }
  }, [searchParams, setSearchParams]);

  const handleConnect = () => {
    toast.info('Opening Google sign-in in a new tab...');
    startGmailOAuth();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-[#EA4335]/10">
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
            </svg>
          </div>
          <span className="font-medium">Google Gmail</span>
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
                <p className="text-sm text-muted-foreground">{gmailAccount.email}</p>
              </div>
            </div>
            {gmailAccount.expires_at && (
              <p className="text-xs text-muted-foreground mt-2">
                Token expires: {new Date(gmailAccount.expires_at).toLocaleString()}
              </p>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleConnect}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reconnect
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
                  <AlertDialogTitle>Disconnect Gmail?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove your Gmail connection and stop all email automation. 
                    You can reconnect at any time.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => disconnectAccount.mutate('gmail')}
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
            <p className="text-sm text-muted-foreground">
              Connect your Gmail account with one click to enable email automation.
              You'll be redirected to Google to authorize access.
            </p>
          </div>
          
          <Button onClick={handleConnect}>
            <Link className="h-4 w-4 mr-2" />
            Connect Gmail
          </Button>

          <p className="text-xs text-muted-foreground">
            Requires admin to configure Gmail OAuth first.{' '}
            <a 
              href="https://console.cloud.google.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              Google Cloud Console <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        </div>
      )}
    </div>
  );
}
