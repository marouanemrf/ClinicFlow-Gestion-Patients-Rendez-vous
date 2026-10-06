import { useEffect, useState } from 'react';
import { patientsApi } from '../services/patientsApi';

// Object URLs keyed by patient id + photo version: each photo is downloaded once per session,
// and a new upload (new photoUpdatedAt) naturally invalidates the cached one.
const photoUrls = new Map();

function loadPhotoUrl(patientId, cacheKey) {
  if (!photoUrls.has(cacheKey)) {
    const request = patientsApi.getPhoto(patientId).then((blob) => URL.createObjectURL(blob));
    request.catch(() => photoUrls.delete(cacheKey));
    photoUrls.set(cacheKey, request);
  }
  return photoUrls.get(cacheKey);
}

/** Returns a displayable URL for the patient's photo, or null (no photo, loading or error). */
export function usePatientPhoto(patient) {
  const cacheKey = patient?.hasPhoto ? `${patient.id}:${patient.photoUpdatedAt}` : null;
  const [photo, setPhoto] = useState({ key: null, url: null });

  useEffect(() => {
    if (!cacheKey) return undefined;
    let active = true;
    loadPhotoUrl(patient.id, cacheKey)
      .then((url) => active && setPhoto({ key: cacheKey, url }))
      .catch(() => active && setPhoto({ key: cacheKey, url: null }));
    return () => {
      active = false;
    };
  }, [cacheKey, patient?.id]);

  // Ignore a URL that belongs to a previous patient or photo version.
  return cacheKey && photo.key === cacheKey ? photo.url : null;
}
