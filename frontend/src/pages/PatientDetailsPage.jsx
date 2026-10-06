import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Cake, CalendarDays, CalendarPlus, Clock, IdCard, MapPin, Pencil, Phone } from 'lucide-react';
import { useFetch } from '../hooks/useFetch';
import { useAppointmentStatus } from '../hooks/useAppointmentStatus';
import { patientsApi } from '../services/patientsApi';
import Button from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';
import { EmptyState, ErrorState, Spinner } from '../components/ui/States';
import PatientFormModal from '../components/patients/PatientFormModal';
import AppointmentFormModal from '../components/appointments/AppointmentFormModal';
import AppointmentsTable from '../components/appointments/AppointmentsTable';
import PatientAvatar from '../components/patients/PatientAvatar';
import { calculateAge, formatDate, formatDateTime } from '../utils/format';

function InfoItem({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3">
      <div className="rounded-lg bg-slate-100 p-2">
        <Icon className="h-4 w-4 text-slate-500" aria-hidden />
      </div>
      <div className="min-w-0">
        <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
        <dd className="mt-0.5 break-words text-sm text-slate-800">{children}</dd>
      </div>
    </div>
  );
}

export default function PatientDetailsPage() {
  const { id } = useParams();
  const [editOpen, setEditOpen] = useState(false);
  const [appointmentOpen, setAppointmentOpen] = useState(false);

  const patient = useFetch(() => patientsApi.get(id), [id]);
  const appointments = useFetch(() => patientsApi.listAppointments(id), [id]);

  const { setData: setAppointmentsData } = appointments;
  const onStatusUpdated = useCallback(
    (updated) =>
      setAppointmentsData((page) => ({ ...page, data: page.data.map((item) => (item.id === updated.id ? updated : item)) })),
    [setAppointmentsData],
  );
  const changeStatus = useAppointmentStatus(onStatusUpdated);

  if (patient.loading && !patient.data) return <Spinner />;
  if (patient.error) {
    return (
      <Card>
        <ErrorState message={patient.error} />
        <div className="pb-8 text-center">
          <Link to="/patients" className="text-sm font-medium text-teal-700 hover:text-teal-800">
            ← Back to patients
          </Link>
        </div>
      </Card>
    );
  }

  const data = patient.data;

  return (
    <>
      <Link to="/patients" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Patients
      </Link>

      <Card className="mb-6">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <PatientAvatar patient={data} size="xl" className="ring-slate-100" />
            <div>
              <h1 className="text-xl font-semibold text-slate-900">{data.fullName}</h1>
              <p className="text-sm text-slate-500">{calculateAge(data.birthDate)} years old</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" icon={Pencil} onClick={() => setEditOpen(true)}>
              Edit
            </Button>
            <Button icon={CalendarPlus} onClick={() => setAppointmentOpen(true)}>
              New appointment
            </Button>
          </div>
        </div>
        <dl className="grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <InfoItem icon={IdCard} label="CIN">
            <span className="font-mono">{data.cin}</span>
          </InfoItem>
          <InfoItem icon={Phone} label="Phone">
            {data.phone}
          </InfoItem>
          <InfoItem icon={Cake} label="Birth date">
            {formatDate(data.birthDate)}
          </InfoItem>
          <InfoItem icon={MapPin} label="Address">
            {data.address || <span className="text-slate-400">Not provided</span>}
          </InfoItem>
          <InfoItem icon={Clock} label="Created">
            {formatDateTime(data.createdAt)}
          </InfoItem>
        </dl>
      </Card>

      <Card>
        <CardHeader
          title="Appointments"
          description={appointments.data ? `${appointments.data.pagination.total} appointment(s)` : undefined}
        />
        {appointments.loading && !appointments.data ? (
          <Spinner />
        ) : appointments.error ? (
          <ErrorState message={appointments.error} onRetry={appointments.reload} />
        ) : appointments.data.data.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No appointments yet"
            action={
              <Button size="sm" icon={CalendarPlus} onClick={() => setAppointmentOpen(true)}>
                Schedule one
              </Button>
            }
          />
        ) : (
          <AppointmentsTable
            appointments={appointments.data.data}
            showPatient={false}
            showCreatedBy={false}
            onStatusChange={changeStatus}
          />
        )}
      </Card>

      <PatientFormModal
        open={editOpen}
        patient={data}
        onClose={() => setEditOpen(false)}
        onSaved={(saved) => {
          setEditOpen(false);
          patient.setData(saved);
        }}
      />
      <AppointmentFormModal
        open={appointmentOpen}
        defaultPatient={data}
        onClose={() => setAppointmentOpen(false)}
        onCreated={() => {
          setAppointmentOpen(false);
          appointments.reload();
        }}
      />
    </>
  );
}
