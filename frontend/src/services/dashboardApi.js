import http, { unwrap } from './http';

export const dashboardApi = {
  getStats: () => http.get('/dashboard/stats').then(unwrap),
};
