const { z } = require('zod');

const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().pipe(z.email('Invalid email address')),
    password: z.string().min(1, 'Password is required').max(72, 'Password is too long'),
  })
  .strict();

module.exports = { loginSchema };
