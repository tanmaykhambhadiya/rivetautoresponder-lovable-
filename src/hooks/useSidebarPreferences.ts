import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Json } from '@/integrations/supabase/types';

interface SidebarPreferences {
  isCollapsed: boolean;
  width: number;
}

const DEFAULT_PREFERENCES: SidebarPreferences = {
  isCollapsed: false,
  width: 256, // 16rem = 256px
};

const MIN_WIDTH = 200;
const MAX_WIDTH = 400;
const COLLAPSED_WIDTH = 64; // 4rem = 64px

export function useSidebarPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Local state for immediate UI feedback
  const [localPrefs, setLocalPrefs] = useState<SidebarPreferences>(DEFAULT_PREFERENCES);
  const [isResizing, setIsResizing] = useState(false);

  // Fetch preferences from database
  const { data: dbPrefs, isLoading } = useQuery({
    queryKey: ['sidebar-preferences', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('user_preferences')
        .select('value')
        .eq('user_id', user.id)
        .eq('key', 'sidebar')
        .maybeSingle();

      if (error) throw error;
      if (!data?.value) return null;
      
      // Safely cast the JSON value
      const value = data.value as unknown as SidebarPreferences;
      if (typeof value?.isCollapsed === 'boolean' && typeof value?.width === 'number') {
        return value;
      }
      return null;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Sync local state when DB data loads
  useEffect(() => {
    if (dbPrefs) {
      setLocalPrefs(dbPrefs);
    }
  }, [dbPrefs]);

  // Save preferences mutation
  const saveMutation = useMutation({
    mutationFn: async (prefs: SidebarPreferences) => {
      if (!user?.id) return;

      // Check if record exists first
      const { data: existing } = await supabase
        .from('user_preferences')
        .select('id')
        .eq('user_id', user.id)
        .eq('key', 'sidebar')
        .maybeSingle();

      const jsonValue = { isCollapsed: prefs.isCollapsed, width: prefs.width } as unknown as Json;
      
      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from('user_preferences')
          .update({ value: jsonValue })
          .eq('user_id', user.id)
          .eq('key', 'sidebar');

        if (error) throw error;
      } else {
        // Insert new record
        const { error } = await supabase
          .from('user_preferences')
          .insert([
            {
              user_id: user.id,
              key: 'sidebar',
              value: jsonValue,
            },
          ]);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sidebar-preferences', user?.id] });
    },
  });

  // Debounced save
  const savePreferences = useCallback(
    (prefs: SidebarPreferences) => {
      saveMutation.mutate(prefs);
    },
    [saveMutation]
  );

  // Toggle collapse state
  const toggleCollapsed = useCallback(() => {
    const newPrefs = { ...localPrefs, isCollapsed: !localPrefs.isCollapsed };
    setLocalPrefs(newPrefs);
    savePreferences(newPrefs);
  }, [localPrefs, savePreferences]);

  // Set width (during resize)
  const setWidth = useCallback((width: number) => {
    const clampedWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width));
    setLocalPrefs(prev => ({ ...prev, width: clampedWidth }));
  }, []);

  // Commit width (after resize ends)
  const commitWidth = useCallback(() => {
    setIsResizing(false);
    savePreferences(localPrefs);
  }, [localPrefs, savePreferences]);

  // Start resizing
  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, []);

  // Computed current width
  const currentWidth = localPrefs.isCollapsed ? COLLAPSED_WIDTH : localPrefs.width;

  return {
    isCollapsed: localPrefs.isCollapsed,
    width: localPrefs.width,
    currentWidth,
    isLoading,
    isResizing,
    toggleCollapsed,
    setWidth,
    startResizing,
    commitWidth,
    MIN_WIDTH,
    MAX_WIDTH,
    COLLAPSED_WIDTH,
  };
}
