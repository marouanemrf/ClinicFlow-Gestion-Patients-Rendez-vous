import { useState } from 'react';
import { STATUS_STYLES } from '../ui/StatusBadge';

/** Inline status editor: shows the current status and calls onChange(newStatus). */
export default function StatusSelect({ appointment, onChange }) {
  const [saving, setSaving] = useState(false);
  const style = STATUS_STYLES[appointment.status];

  async function handleChange(event) {
    setSaving(true);
    try {
      await onChange(appointment, event.target.value);
    } finally {
      setSaving(false);
    }
  }

  return (
    <select
      value={appointment.status}
      onChange={handleChange}
      disabled={saving}
      aria-label={`Status of the appointment with ${appointment.patientName}`}
      className={`cursor-pointer rounded-full border-0 py-1 pl-2.5 pr-7 text-xs font-medium ring-1 ring-inset focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:cursor-wait disabled:opacity-60 ${style.className}`}
    >
      {Object.entries(STATUS_STYLES).map(([value, { label }]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}
