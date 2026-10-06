import http, { unwrap, unwrapPage } from './http';

const withoutEmptyValues = (params) =>
  Object.fromEntries(Object.entries(params).filter(([, value]) => value !== '' && value != null));

export const appointmentsApi = {
  list: ({ date, status, page = 1, limit = 10 } = {}) =>
    http.get('/appointments', { params: withoutEmptyValues({ date, status, page, limit }) }).then(unwrapPage),
  create: (appointment) => http.post('/appointments', appointment).then(unwrap),
  updateStatus: (id, status) => http.patch(`/appointments/${id}/status`, { status }).then(unwrap),
};
