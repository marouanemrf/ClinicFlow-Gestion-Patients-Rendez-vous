const patientRepository = require('../db/repositories/patientRepository');
const photoStorage = require('./photoStorage');
const AppError = require('../utils/AppError');
const { buildPagination, toOffset } = require('../utils/pagination');

const patientNotFound = () => AppError.notFound('Patient not found', 'PATIENT_NOT_FOUND');

async function assertCinAvailable(cin, currentPatientId = null) {
  const existing = await patientRepository.findByCin(cin);
  if (!existing || existing.id === currentPatientId) return;

  if (existing.deletedAt) {
    throw AppError.conflict('This CIN belongs to an archived patient', 'CIN_ALREADY_EXISTS');
  }
  throw AppError.conflict('CIN already exists', 'CIN_ALREADY_EXISTS');
}

async function listPatients({ search, page, limit }) {
  const { rows, total } = await patientRepository.findMany({ search, limit, offset: toOffset(page, limit) });
  return { data: rows, pagination: buildPagination(page, limit, total) };
}

async function getPatient(id) {
  const patient = await patientRepository.findActiveById(id);
  if (!patient) throw patientNotFound();
  return patient;
}

async function createPatient(input) {
  await assertCinAvailable(input.cin);
  return patientRepository.create(input);
}

async function updatePatient(id, input) {
  await getPatient(id);
  await assertCinAvailable(input.cin, id);
  const patient = await patientRepository.update(id, input);
  if (!patient) throw patientNotFound();
  return patient;
}

async function deletePatient(id) {
  const deleted = await patientRepository.softDelete(id);
  if (!deleted) throw patientNotFound();
}

async function updatePhoto(id, fileBuffer) {
  const current = await patientRepository.findPhotoFilename(id);
  if (!current) throw patientNotFound();

  const filename = await photoStorage.save(fileBuffer);
  const patient = await patientRepository.updatePhoto(id, filename);
  if (!patient) {
    await photoStorage.remove(filename);
    throw patientNotFound();
  }

  await photoStorage.remove(current.photo);
  return patient;
}

async function deletePhoto(id) {
  const current = await patientRepository.findPhotoFilename(id);
  if (!current) throw patientNotFound();

  const patient = await patientRepository.updatePhoto(id, null);
  await photoStorage.remove(current.photo);
  return patient;
}

async function getPhotoFile(id) {
  const current = await patientRepository.findPhotoFilename(id);
  if (!current) throw patientNotFound();

  const file = current.photo && photoStorage.resolve(current.photo);
  if (!file) throw AppError.notFound('This patient has no photo', 'PHOTO_NOT_FOUND');
  return file;
}

module.exports = {
  listPatients,
  getPatient,
  createPatient,
  updatePatient,
  deletePatient,
  updatePhoto,
  deletePhoto,
  getPhotoFile,
};
