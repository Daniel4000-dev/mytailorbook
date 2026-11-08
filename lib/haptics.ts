/**
 * Subtle tactile haptic feedback for mobile devices.
 * Uses navigator.vibrate when available (Android Chrome, PWA standalone, mobile browsers).
 * Completely safe and non-blocking on desktop or unsupported devices.
 */
export type HapticType = 'light' | 'medium' | 'success' | 'warning' | 'selection';

export function triggerHaptic(type: HapticType = 'light'): void {
  if (typeof window === 'undefined' || typeof navigator === 'undefined' || !('vibrate' in navigator)) {
    return;
  }

  try {
    switch (type) {
      case 'selection':
      case 'light':
        // Crisp 10ms micro-tick for card tap / selection
        navigator.vibrate(10);
        break;
      case 'medium':
        // 20ms tactile confirmation for button presses
        navigator.vibrate(20);
        break;
      case 'success':
        // Two-pulse celebratory rhythm for completed stages or sales
        navigator.vibrate([12, 40, 18]);
        break;
      case 'warning':
        // Double warning pulse
        navigator.vibrate([25, 50, 25]);
        break;
    }
  } catch {
    // Fail-safe if vibration is blocked by user preference or iframe policy
  }
}
