import http, { unwrap } from './http';

export const authApi = {
  login: (credentials) => http.post('/auth/login', credentials).then(unwrap),
  me: () => http.get('/auth/me').then(unwrap),
};
