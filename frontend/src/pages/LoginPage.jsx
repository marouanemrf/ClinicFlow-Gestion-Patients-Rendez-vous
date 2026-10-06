import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { CalendarCheck, Lock, Mail, ShieldCheck, Users } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import Logo from '../components/Logo';
import Button from '../components/ui/Button';
import FormField from '../components/ui/FormField';
import { Alert } from '../components/ui/States';
import { getErrorMessage } from '../utils/apiError';
import { loginSchema, validateForm } from '../utils/validation';

const FEATURES = [
  { icon: Users, text: 'Patient records with fast search by name or CIN' },
  { icon: CalendarCheck, text: 'Appointment scheduling with conflict detection' },
  { icon: ShieldCheck, text: 'Role-based access for admins and staff' },
];

export default function LoginPage() {
  const { status, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (status === 'authenticated') return <Navigate to="/dashboard" replace />;

  const update = (field) => (event) => {
    setValues((previous) => ({ ...previous, [field]: event.target.value }));
    setErrors((previous) => ({ ...previous, [field]: undefined }));
  };

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');

    const { data, errors: validationErrors } = validateForm(loginSchema, values);
    if (!data) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    try {
      await login(data);
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
    } catch (error) {
      setFormError(getErrorMessage(error));
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-slate-900 p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-teal-600/20 blur-3xl" aria-hidden />
        <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-sky-600/10 blur-3xl" aria-hidden />
        <Logo light />
        <div className="relative">
          <h1 className="text-3xl font-semibold leading-tight text-white">
            Manage your clinic&apos;s patients and appointments in one place.
          </h1>
          <ul className="mt-8 space-y-4">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-slate-300">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 ring-1 ring-white/10">
                  <Icon className="h-5 w-5 text-teal-300" aria-hidden />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-slate-500">© {new Date().getFullYear()} ClinicFlow</p>
      </section>

      <section className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Welcome back</h2>
          <p className="mt-1 text-sm text-slate-500">Sign in to your ClinicFlow account.</p>

          <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-4">
            {formError && <Alert>{formError}</Alert>}
            <div className="relative">
              <FormField
                label="Email"
                type="email"
                autoComplete="email"
                placeholder="you@clinicflow.com"
                value={values.email}
                onChange={update('email')}
                error={errors.email}
                className="[&_input]:pl-9"
                autoFocus
              />
              <Mail className="pointer-events-none absolute left-3 top-[2.35rem] h-4 w-4 text-slate-400" aria-hidden />
            </div>
            <div className="relative">
              <FormField
                label="Password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={values.password}
                onChange={update('password')}
                error={errors.password}
                className="[&_input]:pl-9"
              />
              <Lock className="pointer-events-none absolute left-3 top-[2.35rem] h-4 w-4 text-slate-400" aria-hidden />
            </div>
            <Button type="submit" loading={submitting} className="w-full">
              Login
            </Button>
          </form>

          <div className="mt-8 rounded-lg border border-dashed border-slate-300 bg-white p-3 text-xs text-slate-500">
            <p className="font-medium text-slate-700">Demo accounts</p>
            <p className="mt-1">admin@clinicflow.com / Admin123!</p>
            <p>staff1@clinicflow.com / Staff123!</p>
          </div>
        </div>
      </section>
    </div>
  );
}
