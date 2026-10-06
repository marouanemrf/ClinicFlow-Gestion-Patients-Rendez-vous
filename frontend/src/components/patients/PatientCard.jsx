import { Link } from 'react-router-dom';
import { Cake, Eye, MapPin, Pencil, Phone, Trash2 } from 'lucide-react';
import Button from '../ui/Button';
import PatientAvatar from './PatientAvatar';
import { calculateAge, formatDate } from '../../utils/format';

function Detail({ icon: Icon, children, muted = false }) {
  return (
    <div className={`flex items-center gap-2.5 ${muted ? 'text-slate-400' : 'text-slate-600'}`}>
      <Icon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
      <span className="truncate">{children}</span>
    </div>
  );
}

export default function PatientCard({ patient, canDelete, onEdit, onDelete }) {
  const detailsUrl = `/patients/${patient.id}`;

  return (
    <article className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-teal-200 hover:shadow-md">
      <div className="flex flex-col items-center px-5 pb-4 pt-6 text-center">
        <PatientAvatar patient={patient} size="xl" className="shadow-sm" />
        <Link to={detailsUrl} className="mt-3 max-w-full truncate font-semibold text-slate-900 hover:text-teal-700">
          {patient.fullName}
        </Link>
        <p className="mt-0.5 text-sm text-slate-500">{calculateAge(patient.birthDate)} years old</p>
        <span className="mt-2 rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600">{patient.cin}</span>
      </div>

      <div className="space-y-2 border-t border-slate-100 px-5 py-4 text-sm">
        <Detail icon={Phone}>{patient.phone}</Detail>
        <Detail icon={Cake}>{formatDate(patient.birthDate)}</Detail>
        <Detail icon={MapPin} muted={!patient.address}>
          {patient.address || 'No address'}
        </Detail>
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-slate-100 px-3 py-2">
        <Link
          to={detailsUrl}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-teal-700 hover:bg-teal-50"
          aria-label={`View ${patient.fullName}`}
        >
          <Eye className="h-4 w-4" aria-hidden /> View
        </Link>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            icon={Pencil}
            title="Edit"
            aria-label={`Edit ${patient.fullName}`}
            onClick={() => onEdit(patient)}
          />
          {canDelete && (
            <Button
              variant="ghost"
              size="icon"
              icon={Trash2}
              title="Delete"
              aria-label={`Delete ${patient.fullName}`}
              className="hover:bg-rose-50 hover:text-rose-600"
              onClick={() => onDelete(patient)}
            />
          )}
        </div>
      </div>
    </article>
  );
}
