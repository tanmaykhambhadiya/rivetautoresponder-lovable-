import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEffect, useCallback, useRef, useState } from 'react';

export interface InboxEmail {
  id: string;
  user_id: string | null;
  provider: string | null;
  outlook_message_id: string;
  from_email: string;
  from_name: string | null;
  subject: string | null;
  body_preview: string | null;
  body: string | null;
  received_at: string;
  is_read: boolean;
  is_starred: boolean;
  has_attachments: boolean;
  category: string;
  importance: string | null;
  synced_at: string;
  created_at: string;
}

export function useInboxEmails() {
  const queryClient = useQueryClient();
  const processingRef = useRef(false);
  const syncingRef = useRef(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const { data: emails = [], isLoading, error } = useQuery({
    queryKey: ['inbox-emails'],
    queryFn: async (): Promise<InboxEmail[]> => {
      const { data, error } = await supabase
        .from('inbox_emails')
        .select('*')
        .order('received_at', { ascending: false });
      
      if (error) throw error;
      return data as InboxEmail[];
    }
  });

  // Background sync function - polls email providers
  const syncEmails = useCallback(async (silent = false) => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    if (!silent) setIsSyncing(true);
    
    try {
      // Get connected accounts
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) return;

      const { data: accounts } = await supabase
        .from('email_accounts')
        .select('provider')
        .eq('user_id', session.session.user.id);

      if (!accounts?.length) return;

      // Sync each provider
      for (const account of accounts) {
        const functionName = account.provider === 'gmail' ? 'gmail-sync-emails' : 'outlook-sync-emails';
        console.log(`🔄 Auto-syncing ${account.provider}...`);
        
        const { data, error } = await supabase.functions.invoke(functionName);
        
        if (error) {
          console.error(`Sync error for ${account.provider}:`, error);
        } else if (data?.synced > 0 && !silent) {
          toast.success(`📬 ${data.synced} new email(s) synced!`);
        }
      }
      
      // Refresh the query cache
      queryClient.invalidateQueries({ queryKey: ['inbox-emails'] });
    } catch (err) {
      console.error('Auto-sync error:', err);
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
    }
  }, [queryClient]);

  // Auto-process new emails instantly
  const processNewEmail = useCallback(async () => {
    if (processingRef.current) return;
    
    processingRef.current = true;
    console.log('⚡ Real-time: New email detected, processing instantly...');
    
    try {
      const { data, error } = await supabase.functions.invoke('process-emails');
      
      if (error) {
        console.error('Auto-process error:', error);
      } else if (data?.matched > 0) {
        toast.success(`⚡ Instant match! ${data.matched} shift(s) assigned`, {
          description: 'Response sent in under 5 seconds'
        });
      } else if (data?.processed > 0) {
        toast.info(`Processed ${data.processed} email(s)`);
      }
    } catch (err) {
      console.error('Process error:', err);
    } finally {
      processingRef.current = false;
    }
  }, []);

  // Set up realtime subscription for inbox_emails
  useEffect(() => {
    console.log('🔌 Setting up realtime subscription for inbox_emails...');
    
    const channel = supabase
      .channel('inbox-emails-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'inbox_emails'
        },
        (payload) => {
          console.log('📬 New email received in real-time:', payload.new);
          
          // Immediately update the query cache with new email
          queryClient.setQueryData(['inbox-emails'], (old: InboxEmail[] = []) => {
            const newEmail = payload.new as InboxEmail;
            // Add to beginning of array (most recent first)
            return [newEmail, ...old.filter(e => e.id !== newEmail.id)];
          });
          
          // Toast notification for new email
          const newEmail = payload.new as InboxEmail;
          toast.info(`📨 New email from ${newEmail.from_name || newEmail.from_email}`, {
            description: newEmail.subject || 'No subject'
          });
          
          // Instantly trigger processing
          processNewEmail();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'inbox_emails'
        },
        (payload) => {
          console.log('📝 Email updated:', payload.new);
          queryClient.setQueryData(['inbox-emails'], (old: InboxEmail[] = []) => {
            const updated = payload.new as InboxEmail;
            return old.map(e => e.id === updated.id ? updated : e);
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'inbox_emails'
        },
        (payload) => {
          console.log('🗑️ Email deleted:', payload.old);
          queryClient.setQueryData(['inbox-emails'], (old: InboxEmail[] = []) => {
            return old.filter(e => e.id !== (payload.old as InboxEmail).id);
          });
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime subscription status:', status);
      });

    // Start initial sync
    syncEmails(true);

    // Set up polling every 10 seconds for real-time experience
    const pollInterval = setInterval(() => {
      console.log('🔄 Polling for new emails...');
      syncEmails(true);
    }, 10000); // 10 seconds

    return () => {
      console.log('🔌 Cleaning up realtime subscription...');
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [queryClient, processNewEmail, syncEmails]);

  const updateEmail = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<InboxEmail> }) => {
      const { error } = await supabase
        .from('inbox_emails')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox-emails'] });
    },
    onError: (error) => {
      toast.error('Failed to update email: ' + error.message);
    }
  });

  const toggleStar = (id: string, currentStarred: boolean) => {
    updateEmail.mutate({ id, updates: { is_starred: !currentStarred } });
  };

  const markAsRead = (id: string) => {
    updateEmail.mutate({ id, updates: { is_read: true } });
  };

  const markAsUnread = (id: string) => {
    updateEmail.mutate({ id, updates: { is_read: false } });
  };

  return {
    emails,
    isLoading,
    isSyncing,
    error,
    updateEmail,
    toggleStar,
    markAsRead,
    markAsUnread,
    syncEmails,
  };
}
