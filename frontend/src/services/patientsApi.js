import http, { unwrap, unwrapPage } from './http';

export const patientsApi = {
  list: ({ search = '', page = 1, limit = 10 } = {}) =>
    http.get('/patients', { params: { search, page, limit } }).then(unwrapPage),
  get: (id) => http.get(`/patients/${id}`).then(unwrap),
  listAppointments: (id, { page = 1, limit = 50 } = {}) =>
    http.get(`/patients/${id}/appointments`, { params: { page, limit } }).then(unwrapPage),
  create: (patient) => http.post('/patients', patient).then(unwrap),
  update: (id, patient) => http.put(`/patients/${id}`, patient).then(unwrap),
  remove: (id) => http.delete(`/patients/${id}`).then(unwrap),
  // The photo endpoint requires the JWT, so the image is downloaded as a blob instead of an <img src> URL.
  getPhoto: (id) => http.get(`/patients/${id}/photo`, { responseType: 'blob' }).then((response) => response.data),
  uploadPhoto: (id, file) => {
    const formData = new FormData();
    formData.append('photo', file);
    return http.put(`/patients/${id}/photo`, formData).then(unwrap);
  },
  removePhoto: (id) => http.delete(`/patients/${id}/photo`).then(unwrap),
};
