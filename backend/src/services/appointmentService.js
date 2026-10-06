const { withTransaction } = require('../config/database');
const appointmentRepository = require('../db/repositories/appointmentRepository');
const patientRepository = require('../db/repositories/patientRepository');
const patientService = require('./patientService');
const AppError = require('../utils/AppError');
const { buildPagination, toOffset } = require('../utils/pagination');

const CONFIRMED_CONFLICT_MESSAGE = 'Patient already has a confirmed appointment within 30 minutes.';

async function lockActivePatient(client, patientId) {
  const patient = await patientRepository.lockById(client, patientId);
  if (!patient) throw AppError.notFound('Patient not found', 'PATIENT_NOT_FOUND');
  if (patient.deletedAt) throw AppError.conflict('This patient has been archived', 'PATIENT_ARCHIVED');
  return patient;
}

/**
 * Business rule: a patient cannot have two CONFIRMED appointments less than
 * 30 minutes apart. Must be called while holding the patient row lock.
 */
async function assertNoConfirmedConflict(client, { patientId, appointmentDate, excludeId }) {
  const hasConflict = await appointmentRepository.hasConfirmedConflict(client, {
    patientId,
    appointmentDate,
    excludeId,
  });
  if (hasConflict) throw AppError.conflict(CONFIRMED_CONFLICT_MESSAGE, 'APPOINTMENT_CONFLICT');
}

async function listAppointments({ page, limit, ...filters }) {
  const { rows, total } = await appointmentRepository.findMany(filters, { limit, offset: toOffset(page, limit) });
  return { data: rows, pagination: buildPagination(page, limit, total) };
}

async function listPatientAppointments(patientId, { page, limit }) {
  await patientService.getPatient(patientId);
  return listAppointments({ patientId, page, limit });
}

async function createAppointment(input, createdBy) {
  return withTransaction(async (client) => {
    await lockActivePatient(client, input.patientId);

    const { appointmentDate, isPast } = await appointmentRepository.resolveDate(client, input.appointmentDate);
    if (isPast) {
      throw AppError.badRequest('Appointment date must be in the future', 'APPOINTMENT_IN_PAST');
    }

    if (input.status === 'confirmed') {
      await assertNoConfirmedConflict(client, { patientId: input.patientId, appointmentDate });
    }

    const id = await appointmentRepository.create(client, { ...input, appointmentDate, createdBy });
    return appointmentRepository.findById(id, client);
  });
}

async function updateAppointmentStatus(id, status) {
  return withTransaction(async (client) => {
    const appointment = await appointmentRepository.findByIdForUpdate(client, id);
    if (!appointment) throw AppError.notFound('Appointment not found', 'APPOINTMENT_NOT_FOUND');

    if (appointment.status !== status) {
      // Cancelling is always allowed, even for an archived patient.
      if (status !== 'cancelled') await lockActivePatient(client, appointment.patientId);

      if (status === 'confirmed') {
        await assertNoConfirmedConflict(client, {
          patientId: appointment.patientId,
          appointmentDate: appointment.appointmentDate,
          excludeId: appointment.id,
        });
      }

      await appointmentRepository.updateStatus(client, id, status);
    }

    return appointmentRepository.findById(id, client);
  });
}

module.exports = {
  listAppointments,
  listPatientAppointments,
  createAppointment,
  updateAppointmentStatus,
};
