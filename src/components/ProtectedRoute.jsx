import { Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function ProtectedRoute({ children }) {
  const { user, token } = useApp();

  if (!user || !token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
