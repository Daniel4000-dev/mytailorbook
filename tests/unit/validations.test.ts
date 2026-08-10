import { describe, it, expect } from 'vitest';
import {
  loginSchema,
  signupSchema,
  resetPasswordSchema,
  updatePasswordSchema,
  customerSchema,
  onboardingSchema,
  newOrderBatchSchema,
} from '@/lib/validations';

// These schemas are the actual data-entry boundary for auth and the
// walk-in customer/order flow — a bug here either lets bad data through
// or silently blocks legitimate input (e.g. a real customer's phone
// number), neither of which shows up until someone hits it live.

describe('loginSchema', () => {
  it('accepts a valid email and non-empty password', () => {
    const result = loginSchema.safeParse({ email: 'owner@shop.com', password: 'x' });
    expect(result.success).toBe(true);
  });

  it('rejects a malformed email', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: 'x' });
    expect(result.success).toBe(false);
  });

  it('rejects an empty password', () => {
    const result = loginSchema.safeParse({ email: 'owner@shop.com', password: '' });
    expect(result.success).toBe(false);
  });
});

describe('signupSchema', () => {
  const base = { name: 'Ada Lovelace', email: 'ada@shop.com', password: 'secret1', confirmPw: 'secret1' };

  it('accepts matching passwords of sufficient length', () => {
    expect(signupSchema.safeParse(base).success).toBe(true);
  });

  it('rejects a name shorter than 2 characters', () => {
    const result = signupSchema.safeParse({ ...base, name: 'A' });
    expect(result.success).toBe(false);
  });

  it('rejects a password shorter than 6 characters', () => {
    const result = signupSchema.safeParse({ ...base, password: 'abc', confirmPw: 'abc' });
    expect(result.success).toBe(false);
  });

  it('rejects mismatched password confirmation, flagged on confirmPw', () => {
    const result = signupSchema.safeParse({ ...base, confirmPw: 'different' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['confirmPw']);
    }
  });
});

describe('resetPasswordSchema', () => {
  it('accepts a valid email', () => {
    expect(resetPasswordSchema.safeParse({ email: 'owner@shop.com' }).success).toBe(true);
  });

  it('rejects an invalid email', () => {
    expect(resetPasswordSchema.safeParse({ email: 'nope' }).success).toBe(false);
  });
});

describe('updatePasswordSchema', () => {
  it('accepts matching passwords', () => {
    expect(updatePasswordSchema.safeParse({ password: 'secret1', confirmPw: 'secret1' }).success).toBe(true);
  });

  it('rejects mismatched passwords', () => {
    expect(updatePasswordSchema.safeParse({ password: 'secret1', confirmPw: 'secret2' }).success).toBe(false);
  });
});

describe('customerSchema', () => {
  const base = { fullName: 'Chioma Eze', phone: '08012345678', gender: 'female' as const };

  it('accepts a valid walk-in customer', () => {
    expect(customerSchema.safeParse(base).success).toBe(true);
  });

  it('accepts an international phone number with a plus prefix', () => {
    expect(customerSchema.safeParse({ ...base, phone: '+447700900000' }).success).toBe(true);
  });

  it('rejects a name shorter than 2 characters', () => {
    expect(customerSchema.safeParse({ ...base, fullName: 'A' }).success).toBe(false);
  });

  it('rejects a phone number with letters in it', () => {
    expect(customerSchema.safeParse({ ...base, phone: '080abc45678' }).success).toBe(false);
  });

  it('rejects a phone number shorter than 7 digits', () => {
    expect(customerSchema.safeParse({ ...base, phone: '12345' }).success).toBe(false);
  });

  it('rejects a phone number longer than 15 digits', () => {
    expect(customerSchema.safeParse({ ...base, phone: '1234567890123456' }).success).toBe(false);
  });

  it('rejects a gender outside the enum', () => {
    const result = customerSchema.safeParse({ ...base, gender: 'other' });
    expect(result.success).toBe(false);
  });

  it('treats address and preferredStyles as optional', () => {
    const result = customerSchema.safeParse(base);
    expect(result.success).toBe(true);
  });
});

describe('onboardingSchema', () => {
  it('requires a shop name of at least 2 characters', () => {
    expect(onboardingSchema.safeParse({ shopName: 'B' }).success).toBe(false);
    expect(onboardingSchema.safeParse({ shopName: 'Baan Wears' }).success).toBe(true);
  });

  it('treats the owner name as optional', () => {
    expect(onboardingSchema.safeParse({ shopName: 'Baan Wears' }).success).toBe(true);
  });
});

describe('newOrderBatchSchema', () => {
  const unit = {
    key: 'agbada-1',
    styleName: 'Agbada',
    details: 'Agbada',
    totalBill: '50000',
    depositPaid: '20000',
    dueDate: '',
    assignedTo: '',
    inspirationImages: [],
    materialSuppliedBy: 'shop' as const,
    materialCost: '',
    otherCosts: '',
  };

  it('accepts a batch with at least one valid unit', () => {
    expect(newOrderBatchSchema.safeParse({ units: [unit], priority: 'normal' }).success).toBe(true);
  });

  it('rejects a unit with an empty description', () => {
    const result = newOrderBatchSchema.safeParse({ units: [{ ...unit, details: '' }], priority: 'normal' });
    expect(result.success).toBe(false);
  });

  it('rejects a unit with no total bill entered', () => {
    const result = newOrderBatchSchema.safeParse({ units: [{ ...unit, totalBill: '' }], priority: 'normal' });
    expect(result.success).toBe(false);
  });

  it('rejects a priority outside the enum', () => {
    const result = newOrderBatchSchema.safeParse({ units: [unit], priority: 'whenever' });
    expect(result.success).toBe(false);
  });

  it('accepts an empty units array (schema-level — callers guard the empty-basket case themselves)', () => {
    expect(newOrderBatchSchema.safeParse({ units: [], priority: 'normal' }).success).toBe(true);
  });
});
