const appointmentService = require('../services/appointmentService');
const { sendSuccess, sendPaginated } = require('../utils/apiResponse');

async function list(req, res) {
  sendPaginated(res, await appointmentService.listAppointments(req.validated.query));
}

async function create(req, res) {
  // The author always comes from the verified JWT, never from the request body.
  const appointment = await appointmentService.createAppointment(req.validated.body, req.user.id);
  sendSuccess(res, appointment, 201);
}

async function updateStatus(req, res) {
  const appointment = await appointmentService.updateAppointmentStatus(
    req.validated.params.id,
    req.validated.body.status,
  );
  sendSuccess(res, appointment);
}

module.exports = { list, create, updateStatus };
