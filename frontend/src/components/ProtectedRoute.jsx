import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Spinner } from './ui/States';

export default function ProtectedRoute({ roles, children }) {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <Spinner label="Restoring your session..." className="min-h-screen" />;
  if (status !== 'authenticated') return <Navigate to="/login" replace state={{ from: location }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;

  return children;
}
