import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import ProtectedRoute from './ProtectedRoute.jsx'
import Login from '../pages/Login.jsx'
import Projects from '../pages/Projects.jsx'
import NewProjectForm from '../components/projects/NewProjectForm.jsx'
import LegacyWorkspace from '../pages/LegacyWorkspace.jsx'
import Admin from '../pages/Admin.jsx'

export default function AppRoutes() {
  const { isAuthenticated } = useAuth()

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />

      {/* Root redirect */}
      <Route
        path="/"
        element={isAuthenticated ? <Navigate to="/projects" replace /> : <Navigate to="/login" replace />}
      />

      {/* Protected — User */}
      <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
      <Route path="/projects/new" element={<ProtectedRoute><NewProjectForm /></ProtectedRoute>} />
      {/* /build redirects to /legacy for backward compat */}
      <Route path="/project/:id/build" element={<Navigate to="../legacy" replace />} />
      <Route path="/project/:id/legacy" element={<ProtectedRoute><LegacyWorkspace /></ProtectedRoute>} />

      {/* Protected — Admin only */}
      <Route path="/admin" element={<ProtectedRoute requireAdmin><Admin /></ProtectedRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
