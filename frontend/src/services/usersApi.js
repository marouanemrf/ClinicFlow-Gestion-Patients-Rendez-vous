import http, { unwrap } from './http';

export const usersApi = {
  list: () => http.get('/users').then(unwrap),
  create: (user) => http.post('/users', user).then(unwrap),
};
