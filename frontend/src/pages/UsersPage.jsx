import { useState } from 'react';
import toast from 'react-hot-toast';
import { UserPlus } from 'lucide-react';
import { useFetch } from '../hooks/useFetch';
import { usersApi } from '../services/usersApi';
import Button from '../components/ui/Button';
import FormField from '../components/ui/FormField';
import Modal from '../components/ui/Modal';
import { Card, PageHeader } from '../components/ui/Card';
import { Alert, ErrorState, Spinner } from '../components/ui/States';
import { Table, Td, Th } from '../components/ui/Table';
import { getErrorCode, getErrorMessage, getFieldErrors } from '../utils/apiError';
import { formatDate } from '../utils/format';
import { userSchema, validateForm } from '../utils/validation';

const EMPTY_FORM = { fullName: '', email: '', password: '', role: 'staff' };

function CreateUserModal({ open, onClose, onCreated }) {
  const [values, setValues] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const update = (field) => (event) => {
    setValues((previous) => ({ ...previous, [field]: event.target.value }));
    setErrors((previous) => ({ ...previous, [field]: undefined }));
  };

  function close() {
    setValues(EMPTY_FORM);
    setErrors({});
    setFormError('');
    onClose();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');
    const { data, errors: validationErrors } = validateForm(userSchema, values);
    if (!data) {
      setErrors(validationErrors);
      return;
    }

    setSaving(true);
    try {
      await usersApi.create(data);
      toast.success('User account created');
      setValues(EMPTY_FORM);
      onCreated();
    } catch (error) {
      const fieldErrors = getFieldErrors(error);
      if (getErrorCode(error) === 'EMAIL_ALREADY_EXISTS') fieldErrors.email = getErrorMessage(error);
      setErrors(fieldErrors);
      if (!Object.keys(fieldErrors).length) setFormError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Create user"
      description="Give a staff member or administrator access to ClinicFlow."
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="user-form" loading={saving}>
            Create user
          </Button>
        </>
      }
    >
      <form id="user-form" onSubmit={handleSubmit} noValidate className="grid gap-4">
        {formError && <Alert>{formError}</Alert>}
        <FormField label="Full name" required value={values.fullName} onChange={update('fullName')} error={errors.fullName} autoFocus />
        <FormField label="Email" required type="email" value={values.email} onChange={update('email')} error={errors.email} />
        <FormField
          label="Password"
          required
          type="password"
          autoComplete="new-password"
          value={values.password}
          onChange={update('password')}
          error={errors.password}
          hint="At least 8 characters with an uppercase letter, a lowercase letter and a digit."
        />
        <FormField label="Role" as="select" value={values.role} onChange={update('role')}>
          <option value="staff">Staff</option>
          <option value="admin">Admin</option>
        </FormField>
      </form>
    </Modal>
  );
}

export default function UsersPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const { data, loading, error, reload } = useFetch(() => usersApi.list(), []);

  return (
    <>
      <PageHeader
        title="Users"
        description="Accounts that can access ClinicFlow."
        action={
          <Button icon={UserPlus} onClick={() => setCreateOpen(true)}>
            Create user
          </Button>
        }
      />
      <Card>
        {loading && !data ? (
          <Spinner />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Role</Th>
                <Th>Created</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((user) => (
                <tr key={user.id}>
                  <Td className="font-medium text-slate-900">{user.fullName}</Td>
                  <Td>{user.email}</Td>
                  <Td>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${
                        user.role === 'admin' ? 'bg-teal-50 text-teal-700' : 'bg-sky-50 text-sky-700'
                      }`}
                    >
                      {user.role}
                    </span>
                  </Td>
                  <Td className="text-slate-500">{formatDate(user.createdAt)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
      <CreateUserModal
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
