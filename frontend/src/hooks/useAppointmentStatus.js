import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { appointmentsApi } from '../services/appointmentsApi';
import { getErrorMessage } from '../utils/apiError';

/**
 * Returns a handler that updates an appointment status through the API and
 * calls onUpdated(updatedAppointment). Business errors (409) are shown as toasts.
 */
export function useAppointmentStatus(onUpdated) {
  return useCallback(
    async (appointment, status) => {
      try {
        const updated = await appointmentsApi.updateStatus(appointment.id, status);
        toast.success(`Appointment ${status}`);
        onUpdated(updated);
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    },
    [onUpdated],
  );
}
