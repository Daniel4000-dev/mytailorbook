'use client';

import { useCallback, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * Cross-device read state backed by `atelier_notifications.read_at`.
 *
 * The hook maintains a local `readIds` Set for immediate UI feedback
 * (zero-latency optimistic update) while the Supabase write propagates
 * in the background and the Realtime subscription in `useNotifications`
 * picks up the UPDATE event to keep the canonical list in sync.
 */
export function useNotificationReadState() {
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());

  const markRead = useCallback((id: string) => {
    setReadIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });

    // Persist to DB — fire-and-forget; Realtime UPDATE will confirm.
    try {
      const supabase = createClient();
      Promise.resolve(
        supabase
          .from('atelier_notifications')
          .update({ read_at: new Date().toISOString() })
          .eq('id', id)
          .is('read_at', null)
      ).then(() => {}).catch(() => {});
    } catch {}
  }, []);

  const markAllRead = useCallback((ids: string[]) => {
    if (ids.length === 0) return;

    setReadIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });

    // Bulk update — only touch rows that are still unread.
    try {
      const supabase = createClient();
      Promise.resolve(
        supabase
          .from('atelier_notifications')
          .update({ read_at: new Date().toISOString() })
          .in('id', ids)
          .is('read_at', null)
      ).then(() => {}).catch(() => {});
    } catch {}
  }, []);

  return { readIds, markRead, markAllRead };
}
