/**
 * ProtectedRoute — checks role directly from AuthContext user.
 */
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface Props {
  children: React.ReactNode;
  allowedRole: 'admin' | 'operator' | 'viewer';
}

export default function ProtectedRoute({ children, allowedRole }: Props) {
  const { currentUser } = useAuth();

  if (!currentUser) return <Navigate to="/" replace />;

  const roleName = (currentUser.roleName ?? '').toLowerCase();
  if (!roleName.includes(allowedRole)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
