import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Button from '../ui/Button';
import FormField from '../ui/FormField';
import Modal from '../ui/Modal';
import { Alert } from '../ui/States';
import PatientPicker from './PatientPicker';
import { appointmentsApi } from '../../services/appointmentsApi';
import { getErrorMessage, getFieldErrors } from '../../utils/apiError';
import { toDateInputValue } from '../../utils/format';
import { appointmentSchema, validateForm } from '../../utils/validation';

const emptyForm = () => ({ date: toDateInputValue(), time: '', reason: '', notes: '', status: 'pending' });

export default function AppointmentFormModal({ open, defaultPatient = null, onClose, onCreated }) {
  const [patient, setPatient] = useState(defaultPatient);
  const [values, setValues] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPatient(defaultPatient);
    setValues(emptyForm());
    setErrors({});
    setFormError('');
  }, [open, defaultPatient]);

  const update = (field) => (event) => {
    setValues((previous) => ({ ...previous, [field]: event.target.value }));
    setErrors((previous) => ({ ...previous, [field]: undefined }));
  };

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');

    const { data, errors: validationErrors } = validateForm(appointmentSchema, { ...values, patientId: patient?.id || '' });
    if (!data) {
      setErrors(validationErrors);
      return;
    }

    setSaving(true);
    try {
      const created = await appointmentsApi.create({
        patientId: data.patientId,
        // Browser-local date and time, sent with an explicit UTC offset.
        appointmentDate: new Date(`${data.date}T${data.time}`).toISOString(),
        reason: data.reason,
        notes: data.notes || null,
        status: data.status,
      });
      toast.success('Appointment created');
      onCreated(created);
    } catch (error) {
      const fieldErrors = getFieldErrors(error);
      setErrors(fieldErrors);
      // Business errors (e.g. 30-minute conflict) are shown prominently in the form.
      if (!Object.keys(fieldErrors).length) setFormError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create appointment"
      description="Schedule a new appointment for a patient."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="appointment-form" loading={saving}>
            Create appointment
          </Button>
        </>
      }
    >
      <form id="appointment-form" onSubmit={handleSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
        {formError && (
          <div className="sm:col-span-2">
            <Alert>{formError}</Alert>
          </div>
        )}
        <div className="sm:col-span-2">
          <PatientPicker
            value={patient}
            onChange={(selected) => {
              setPatient(selected);
              setErrors((previous) => ({ ...previous, patientId: undefined }));
            }}
            error={errors.patientId}
          />
        </div>
        <FormField
          label="Date"
          required
          type="date"
          min={toDateInputValue()}
          value={values.date}
          onChange={update('date')}
          error={errors.date}
        />
        <FormField label="Time" required type="time" step={300} value={values.time} onChange={update('time')} error={errors.time} />
        <FormField
          label="Reason"
          required
          className="sm:col-span-2"
          value={values.reason}
          onChange={update('reason')}
          error={errors.reason}
          placeholder="e.g. General consultation"
        />
        <FormField
          label="Notes"
          as="textarea"
          rows={3}
          className="sm:col-span-2"
          value={values.notes}
          onChange={update('notes')}
          error={errors.notes}
          placeholder="Optional"
        />
        <FormField
          label="Initial status"
          as="select"
          value={values.status}
          onChange={update('status')}
          hint="Confirmed appointments must be at least 30 minutes apart for a patient."
          className="sm:col-span-2"
        >
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
        </FormField>
      </form>
    </Modal>
  );
}
