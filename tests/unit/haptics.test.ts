import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { triggerHaptic } from '@/lib/haptics';

describe('triggerHaptic utility', () => {
  const originalNavigator = global.navigator;
  const originalWindow = (global as any).window;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
    (global as any).window = originalWindow;
  });

  it('safely handles SSR environments without window', () => {
    (global as any).window = undefined;
    expect(() => triggerHaptic('light')).not.toThrow();
  });

  it('safely handles environments without navigator.vibrate', () => {
    (global as any).window = {};
    Object.defineProperty(global, 'navigator', {
      value: {},
      writable: true,
      configurable: true,
    });

    expect(() => triggerHaptic('light')).not.toThrow();
  });

  it('calls navigator.vibrate with 10ms for light haptic', () => {
    const vibrateMock = vi.fn();
    (global as any).window = {};
    Object.defineProperty(global, 'navigator', {
      value: { vibrate: vibrateMock },
      writable: true,
      configurable: true,
    });

    triggerHaptic('light');
    expect(vibrateMock).toHaveBeenCalledWith(10);
  });

  it('calls navigator.vibrate with 20ms for medium haptic', () => {
    const vibrateMock = vi.fn();
    (global as any).window = {};
    Object.defineProperty(global, 'navigator', {
      value: { vibrate: vibrateMock },
      writable: true,
      configurable: true,
    });

    triggerHaptic('medium');
    expect(vibrateMock).toHaveBeenCalledWith(20);
  });

  it('calls navigator.vibrate with rhythmic pattern for success haptic', () => {
    const vibrateMock = vi.fn();
    (global as any).window = {};
    Object.defineProperty(global, 'navigator', {
      value: { vibrate: vibrateMock },
      writable: true,
      configurable: true,
    });

    triggerHaptic('success');
    expect(vibrateMock).toHaveBeenCalledWith([12, 40, 18]);
  });

  it('calls navigator.vibrate with pattern for warning haptic', () => {
    const vibrateMock = vi.fn();
    (global as any).window = {};
    Object.defineProperty(global, 'navigator', {
      value: { vibrate: vibrateMock },
      writable: true,
      configurable: true,
    });

    triggerHaptic('warning');
    expect(vibrateMock).toHaveBeenCalledWith([25, 50, 25]);
  });
});
