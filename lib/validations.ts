import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPw: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPw, {
  message: "Passwords don't match",
  path: ['confirmPw'],
});

export type SignupInput = z.infer<typeof signupSchema>;

export const resetPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const updatePasswordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPw: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPw, {
  message: "Passwords don't match",
  path: ['confirmPw'],
});

export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;

export const customerSchema = z.object({
  fullName: z.string().min(2, 'Client name must be at least 2 characters'),
  phone: z.string().regex(/^(\+234|0)[789][01]\d{8}$/, 'Enter a valid Nigerian phone number (e.g. 08012345678)'),
  address: z.string().optional(),
  gender: z.enum(['male', 'female']),
  preferredStyles: z.array(z.string()).optional(),
});

export type CustomerInput = z.infer<typeof customerSchema>;

export const onboardingSchema = z.object({
  name: z.string().optional(),
  shopName: z.string().min(2, 'Shop name must be at least 2 characters'),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;

export const orderUnitSchema = z.object({
  key: z.string(),
  styleName: z.string(),
  details: z.string().min(1, 'Description is required'),
  totalBill: z.string().min(1, 'Total bill is required'),
  depositPaid: z.string(),
  dueDate: z.string(),
  assignedTo: z.string(),
  inspirationImages: z.array(z.string()),
  materialSuppliedBy: z.enum(['shop', 'customer']),
  materialCost: z.string(),
  otherCosts: z.string(),
});

export const newOrderBatchSchema = z.object({
  units: z.array(orderUnitSchema),
  priority: z.enum(['normal', 'urgent', 'rush']),
});

export type NewOrderBatchInput = z.infer<typeof newOrderBatchSchema>;
