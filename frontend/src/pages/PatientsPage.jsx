import { useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Search, Users } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useDebounce } from '../hooks/useDebounce';
import { useFetch } from '../hooks/useFetch';
import { patientsApi } from '../services/patientsApi';
import Button from '../components/ui/Button';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Pagination from '../components/ui/Pagination';
import { Card, PageHeader } from '../components/ui/Card';
import { EmptyState, ErrorState, Spinner } from '../components/ui/States';
import PatientCard from '../components/patients/PatientCard';
import PatientFormModal from '../components/patients/PatientFormModal';
import { getErrorMessage } from '../utils/apiError';

// Multiple of 2, 3 and 4 so that every row of the card grid is full.
const PAGE_SIZE = 12;

export default function PatientsPage() {
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search);
  const [formState, setFormState] = useState({ open: false, patient: null });
  const [patientToDelete, setPatientToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const { data, loading, error, reload } = useFetch(
    () => patientsApi.list({ search: debouncedSearch, page, limit: PAGE_SIZE }),
    [debouncedSearch, page],
  );

  function handleSearchChange(event) {
    setSearch(event.target.value);
    setPage(1);
  }

  function handleSaved() {
    setFormState({ open: false, patient: null });
    reload();
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await patientsApi.remove(patientToDelete.id);
      toast.success(`${patientToDelete.fullName} has been deleted`);
      setPatientToDelete(null);
      // Go back one page if the deleted patient was the last one of the page.
      if (data.data.length === 1 && page > 1) setPage(page - 1);
      else reload();
    } catch (deleteError) {
      toast.error(getErrorMessage(deleteError));
    } finally {
      setDeleting(false);
    }
  }

  const patients = data?.data || [];

  return (
    <>
      <PageHeader
        title="Patients"
        description="Search, register and manage clinic patients."
        action={
          <Button icon={Plus} onClick={() => setFormState({ open: true, patient: null })}>
            Add patient
          </Button>
        }
      />

      <Card>
        <div className="border-b border-slate-100 p-4">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={handleSearchChange}
              placeholder="Search by name or CIN..."
              aria-label="Search patients"
              className="block w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm shadow-sm placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
            />
          </div>
        </div>

        {loading && !data ? (
          <Spinner />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : patients.length === 0 ? (
          <EmptyState
            icon={Users}
            title={debouncedSearch ? 'No patient matches your search' : 'No patients yet'}
            description={debouncedSearch ? 'Try another name or CIN.' : 'Start by registering your first patient.'}
          />
        ) : (
          <div
            className={`grid gap-4 bg-slate-50/60 p-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 ${
              loading ? 'opacity-60 transition-opacity' : ''
            }`}
          >
            {patients.map((patient) => (
              <PatientCard
                key={patient.id}
                patient={patient}
                canDelete={isAdmin}
                onEdit={(selected) => setFormState({ open: true, patient: selected })}
                onDelete={setPatientToDelete}
              />
            ))}
          </div>
        )}
        <Pagination pagination={data?.pagination} onPageChange={setPage} />
      </Card>

      <PatientFormModal
        open={formState.open}
        patient={formState.patient}
        onClose={() => setFormState({ open: false, patient: null })}
        onSaved={handleSaved}
      />

      <ConfirmDialog
        open={Boolean(patientToDelete)}
        title="Delete patient"
        message={`Are you sure you want to delete ${patientToDelete?.fullName}? The patient will be archived and their appointment history kept.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setPatientToDelete(null)}
      />
    </>
  );
}
