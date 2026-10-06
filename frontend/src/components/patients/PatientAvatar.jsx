import { usePatientPhoto } from '../../hooks/usePatientPhoto';
import { getInitials } from '../../utils/format';

const SIZES = {
  md: 'h-12 w-12 text-sm',
  lg: 'h-16 w-16 text-lg',
  xl: 'h-20 w-20 text-2xl',
};

const FALLBACK_COLORS = [
  'bg-teal-100 text-teal-700',
  'bg-sky-100 text-sky-700',
  'bg-indigo-100 text-indigo-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
];

/** Same name, same color: initials stay recognisable from one page to another. */
function colorFor(name = '') {
  const hash = [...name].reduce((total, character) => total + character.charCodeAt(0), 0);
  return FALLBACK_COLORS[hash % FALLBACK_COLORS.length];
}

export function AvatarFrame({ src, name, size = 'md', className = '' }) {
  const base = `flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold ring-4 ring-white ${SIZES[size]}`;

  if (src) {
    return (
      <div className={`${base} bg-slate-100 ${className}`}>
        <img src={src} alt={`Photo of ${name}`} className="h-full w-full object-cover" />
      </div>
    );
  }
  return (
    <div className={`${base} ${colorFor(name)} ${className}`} aria-hidden>
      {getInitials(name) || '?'}
    </div>
  );
}

export default function PatientAvatar({ patient, size, className }) {
  const photoUrl = usePatientPhoto(patient);
  return <AvatarFrame src={photoUrl} name={patient.fullName} size={size} className={className} />;
}
