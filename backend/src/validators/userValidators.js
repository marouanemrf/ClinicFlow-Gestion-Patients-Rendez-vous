const { z } = require('zod');

const createUserSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Full name must contain at least 2 characters').max(150),
    email: z.string().trim().toLowerCase().pipe(z.email('Invalid email address')),
    password: z
      .string()
      .min(8, 'Password must contain at least 8 characters')
      .max(72, 'Password is too long')
      .regex(/[A-Z]/, 'Password must contain an uppercase letter')
      .regex(/[a-z]/, 'Password must contain a lowercase letter')
      .regex(/\d/, 'Password must contain a digit'),
    role: z.enum(['admin', 'staff'], { message: 'Role must be admin or staff' }).default('staff'),
  })
  .strict();

module.exports = { createUserSchema };
