const patientRepository = require('../db/repositories/patientRepository');
const appointmentRepository = require('../db/repositories/appointmentRepository');

async function getStats() {
  const [totalPatients, appointmentCounts] = await Promise.all([
    patientRepository.countActive(),
    appointmentRepository.getDashboardCounts(),
  ]);
  return { totalPatients, ...appointmentCounts };
}

module.exports = { getStats };
