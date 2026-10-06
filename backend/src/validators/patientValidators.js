const { z } = require('zod');
const { pageQuery, optionalText } = require('./common');

const today = () => new Date().toISOString().slice(0, 10);

const patientSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Full name must contain at least 2 characters').max(150),
    cin: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{1,2}\d{3,8}$/, 'Invalid CIN format (expected 1-2 letters followed by digits, e.g. AB123456)'),
    phone: z
      .string()
      .trim()
      .regex(/^\+?\d[\d\s-]{7,18}\d$/, 'Invalid phone number'),
    birthDate: z
      .iso.date('Birth date must be a valid date (YYYY-MM-DD)')
      .refine((value) => value >= '1900-01-01', 'Birth date is too far in the past')
      .refine((value) => value <= today(), 'Birth date cannot be in the future'),
    address: optionalText(500),
  })
  .strict();

const patientListQuery = z
  .object({
    search: z.string().trim().max(100).default(''),
    ...pageQuery,
  })
  .strict();

module.exports = { patientSchema, patientListQuery };
