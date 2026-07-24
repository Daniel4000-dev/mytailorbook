'use client';

import { useCallback, useState } from 'react';
import { getClientCookie, setClientCookie } from '@/lib/client-cookies';

const COOKIE_KEY = 'mtb_read_notifications';
// Notification ids are derived, not stored server-side, so this cookie is
// the only record of "seen" — capped well under the ~4KB cookie limit.
const MAX_STORED = 300;

function loadReadIds(): Set<string> {
  const raw = getClientCookie(COOKIE_KEY);
  if (!raw) return new Set();
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch {
    return new Set();
  }
}

function saveReadIds(ids: Set<string>) {
  setClientCookie(COOKIE_KEY, JSON.stringify(Array.from(ids).slice(-MAX_STORED)));
}

export function useNotificationReadState() {
  const [readIds, setReadIds] = useState<Set<string>>(() => loadReadIds());

  const markRead = useCallback((id: string) => {
    setReadIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      saveReadIds(next);
      return next;
    });
  }, []);

  const markAllRead = useCallback((ids: string[]) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      saveReadIds(next);
      return next;
    });
  }, []);

  return { readIds, markRead, markAllRead };
}
