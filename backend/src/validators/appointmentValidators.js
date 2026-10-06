const { z } = require('zod');
const { pageQuery, optionalText, optionalFilter } = require('./common');

const STATUSES = ['pending', 'confirmed', 'cancelled'];
const statusEnum = z.enum(STATUSES, { message: 'Status must be pending, confirmed or cancelled' });

const createAppointmentSchema = z
  .object({
    patientId: z.uuid('Invalid patient id'),
    // Without an offset the date-time is interpreted in the clinic time zone.
    appointmentDate: z.iso.datetime({
      local: true,
      offset: true,
      message: 'Appointment date must be a valid ISO date-time (e.g. 2026-10-10T10:00)',
    }),
    reason: z.string().trim().min(2, 'Reason must contain at least 2 characters').max(255),
    notes: optionalText(2000),
    status: z.enum(['pending', 'confirmed'], { message: 'Initial status must be pending or confirmed' }).default('pending'),
  })
  .strict();

const updateStatusSchema = z.object({ status: statusEnum }).strict();

const appointmentListQuery = z
  .object({
    date: optionalFilter(z.iso.date('Date must use the YYYY-MM-DD format')),
    status: optionalFilter(statusEnum),
    patientId: optionalFilter(z.uuid('Invalid patient id')),
    ...pageQuery,
  })
  .strict();

module.exports = { STATUSES, createAppointmentSchema, updateStatusSchema, appointmentListQuery };
