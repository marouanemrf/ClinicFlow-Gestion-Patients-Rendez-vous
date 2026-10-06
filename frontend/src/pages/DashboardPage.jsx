import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck, CalendarDays, Hourglass, Users } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useFetch } from '../hooks/useFetch';
import { useAppointmentStatus } from '../hooks/useAppointmentStatus';
import { dashboardApi } from '../services/dashboardApi';
import { appointmentsApi } from '../services/appointmentsApi';
import { Card, CardHeader, PageHeader } from '../components/ui/Card';
import { EmptyState, ErrorState, Spinner } from '../components/ui/States';
import AppointmentsTable from '../components/appointments/AppointmentsTable';
import { formatLongDate, toDateInputValue } from '../utils/format';

const STAT_CARDS = [
  { field: 'totalPatients', label: 'Total Patients', hint: 'Active patient records', icon: Users, color: 'bg-teal-50 text-teal-600' },
  { field: 'todayAppointments', label: "Today's Appointments", hint: 'Excluding cancelled', icon: CalendarDays, color: 'bg-sky-50 text-sky-600' },
  { field: 'pendingAppointments', label: 'Pending', hint: 'Upcoming, awaiting confirmation', icon: Hourglass, color: 'bg-amber-50 text-amber-600' },
  { field: 'confirmedAppointments', label: 'Confirmed', hint: 'Upcoming confirmed', icon: CalendarCheck, color: 'bg-emerald-50 text-emerald-600' },
];

function StatCard({ label, value, hint, icon: Icon, color, loading }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          {loading ? (
            <div className="mt-2 h-8 w-14 animate-pulse rounded bg-slate-100" />
          ) : (
            <p className="mt-1 text-3xl font-semibold tabular-nums text-slate-900">{value ?? '—'}</p>
          )}
        </div>
        <div className={`rounded-lg p-2.5 ${color}`}>
          <Icon className="h-5 w-5" aria-hidden />
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-400">{hint}</p>
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const today = toDateInputValue();
  const stats = useFetch(() => dashboardApi.getStats(), []);
  const todayAppointments = useFetch(() => appointmentsApi.list({ date: today, limit: 50 }), [today]);

  const { setData: setTodayData } = todayAppointments;
  const { reload: reloadStats } = stats;
  const onStatusUpdated = useCallback(
    (updated) => {
      setTodayData((page) => ({ ...page, data: page.data.map((item) => (item.id === updated.id ? updated : item)) }));
      reloadStats();
    },
    [setTodayData, reloadStats],
  );
  const changeStatus = useAppointmentStatus(onStatusUpdated);

  return (
    <>
      <PageHeader title={`Hello, ${user.fullName.split(' ')[0]}`} description={formatLongDate(new Date())} />

      {stats.error ? (
        <Card className="mb-6">
          <ErrorState message={stats.error} onRetry={stats.reload} />
        </Card>
      ) : (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {STAT_CARDS.map((card) => (
            <StatCard key={card.field} {...card} value={stats.data?.[card.field]} loading={stats.loading && !stats.data} />
          ))}
        </div>
      )}

      <Card>
        <CardHeader
          title="Today's appointments"
          description="Change a status directly from the list."
          action={
            <Link to="/appointments" className="text-sm font-medium text-teal-700 hover:text-teal-800">
              View all →
            </Link>
          }
        />
        {todayAppointments.loading && !todayAppointments.data ? (
          <Spinner />
        ) : todayAppointments.error ? (
          <ErrorState message={todayAppointments.error} onRetry={todayAppointments.reload} />
        ) : todayAppointments.data.data.length === 0 ? (
          <EmptyState icon={CalendarDays} title="No appointments today" description="Enjoy the calm, or schedule a new appointment." />
        ) : (
          <AppointmentsTable appointments={todayAppointments.data.data} onStatusChange={changeStatus} />
        )}
      </Card>
    </>
  );
}
