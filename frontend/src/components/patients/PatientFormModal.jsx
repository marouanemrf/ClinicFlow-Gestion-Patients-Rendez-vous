import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Button from '../ui/Button';
import FormField from '../ui/FormField';
import Modal from '../ui/Modal';
import { Alert } from '../ui/States';
import PhotoField from './PhotoField';
import { usePatientPhoto } from '../../hooks/usePatientPhoto';
import { patientsApi } from '../../services/patientsApi';
import { getErrorCode, getErrorMessage, getFieldErrors } from '../../utils/apiError';
import { toDateInputValue } from '../../utils/format';
import { patientSchema, validateForm } from '../../utils/validation';
import { resizePhoto, validatePhotoFile } from '../../utils/image';

const EMPTY_FORM = { fullName: '', cin: '', phone: '', birthDate: '', address: '' };
// file: newly selected (resized) photo; removed: the existing photo must be deleted on save.
const NO_PHOTO_CHANGE = { file: null, previewUrl: null, removed: false };

function toFormValues(patient) {
  if (!patient) return EMPTY_FORM;
  return {
    fullName: patient.fullName,
    cin: patient.cin,
    phone: patient.phone,
    birthDate: patient.birthDate,
    address: patient.address || '',
  };
}

export default function PatientFormModal({ open, patient, onClose, onSaved }) {
  const isEdit = Boolean(patient);
  const [values, setValues] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [photo, setPhoto] = useState(NO_PHOTO_CHANGE);
  const [photoError, setPhotoError] = useState('');
  const [processingPhoto, setProcessingPhoto] = useState(false);
  const existingPhotoUrl = usePatientPhoto(open ? patient : null);

  useEffect(() => {
    if (!open) return;
    setValues(toFormValues(patient));
    setErrors({});
    setFormError('');
    setPhoto(NO_PHOTO_CHANGE);
    setPhotoError('');
  }, [open, patient]);

  // Free the preview of a selected file once it is replaced or the form is closed.
  useEffect(() => {
    const { previewUrl } = photo;
    return () => previewUrl && URL.revokeObjectURL(previewUrl);
  }, [photo]);

  async function handlePhotoSelect(file) {
    const invalidReason = validatePhotoFile(file);
    if (invalidReason) {
      setPhotoError(invalidReason);
      return;
    }
    setPhotoError('');
    setProcessingPhoto(true);
    try {
      const resized = await resizePhoto(file);
      setPhoto({ file: resized, previewUrl: URL.createObjectURL(resized), removed: false });
    } catch {
      setPhotoError('This image could not be read. Try another file.');
    } finally {
      setProcessingPhoto(false);
    }
  }

  /** Uploads or deletes the photo after the patient itself has been saved. */
  async function savePhoto(savedPatient) {
    if (photo.file) return patientsApi.uploadPhoto(savedPatient.id, photo.file);
    if (photo.removed && savedPatient.hasPhoto) return patientsApi.removePhoto(savedPatient.id);
    return savedPatient;
  }

  const photoPreviewUrl = photo.file ? photo.previewUrl : photo.removed ? null : existingPhotoUrl;

  const update = (field) => (event) => {
    setValues((previous) => ({ ...previous, [field]: event.target.value }));
    setErrors((previous) => ({ ...previous, [field]: undefined }));
  };

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');

    const { data, errors: validationErrors } = validateForm(patientSchema, values);
    if (!data) {
      setErrors(validationErrors);
      return;
    }

    setSaving(true);
    try {
      const saved = isEdit ? await patientsApi.update(patient.id, data) : await patientsApi.create(data);
      let result = saved;
      try {
        result = await savePhoto(saved);
        toast.success(isEdit ? 'Patient updated' : 'Patient created');
      } catch (photoSaveError) {
        toast.error(`Patient saved, but the photo could not be updated: ${getErrorMessage(photoSaveError)}`);
      }
      onSaved(result);
    } catch (error) {
      const fieldErrors = getFieldErrors(error);
      if (getErrorCode(error) === 'CIN_ALREADY_EXISTS') fieldErrors.cin = getErrorMessage(error);
      setErrors(fieldErrors);
      if (!Object.keys(fieldErrors).length) setFormError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit patient' : 'Add patient'}
      description={isEdit ? 'Update the patient information.' : 'Register a new patient in the clinic.'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="patient-form" loading={saving} disabled={processingPhoto}>
            {isEdit ? 'Save changes' : 'Create patient'}
          </Button>
        </>
      }
    >
      <form id="patient-form" onSubmit={handleSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
        {formError && (
          <div className="sm:col-span-2">
            <Alert>{formError}</Alert>
          </div>
        )}
        <div className="sm:col-span-2">
          <PhotoField
            previewUrl={photoPreviewUrl}
            name={values.fullName}
            processing={processingPhoto}
            error={photoError}
            onSelect={handlePhotoSelect}
            onRemove={() => {
              setPhoto({ ...NO_PHOTO_CHANGE, removed: true });
              setPhotoError('');
            }}
          />
        </div>
        <FormField
          label="Full name"
          required
          className="sm:col-span-2"
          value={values.fullName}
          onChange={update('fullName')}
          error={errors.fullName}
          autoFocus
        />
        <FormField
          label="CIN"
          required
          value={values.cin}
          onChange={update('cin')}
          error={errors.cin}
          placeholder="AB123456"
          className="[&_input]:uppercase"
        />
        <FormField
          label="Phone"
          required
          type="tel"
          value={values.phone}
          onChange={update('phone')}
          error={errors.phone}
          placeholder="+212 6XX XXX XXX"
        />
        <FormField
          label="Birth date"
          required
          type="date"
          max={toDateInputValue()}
          value={values.birthDate}
          onChange={update('birthDate')}
          error={errors.birthDate}
        />
        <FormField
          label="Address"
          as="textarea"
          rows={2}
          className="sm:col-span-2"
          value={values.address}
          onChange={update('address')}
          error={errors.address}
          placeholder="Optional"
        />
      </form>
    </Modal>
  );
}
