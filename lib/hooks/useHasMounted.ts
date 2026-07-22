import { useSyncExternalStore } from 'react';

const emptySubscribe = () => () => {};

/** True once the component has hydrated on the client — false during SSR
 *  and the first client render, so portal/measurement logic that needs
 *  `document`/`window` can wait a tick without ever mismatching hydration.
 *  Implemented via useSyncExternalStore (server snapshot false, client
 *  snapshot true) rather than a mount effect + setState, so it never trips
 *  "no setState synchronously in an effect". */
export function useHasMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}
