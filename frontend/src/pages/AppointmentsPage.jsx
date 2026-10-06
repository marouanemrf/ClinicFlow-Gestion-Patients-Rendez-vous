import { useCallback, useState } from 'react';
import { CalendarDays, Plus } from 'lucide-react';
import { useFetch } from '../hooks/useFetch';
import { useAppointmentStatus } from '../hooks/useAppointmentStatus';
import { appointmentsApi } from '../services/appointmentsApi';
import Button from '../components/ui/Button';
import Pagination from '../components/ui/Pagination';
import { Card, PageHeader } from '../components/ui/Card';
import { EmptyState, ErrorState, Spinner } from '../components/ui/States';
import { STATUS_STYLES } from '../components/ui/StatusBadge';
import AppointmentsTable from '../components/appointments/AppointmentsTable';
import AppointmentFormModal from '../components/appointments/AppointmentFormModal';
import { toDateInputValue } from '../utils/format';

const PAGE_SIZE = 10;
const FILTER_CLASSES =
  'block rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100';

export default function AppointmentsPage() {
  const [filters, setFilters] = useState({ date: toDateInputValue(), status: '' });
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);

  const { data, loading, error, reload, setData } = useFetch(
    () => appointmentsApi.list({ ...filters, page, limit: PAGE_SIZE }),
    [filters, page],
  );

  const onStatusUpdated = useCallback(
    (updated) => setData((current) => ({ ...current, data: current.data.map((item) => (item.id === updated.id ? updated : item)) })),
    [setData],
  );
  const changeStatus = useAppointmentStatus(onStatusUpdated);

  const updateFilter = (field) => (event) => {
    setFilters((previous) => ({ ...previous, [field]: event.target.value }));
    setPage(1);
  };

  function resetFilters(date) {
    setFilters({ date, status: '' });
    setPage(1);
  }

  const hasFilters = Boolean(filters.date || filters.status);
  const appointments = data?.data || [];

  return (
    <>
      <PageHeader
        title="Appointments"
        description="Schedule appointments and follow their status."
        action={
          <Button icon={Plus} onClick={() => setCreateOpen(true)}>
            Create appointment
          </Button>
        }
      />

      <Card>
        <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 p-4">
          <div>
            <label htmlFor="filter-date" className="mb-1 block text-xs font-medium text-slate-500">
              Date
            </label>
            <input id="filter-date" type="date" value={filters.date} onChange={updateFilter('date')} className={FILTER_CLASSES} />
          </div>
          <div>
            <label htmlFor="filter-status" className="mb-1 block text-xs font-medium text-slate-500">
              Status
            </label>
            <select id="filter-status" value={filters.status} onChange={updateFilter('status')} className={FILTER_CLASSES}>
              <option value="">All statuses</option>
              {Object.entries(STATUS_STYLES).map(([value, { label }]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" className="h-[38px]" onClick={() => resetFilters(toDateInputValue())}>
              Today
            </Button>
            {hasFilters && (
              <Button variant="ghost" size="sm" className="h-[38px]" onClick={() => resetFilters('')}>
                Show all
              </Button>
            )}
          </div>
        </div>

        {loading && !data ? (
          <Spinner />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : appointments.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No appointments found"
            description={hasFilters ? 'Try changing the date or status filter.' : 'Create the first appointment.'}
          />
        ) : (
          <div className={loading ? 'opacity-60 transition-opacity' : ''}>
            <AppointmentsTable appointments={appointments} onStatusChange={changeStatus} />
          </div>
        )}
        <Pagination pagination={data?.pagination} onPageChange={setPage} />
      </Card>

      <AppointmentFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false);
          reload();
        }}
      />
    </>
  );
}
