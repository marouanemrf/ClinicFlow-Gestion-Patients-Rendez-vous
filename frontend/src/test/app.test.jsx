import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from './renderWithProviders';
import { authApi } from '../services/authApi';
import { patientsApi } from '../services/patientsApi';
import { dashboardApi } from '../services/dashboardApi';
import { appointmentsApi } from '../services/appointmentsApi';

vi.mock('../services/authApi', () => ({ authApi: { login: vi.fn(), me: vi.fn() } }));
vi.mock('../services/patientsApi', () => ({ patientsApi: { list: vi.fn() } }));
vi.mock('../services/dashboardApi', () => ({ dashboardApi: { getStats: vi.fn() } }));
vi.mock('../services/appointmentsApi', () => ({ appointmentsApi: { list: vi.fn() } }));

const ADMIN = { id: '1', fullName: 'Admin ClinicFlow', email: 'admin@clinicflow.com', role: 'admin' };
const STAFF = { id: '2', fullName: 'Sara Bennis', email: 'staff1@clinicflow.com', role: 'staff' };
const PATIENTS_PAGE = {
  data: [{ id: 'p1', fullName: 'Amine El Idrissi', cin: 'AB123456', phone: '+212 661 234 567', birthDate: '1988-04-12' }],
  pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
};

function signInAs(user) {
  sessionStorage.setItem('clinicflow.token', 'token');
  authApi.me.mockResolvedValue(user);
}

beforeEach(() => {
  vi.clearAllMocks();
  dashboardApi.getStats.mockResolvedValue({ totalPatients: 5, todayAppointments: 4, pendingAppointments: 3, confirmedAppointments: 4 });
  appointmentsApi.list.mockResolvedValue({ data: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 } });
  patientsApi.list.mockResolvedValue(PATIENTS_PAGE);
});

describe('authentication', () => {
  it('redirects anonymous users to the login page', async () => {
    renderApp('/patients');
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
  });

  it('validates the form before calling the API', async () => {
    renderApp('/login');
    await userEvent.click(screen.getByRole('button', { name: 'Login' }));

    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(authApi.login).not.toHaveBeenCalled();
  });

  it('shows the backend error message on failed login', async () => {
    authApi.login.mockRejectedValue({ response: { status: 401, data: { message: 'Invalid email or password' } } });
    renderApp('/login');

    await userEvent.type(screen.getByLabelText('Email'), 'admin@clinicflow.com');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: 'Login' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
  });

  it('redirects to the dashboard after login and shows the stat cards', async () => {
    authApi.login.mockResolvedValue({ token: 'jwt', user: ADMIN });
    renderApp('/login');

    await userEvent.type(screen.getByLabelText('Email'), 'admin@clinicflow.com');
    await userEvent.type(screen.getByLabelText('Password'), 'Admin123!');
    await userEvent.click(screen.getByRole('button', { name: 'Login' }));

    expect(await screen.findByText('Total Patients')).toBeInTheDocument();
    expect(screen.getByText("Today's Appointments")).toBeInTheDocument();
    expect(sessionStorage.getItem('clinicflow.token')).toBe('jwt');
  });
});

describe('patients page permissions', () => {
  it('shows the delete action to admins', async () => {
    signInAs(ADMIN);
    renderApp('/patients');

    expect(await screen.findByText('Amine El Idrissi')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete Amine El Idrissi' })).toBeInTheDocument();
  });

  it('hides the delete action from staff members', async () => {
    signInAs(STAFF);
    renderApp('/patients');

    expect(await screen.findByText('Amine El Idrissi')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit Amine El Idrissi' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete Amine El Idrissi' })).not.toBeInTheDocument();
  });

  it('keeps staff away from the admin-only users page', async () => {
    signInAs(STAFF);
    renderApp('/users');

    await waitFor(() => expect(screen.getByText('Total Patients')).toBeInTheDocument());
  });
});
