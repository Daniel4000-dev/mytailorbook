'use client';

/** Paystack's own inline-checkout global, attached to `window` once
 *  https://js.paystack.co/v2/inline.js has loaded. Minimal typing — only
 *  the one method this app actually calls. */
interface PaystackPopInstance {
  resumeTransaction: (
    accessCode: string,
    options?: {
      onSuccess?: (transaction: { reference: string }) => void;
      onCancel?: () => void;
      onError?: (error: { message: string }) => void;
    }
  ) => void;
}

declare global {
  interface Window {
    PaystackPop?: new () => PaystackPopInstance;
  }
}

let loadPromise: Promise<void> | null = null;

/** Loads Paystack's inline-checkout script exactly once, however many
 *  times this is called — cached as a promise (not just a boolean) so
 *  concurrent callers all await the same in-flight load instead of
 *  racing to inject duplicate <script> tags. */
function loadPaystackScript(): Promise<void> {
  if (window.PaystackPop) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v2/inline.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loadPromise = null;
      reject(new Error('Could not load the payment popup — check your connection and try again.'));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}

/** Warms the inline-checkout script ahead of time (e.g. as soon as the plan
 *  picker opens) so the click that actually starts checkout doesn't have to
 *  wait on this network fetch — on a cold load that gap was long enough for
 *  the user to see nothing happen between closing the plan sheet and the
 *  popup appearing. Safe to call repeatedly; loadPaystackScript() itself
 *  already dedupes. */
export function preloadPaystackScript(): void {
  loadPaystackScript().catch(() => {
    // Swallow — openPaystackPopup will surface the real error if the user
    // actually goes on to click Upgrade while this is still failing.
  });
}

/** Resumes an already-initialized Paystack transaction (created
 *  server-side via transaction/initialize) inside an in-page popup,
 *  rather than redirecting the whole browser to Paystack's hosted
 *  checkout page. Avoids the full navigate-away-and-back round trip
 *  entirely — nothing to lose a session over, no domain to get wrong. */
export async function openPaystackPopup(
  accessCode: string,
  handlers: {
    onSuccess?: (transaction: { reference: string }) => void;
    onCancel?: () => void;
    onError?: (error: { message: string }) => void;
  }
): Promise<void> {
  await loadPaystackScript();
  if (!window.PaystackPop) {
    throw new Error('Payment popup failed to load — please try again.');
  }
  const popup = new window.PaystackPop();
  popup.resumeTransaction(accessCode, handlers);
}
