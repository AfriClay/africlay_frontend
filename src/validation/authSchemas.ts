import { z } from 'zod';

export const loginSchema = z.object({
  identifier: z.string().min(1, 'Enter your email or phone'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  name: z.string().min(1, 'Enter your name'),
  identifier: z.string().min(1, 'Enter your email or phone'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Confirm your password'),
  acceptTerms: z.boolean().refine(v => v === true, {
    message: 'You must agree to Terms',
  }),
}).refine(data => data.password === data.confirmPassword, {
  path: ['confirmPassword'],
  message: 'Passwords do not match',
});

export const passwordResetSchema = z.object({
  identifier: z.string().min(1, 'Enter your email or phone'),
});
