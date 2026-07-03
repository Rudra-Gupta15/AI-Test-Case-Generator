import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { isAuthenticated, currentUser } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (requireAdmin && currentUser?.role !== 'admin') {
    return <Navigate to="/projects" replace />
  }

  return children
}
