import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { projectsApi } from '../../api/projects.js'

const DOMAIN_ICONS = {
  'Banking': '🏦', 'Finance': '💰', 'Healthcare': '🏥', 'E-commerce': '🛒',
  'Education': '🎓', 'Insurance': '🛡', 'Logistics': '📦', 'Real Estate': '🏠',
  'Social Media': '💬', 'Telecom': '📡', 'Travel': '✈️', 'Retail': '🛍',
}

const TYPE_COLORS = {
  'Functional':    '#6366f1',
  'Regression':    '#f59e0b',
  'Integration':   '#10b981',
  'Performance':   '#ef4444',
  'Security':      '#8b5cf6',
  'Exploratory':   '#3b82f6',
}

function formatDate(ts) {
  if (!ts) return 'N/A'
  const d = new Date(ts * 1000)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function ProjectCard({ project, onClick }) {
  const domainIcon = DOMAIN_ICONS[project.domain] || '📁'
  const typeColor  = TYPE_COLORS[project.testing_type] || '#64748b'

  return (
    <div className="proj-card" onClick={onClick} role="button" tabIndex={0}
         onKeyDown={e => e.key === 'Enter' && onClick()}>
      <div className="proj-card-top">
        <div className="proj-card-icon">{domainIcon}</div>
        <div className="proj-card-meta">
          {project.testing_type && (
            <span className="proj-card-badge" style={{ background: typeColor + '22', color: typeColor, borderColor: typeColor + '44' }}>
              {project.testing_type}
            </span>
          )}
          {project.is_legacy && (
            <span className="proj-card-badge proj-card-badge--legacy">Legacy</span>
          )}
        </div>
      </div>
      <h3 className="proj-card-name">{project.name}</h3>
      {project.description && (
        <p className="proj-card-desc">{project.description}</p>
      )}
      <div className="proj-card-footer">
        <span className="proj-card-domain">{project.domain || 'General'}</span>
        <span className="proj-card-date">{formatDate(project.created_at)}</span>
        {project.total_cases > 0 && (
          <span className="proj-card-cases">{project.total_cases} cases</span>
        )}
      </div>
      <div className="proj-card-arrow">→</div>
    </div>
  )
}

export default function ProjectListPage() {
  const { currentUser, logout } = useAuth()
  const navigate = useNavigate()

  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    projectsApi.list()
      .then(setProjects)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  function handleProjectClick(project) {
    if (project.is_legacy) {
      navigate(`/project/${project.id}/legacy`)
    } else {
      navigate(`/project/${project.id}/build`)
    }
  }

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.domain || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="proj-list-page">
      {/* Top bar */}
      <header className="proj-list-header">
        <div className="proj-list-brand">
          <svg width="28" height="28" viewBox="0 0 36 36" fill="none">
            <rect width="36" height="36" rx="10" fill="url(#plg)"/>
            <path d="M10 18h16M18 10v16" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            <defs>
              <linearGradient id="plg" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                <stop stopColor="#6366f1"/><stop offset="1" stopColor="#3b82f6"/>
              </linearGradient>
            </defs>
          </svg>
          <span className="proj-list-brand-name">QA Intelligence</span>
        </div>
        <div className="proj-list-header-right">
          <span className="proj-list-user">
            👤 {currentUser?.login_id}
            {currentUser?.role === 'admin' && <span className="proj-admin-badge">Admin</span>}
          </span>
          {currentUser?.role === 'admin' && (
            <button className="btn-ghost" onClick={() => navigate('/admin')}>
              ⚙ Admin
            </button>
          )}
          <button className="btn-ghost btn-ghost--danger" onClick={() => { logout(); navigate('/login') }}>
            Sign Out
          </button>
        </div>
      </header>

      {/* Hero */}
      <div className="proj-list-hero">
        <h1>Your Projects</h1>
        <p>Select a project to continue, or start something new.</p>
      </div>

      {/* Toolbar */}
      <div className="proj-list-toolbar">
        <div className="proj-search-wrap">
          <span className="proj-search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="proj-search-input"
          />
        </div>
        <button
          id="new-project-btn"
          className="btn btn-primary proj-new-btn"
          onClick={() => navigate('/projects/new')}
        >
          + New Project
        </button>
      </div>

      {/* Content */}
      <main className="proj-list-content">
        {loading ? (
          <div className="proj-loading">
            <div className="spinner" />
            <p>Loading projects...</p>
          </div>
        ) : error ? (
          <div className="proj-error">
            <p>Failed to load projects: {error}</p>
            <button className="btn btn-primary" onClick={() => window.location.reload()}>Retry</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="proj-empty">
            {search ? (
              <>
                <div className="proj-empty-icon">🔍</div>
                <h3>No projects match "{search}"</h3>
                <button className="btn-ghost" onClick={() => setSearch('')}>Clear search</button>
              </>
            ) : (
              <>
                <div className="proj-empty-icon">🚀</div>
                <h3>No projects yet</h3>
                <p>Create your first project to get started.</p>
                <button className="btn btn-primary" onClick={() => navigate('/projects/new')}>
                  + New Project
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="proj-grid">
            {filtered.map(p => (
              <ProjectCard key={p.id} project={p} onClick={() => handleProjectClick(p)} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
