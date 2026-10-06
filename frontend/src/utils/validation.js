import { z } from 'zod';
import { toDateInputValue } from './format';

// Mirrors the backend rules so users get instant feedback; the API stays the source of truth.

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').pipe(z.email('Invalid email address')),
  password: z.string().min(1, 'Password is required'),
});

export const patientSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must contain at least 2 characters').max(150),
  cin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{1,2}\d{3,8}$/, 'Invalid CIN format (e.g. AB123456)'),
  phone: z
    .string()
    .trim()
    .regex(/^\+?\d[\d\s-]{7,18}\d$/, 'Invalid phone number'),
  birthDate: z
    .string()
    .min(1, 'Birth date is required')
    .refine((value) => value <= toDateInputValue(), 'Birth date cannot be in the future'),
  address: z.string().trim().max(500).optional(),
});

export const appointmentSchema = z
  .object({
    patientId: z.string().min(1, 'Please select a patient'),
    date: z.string().min(1, 'Date is required'),
    time: z.string().min(1, 'Time is required'),
    reason: z.string().trim().min(2, 'Reason must contain at least 2 characters').max(255),
    notes: z.string().trim().max(2000).optional(),
    status: z.enum(['pending', 'confirmed']),
  })
  .refine((values) => new Date(`${values.date}T${values.time}`) > new Date(), {
    message: 'Appointment must be in the future',
    path: ['time'],
  });

export const userSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must contain at least 2 characters').max(150),
  email: z.string().trim().pipe(z.email('Invalid email address')),
  password: z
    .string()
    .min(8, 'Password must contain at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/\d/, 'Password must contain a digit'),
  role: z.enum(['admin', 'staff']),
});

/** Runs a Zod schema and returns { data } or { errors: { field: message } }. */
export function validateForm(schema, values) {
  const result = schema.safeParse(values);
  if (result.success) return { data: result.data, errors: {} };

  const errors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return { data: null, errors };
}
