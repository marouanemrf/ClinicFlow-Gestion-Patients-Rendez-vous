import { Link } from 'react-router-dom';
import StatusBadge from '../ui/StatusBadge';
import StatusSelect from './StatusSelect';
import { Table, Td, Th } from '../ui/Table';
import { formatDate, formatTime } from '../../utils/format';

export default function AppointmentsTable({ appointments, showPatient = true, showCreatedBy = true, onStatusChange }) {
  return (
    <Table>
      <thead>
        <tr>
          {showPatient && <Th>Patient</Th>}
          <Th>Date</Th>
          <Th>Time</Th>
          <Th>Reason</Th>
          <Th>Status</Th>
          {showCreatedBy && <Th>Created by</Th>}
          {!showPatient && <Th>Notes</Th>}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {appointments.map((appointment) => (
          <tr key={appointment.id} className="hover:bg-slate-50/60">
            {showPatient && (
              <Td>
                <Link to={`/patients/${appointment.patientId}`} className="font-medium text-slate-900 hover:text-teal-700">
                  {appointment.patientName}
                </Link>
                <p className="text-xs text-slate-500">{appointment.patientCin}</p>
              </Td>
            )}
            <Td>{formatDate(appointment.appointmentDate)}</Td>
            <Td className="font-medium tabular-nums">{formatTime(appointment.appointmentDate)}</Td>
            <Td className="max-w-56 truncate" title={appointment.reason}>
              {appointment.reason}
            </Td>
            <Td>
              {onStatusChange ? (
                <StatusSelect appointment={appointment} onChange={onStatusChange} />
              ) : (
                <StatusBadge status={appointment.status} />
              )}
            </Td>
            {showCreatedBy && <Td className="text-slate-500">{appointment.createdByName}</Td>}
            {!showPatient && (
              <Td className="max-w-72 truncate text-slate-500" title={appointment.notes || ''}>
                {appointment.notes || '—'}
              </Td>
            )}
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
