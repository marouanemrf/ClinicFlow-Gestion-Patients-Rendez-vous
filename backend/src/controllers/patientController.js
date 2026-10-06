const patientService = require('../services/patientService');
const appointmentService = require('../services/appointmentService');
const { sendSuccess, sendPaginated } = require('../utils/apiResponse');

async function list(req, res) {
  sendPaginated(res, await patientService.listPatients(req.validated.query));
}

async function getById(req, res) {
  sendSuccess(res, await patientService.getPatient(req.validated.params.id));
}

async function listAppointments(req, res) {
  const result = await appointmentService.listPatientAppointments(req.validated.params.id, req.validated.query);
  sendPaginated(res, result);
}

async function create(req, res) {
  sendSuccess(res, await patientService.createPatient(req.validated.body), 201);
}

async function update(req, res) {
  sendSuccess(res, await patientService.updatePatient(req.validated.params.id, req.validated.body));
}

async function remove(req, res) {
  await patientService.deletePatient(req.validated.params.id);
  sendSuccess(res, { id: req.validated.params.id });
}

async function uploadPhoto(req, res) {
  sendSuccess(res, await patientService.updatePhoto(req.validated.params.id, req.file.buffer));
}

async function deletePhoto(req, res) {
  sendSuccess(res, await patientService.deletePhoto(req.validated.params.id));
}

async function getPhoto(req, res) {
  const { filePath, contentType } = await patientService.getPhotoFile(req.validated.params.id);
  // URLs are versioned (?v=...), so the browser may keep the image; "private" keeps it out of shared caches.
  res.set({ 'Content-Type': contentType, 'Cache-Control': 'private, max-age=86400' });
  res.sendFile(filePath);
}

module.exports = { list, getById, listAppointments, create, update, remove, uploadPhoto, deletePhoto, getPhoto };
