import { Plus } from 'lucide-react';

export default function Logo({ light = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 shadow-sm">
        <Plus className="h-5 w-5 text-white" strokeWidth={3} aria-hidden />
      </div>
      <span className={`text-lg font-semibold tracking-tight ${light ? 'text-white' : 'text-slate-900'}`}>
        Clinic<span className={light ? 'text-teal-300' : 'text-teal-600'}>Flow</span>
      </span>
    </div>
  );
}
