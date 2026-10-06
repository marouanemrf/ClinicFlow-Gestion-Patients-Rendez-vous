import { useEffect, useState } from 'react';
import { LoaderCircle, Search, X } from 'lucide-react';
import { patientsApi } from '../../services/patientsApi';
import { useDebounce } from '../../hooks/useDebounce';

/** Searchable patient selector (by name or CIN) backed by GET /api/patients. */
export default function PatientPicker({ value, onChange, error }) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debouncedSearch = useDebounce(search, 250);

  useEffect(() => {
    if (value || !open) return undefined;
    let cancelled = false;
    setLoading(true);
    patientsApi
      .list({ search: debouncedSearch, limit: 6 })
      .then(({ data }) => !cancelled && setResults(data))
      .catch(() => !cancelled && setResults([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, open, value]);

  if (value) {
    return (
      <div>
        <span className="mb-1.5 block text-sm font-medium text-slate-700">
          Patient<span className="ml-0.5 text-rose-500">*</span>
        </span>
        <div className="flex items-center justify-between rounded-lg border border-teal-200 bg-teal-50/60 px-3 py-2">
          <div>
            <p className="text-sm font-medium text-slate-900">{value.fullName}</p>
            <p className="text-xs text-slate-500">CIN {value.cin}</p>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="rounded p-1 text-slate-400 hover:bg-white hover:text-slate-600"
            aria-label="Change patient"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <label htmlFor="patient-search" className="mb-1.5 block text-sm font-medium text-slate-700">
        Patient<span className="ml-0.5 text-rose-500">*</span>
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
        <input
          id="patient-search"
          type="search"
          autoComplete="off"
          placeholder="Search by name or CIN..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          aria-invalid={Boolean(error)}
          className={`block w-full rounded-lg border bg-white py-2 pl-9 pr-3 text-sm shadow-sm focus:outline-none focus:ring-2 ${
            error ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-300 focus:border-teal-500 focus:ring-teal-100'
          }`}
        />
      </div>
      {open && (
        <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {loading && (
            <li className="flex items-center gap-2 px-3 py-2 text-sm text-slate-500">
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> Searching...
            </li>
          )}
          {!loading && results.length === 0 && <li className="px-3 py-2 text-sm text-slate-500">No patient found</li>}
          {!loading &&
            results.map((patient) => (
              <li key={patient.id}>
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onChange(patient);
                    setSearch('');
                  }}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-teal-50"
                >
                  <span className="font-medium text-slate-800">{patient.fullName}</span>
                  <span className="text-xs text-slate-500">{patient.cin}</span>
                </button>
              </li>
            ))}
        </ul>
      )}
      {error && <p className="mt-1.5 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
