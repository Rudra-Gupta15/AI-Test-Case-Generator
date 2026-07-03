import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import ProtectedRoute from './components/shared/ProtectedRoute.jsx'
import LoginPage from './components/auth/LoginPage.jsx'
import ProjectListPage from './components/projects/ProjectListPage.jsx'
import NewProjectForm from './components/projects/NewProjectForm.jsx'
import TreeBuilderPage from './components/tree/TreeBuilderPage.jsx'
import LegacyWorkspaceView from './components/legacy/LegacyWorkspaceView.jsx'
import AdminDashboard from './components/admin/AdminDashboard.jsx'

export const ANALYZE_STAGES = [
  { key: 'parsing_documents', label: 'Parsing Documents' },
  { key: 'fetching_figma', label: 'Fetching Figma' },
  { key: 'understanding', label: 'AI Analysis' },
  { key: 'planning_tests', label: 'Planning Test Suite' },
  { key: 'generating_tests', label: 'Generating Test Cases' },
  { key: 'finalizing', label: 'Finalizing Report' },
  { key: 'done', label: 'Complete' },
]

export default function App() {
  const { isAuthenticated } = useAuth()

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* Root redirect */}
      <Route
        path="/"
        element={isAuthenticated ? <Navigate to="/projects" replace /> : <Navigate to="/login" replace />}
      />

      {/* Protected — User */}
      <Route path="/projects" element={<ProtectedRoute><ProjectListPage /></ProtectedRoute>} />
      <Route path="/projects/new" element={<ProtectedRoute><NewProjectForm /></ProtectedRoute>} />
      <Route path="/project/:id/build" element={<ProtectedRoute><TreeBuilderPage /></ProtectedRoute>} />
      <Route path="/project/:id/legacy" element={<ProtectedRoute><LegacyWorkspaceView /></ProtectedRoute>} />

      {/* Protected — Admin only */}
      <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
