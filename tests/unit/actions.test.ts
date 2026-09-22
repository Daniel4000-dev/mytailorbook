import { describe, it, expect, vi } from 'vitest';
import { addCustomerAction } from '@/app/actions';

// Mock server-only to prevent it from throwing in the test environment
vi.mock('server-only', () => ({}));

// Mock the Supabase server client
vi.mock('@/lib/supabase/server', () => {
  const mockSingle = vi.fn().mockResolvedValue({
    error: { message: 'A database constraint error occurred. (Human readable)' },
    data: null
  });
  
  return {
    createClient: vi.fn(() => ({
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: mockSingle
    }))
  };
});

describe('Server Actions Error Handling', () => {
  it('returns a human-readable error object instead of throwing when the database operation fails', async () => {
    // Attempt to add a customer, which will hit the mocked Supabase single() error
    const result = await addCustomerAction('test-shop', 'test-org', {
      fullName: 'John Doe',
      whatsappNumber: '1234567890',
      gender: 'male',
    });

    // Verify it doesn't throw, but gracefully returns the expected error object format
    expect(result).toBeDefined();
    expect(result).toHaveProperty('error');
    expect((result as any).error).toBe('A database constraint error occurred. (Human readable)');
  });
});
