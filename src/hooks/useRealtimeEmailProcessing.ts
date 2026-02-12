import { useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSystemSettings } from "@/hooks/useSystemSettings";

/**
 * Keeps email syncing + auto-processing running in the background so responses can be near real-time
 * even when the user is not on the /inbox page.
 */
export function useRealtimeEmailProcessing() {
  const { isEmailProcessingEnabled, isAutoResponseEnabled } = useSystemSettings();

  const processingRef = useRef(false);
  const syncingRef = useRef(false);

  const processEmails = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;

    try {
      await supabase.functions.invoke("process-emails");
    } catch {
      // Intentionally silent here to avoid toast spam on all pages.
    } finally {
      processingRef.current = false;
    }
  }, []);

  const syncEmails = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) return;

      const { data: accounts } = await supabase
        .from("email_accounts")
        .select("provider")
        .eq("user_id", session.session.user.id);

      if (!accounts?.length) return;

      for (const account of accounts) {
        const functionName = account.provider === "gmail" ? "gmail-sync-emails" : "outlook-sync-emails";
        await supabase.functions.invoke(functionName);
      }
    } finally {
      syncingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!isEmailProcessingEnabled || !isAutoResponseEnabled) return;

    // 1) Listen for new emails arriving in the DB (realtime)
    const channel = supabase
      .channel("email-processing-daemon")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "inbox_emails",
        },
        () => {
          // 2) Immediately process whenever a new email record appears
          processEmails();
        }
      )
      .subscribe();

    // 3) Poll providers frequently to pull new emails into the DB.
    // NOTE: External providers (Gmail/Outlook) are not true push here; polling determines worst-case latency.
    syncEmails();
    const pollInterval = setInterval(syncEmails, 3000);

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [isAutoResponseEnabled, isEmailProcessingEnabled, processEmails, syncEmails]);
}
