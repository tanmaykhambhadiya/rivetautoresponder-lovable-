import { ReactNode, useState, useEffect, useRef } from 'react';
import { Sidebar } from './Sidebar';
import { PageTransition } from './PageTransition';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Loader2, LogOut, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ScrollToTop } from '@/components/ui/scroll-to-top';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeEmailProcessing } from '@/hooks/useRealtimeEmailProcessing';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, profile, isLoading, hasAnyRole, signOut } = useAuth();
  const [requestSent, setRequestSent] = useState(false);
  const [checkingRequest, setCheckingRequest] = useState(true);
  const scrollViewportRef = useRef<HTMLDivElement>(null);

  // Keep automation running even if the user is on /dashboard (not just /inbox)
  useRealtimeEmailProcessing();

  useEffect(() => {
    const checkExistingRequest = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('access_requests')
        .select('id, status')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (data) {
        setRequestSent(true);
      }
      setCheckingRequest(false);
    };

    checkExistingRequest();
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-screen h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const handleRequestAccess = async () => {
    try {
      const { error } = await supabase
        .from('access_requests')
        .insert({
          user_id: user.id,
          email: user.email || '',
          full_name: profile?.full_name || null,
        });

      if (error) throw error;

      setRequestSent(true);
      toast.success('Access request sent! An administrator will review your request.');
    } catch (error: any) {
      toast.error('Failed to send request: ' + error.message);
    }
  };

  if (!hasAnyRole) {
    return (
      <div className="flex items-center justify-center w-screen h-screen bg-background">
        <div className="w-full max-w-xl p-8">
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-8">
            <div className="w-16 h-16 mb-4 rounded-full bg-warning/20 flex items-center justify-center">
              <span className="text-3xl">⏳</span>
            </div>
            <h1 className="text-2xl font-bold mb-2">Access Pending</h1>
            <p className="text-muted-foreground mb-4">
              Your account has been created but you don't have any roles assigned yet.
              Please contact an administrator to grant you access.
            </p>
            <p className="text-sm text-muted-foreground mb-6">Signed in as: {user.email}</p>
            <div className="flex flex-col gap-3">
              <Button onClick={handleRequestAccess} disabled={requestSent} className="gap-2">
                <Send className="h-4 w-4" />
                {requestSent ? 'Request Sent' : 'Request Access'}
              </Button>
              <Button variant="outline" onClick={() => signOut()} className="gap-2">
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Fixed/Sticky sidebar column */}
      <div className="shrink-0 h-screen sticky top-0 left-0">
        <Sidebar />
      </div>

      {/* Full-height content area with independent scroll */}
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        <ScrollArea className="flex-1 h-full" viewportRef={scrollViewportRef}>
          <PageTransition className="w-full h-full">
            <main className="w-full h-full">
              <div className="p-4 sm:p-6 lg:p-8 w-full">
                {children}
              </div>
            </main>
          </PageTransition>
        </ScrollArea>
        <ScrollToTop scrollContainer={scrollViewportRef} />
      </div>
    </div>
  );
}