import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import NotificationPrompt from '@/components/notifications/NotificationPrompt/NotificationPrompt';
import PushNotificationToggle from '@/app/(app)/settings/_components/PushNotificationToggle';
import { ToastProvider } from '@/contexts/ToastContext';

// Mock contexts
const mockShowToast = vi.fn();
vi.mock('@/contexts/ToastContext', () => ({
  ToastProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useToast: () => ({
    showToast: mockShowToast,
  }),
}));

const mockUser = {
  id: 'usr-tailor-01',
  email: 'master@crowntailors.com',
};

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    isOwner: true,
    loading: false,
  }),
}));

// Mock server actions
const mockSavePushSubscriptionAction = vi.fn().mockResolvedValue({});
const mockRemovePushSubscriptionAction = vi.fn().mockResolvedValue({});

vi.mock('@/app/actions', () => ({
  savePushSubscriptionAction: (...args: unknown[]) => mockSavePushSubscriptionAction(...args),
  removePushSubscriptionAction: (...args: unknown[]) => mockRemovePushSubscriptionAction(...args),
}));

describe('Notification Prompt & Push Toggle Component Suite', () => {
  let mockPushManager: { getSubscription: ReturnType<typeof vi.fn>; subscribe: ReturnType<typeof vi.fn> };
  let mockRegistration: { active: boolean; pushManager: typeof mockPushManager };

  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();

    mockPushManager = {
      getSubscription: vi.fn().mockResolvedValue(null),
      subscribe: vi.fn().mockResolvedValue({
        endpoint: 'https://fcm.googleapis.com/fcm/send/test-sub',
        toJSON: () => ({
          endpoint: 'https://fcm.googleapis.com/fcm/send/test-sub',
          keys: { p256dh: 'test-p256dh', auth: 'test-auth' },
        }),
      }),
    };

    mockRegistration = {
      active: true,
      pushManager: mockPushManager,
    };

    Object.defineProperty(window, 'Notification', {
      writable: true,
      configurable: true,
      value: {
        permission: 'default',
        requestPermission: vi.fn().mockResolvedValue('granted'),
      },
    });

    Object.defineProperty(window, 'PushManager', {
      writable: true,
      configurable: true,
      value: class {},
    });

    Object.defineProperty(navigator, 'serviceWorker', {
      writable: true,
      configurable: true,
      value: {
        register: vi.fn().mockResolvedValue(mockRegistration),
        getRegistration: vi.fn().mockResolvedValue(mockRegistration),
        ready: Promise.resolve(mockRegistration),
      },
    });

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockReturnValue({
        matches: true,
        media: '',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
      }),
    });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('State 1 (Rich / Full Data): mounts notification prompt and handles one-tap enablement cleanly', async () => {
    vi.useFakeTimers();

    render(
      <ToastProvider>
        <NotificationPrompt />
      </ToastProvider>
    );

    await act(async () => {
      vi.advanceTimersByTime(2500);
    });

    expect(screen.getByRole('dialog', { name: /enable notifications/i })).toBeTruthy();
    expect(screen.getByText(/Turn on notifications/i)).toBeTruthy();

    const turnOnBtn = screen.getByRole('button', { name: /turn on/i });

    await act(async () => {
      fireEvent.click(turnOnBtn);
    });

    expect(window.Notification.requestPermission).toHaveBeenCalled();
    expect(mockSavePushSubscriptionAction).toHaveBeenCalledWith({
      endpoint: 'https://fcm.googleapis.com/fcm/send/test-sub',
      keys: { p256dh: 'test-p256dh', auth: 'test-auth' },
    });
    expect(mockShowToast).toHaveBeenCalledWith('Notifications enabled for this device', 'success');
  });

  it('State 2 (Sparse / Minimal Data): handles dismissed state without rendering', () => {
    window.localStorage.setItem('mtb_notif_prompt_dismissed_at', String(Date.now()));

    render(
      <ToastProvider>
        <NotificationPrompt />
      </ToastProvider>
    );

    expect(screen.queryByRole('dialog', { name: /enable notifications/i })).toBeNull();
  });

  it('State 3 (Edge-Case / Corrupted Data): recovers gracefully from denied permission without perpetual loading', async () => {
    vi.useFakeTimers();
    (window.Notification.requestPermission as unknown as ReturnType<typeof vi.fn>).mockResolvedValue('denied');

    render(
      <ToastProvider>
        <NotificationPrompt />
      </ToastProvider>
    );

    await act(async () => {
      vi.advanceTimersByTime(2500);
    });

    const turnOnBtn = screen.getByRole('button', { name: /turn on/i });
    await act(async () => {
      fireEvent.click(turnOnBtn);
    });

    expect(mockShowToast).toHaveBeenCalledWith('Notifications are blocked in your browser settings.', 'error');
    expect(screen.queryByRole('dialog', { name: /enable notifications/i })).toBeNull();
  });

  it('State 3b (Edge-Case / WebKit Timeout): recovers gracefully when service worker times out without staying stuck', async () => {
    vi.useFakeTimers();

    Object.defineProperty(navigator, 'serviceWorker', {
      writable: true,
      configurable: true,
      value: {
        register: vi.fn().mockResolvedValue({}),
        getRegistration: vi.fn().mockResolvedValue(null),
        ready: new Promise(() => {}), // never resolves
      },
    });

    render(
      <ToastProvider>
        <NotificationPrompt />
      </ToastProvider>
    );

    await act(async () => {
      vi.advanceTimersByTime(2500);
    });

    const turnOnBtn = screen.getByRole('button', { name: /turn on/i });
    await act(async () => {
      fireEvent.click(turnOnBtn);
    });

    await act(async () => {
      vi.advanceTimersByTime(8000);
    });

    expect(mockShowToast).toHaveBeenCalledWith(
      expect.stringMatching(/initializing|timed out|not supported/i),
      'error'
    );
    expect(screen.queryByRole('dialog', { name: /enable notifications/i })).toBeNull();
  });

  it('Settings PushNotificationToggle: mounts, renders button, and enables push cleanly', async () => {
    render(
      <ToastProvider>
        <PushNotificationToggle />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /enable notifications/i })).toBeTruthy();
    });

    const toggleBtn = screen.getByRole('button', { name: /enable notifications/i });
    fireEvent.click(toggleBtn);

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Notifications enabled', 'success');
      expect(screen.getByRole('button', { name: /disable notifications/i })).toBeTruthy();
    });
  });
});
