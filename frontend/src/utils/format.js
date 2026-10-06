const dateFormatter = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const timeFormatter = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' });
const longDateFormatter = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

/** 'YYYY-MM-DD' strings (birth dates) are parsed as local dates to avoid any time-zone shift. */
function toDate(value) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(value);
}

export const formatDate = (value) => (value ? dateFormatter.format(toDate(value)) : '—');
export const formatTime = (value) => (value ? timeFormatter.format(toDate(value)) : '—');
export const formatDateTime = (value) => (value ? `${formatDate(value)}, ${formatTime(value)}` : '—');
export const formatLongDate = (value) => longDateFormatter.format(toDate(value));

/** Local calendar date as 'YYYY-MM-DD' (for <input type="date"> and API filters). */
export function toDateInputValue(date = new Date()) {
  const pad = (number) => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function calculateAge(birthDate) {
  const birth = toDate(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const birthdayPassed =
    today.getMonth() > birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
  if (!birthdayPassed) age -= 1;
  return age;
}

export function getInitials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}
