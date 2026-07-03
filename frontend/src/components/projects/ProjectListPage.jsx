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

function ProjectCard({ project, onClick, onDelete }) {
  const domainIcon = DOMAIN_ICONS[project.domain] || '📁'
  const typeColor  = TYPE_COLORS[project.testing_type] || '#64748b'

  return (
    <div className="proj-card" onClick={onClick} role="button" tabIndex={0}
         onKeyDown={e => e.key === 'Enter' && onClick()}
         style={{ background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderRadius: '12px', padding: '20px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column' }}
         onMouseOver={e => e.currentTarget.style.borderColor = '#3b82f6'}
         onMouseOut={e => e.currentTarget.style.borderColor = '#e2e8f0'}
    >
      <div className="proj-card-top" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div className="proj-card-icon" style={{ fontSize: '24px' }}>{domainIcon}</div>
        <div className="proj-card-meta" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete?.(project.id, e); }}
            style={{ background: 'transparent', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: '4px 6px', borderRadius: '4px', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }}
            onMouseOver={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = '#fef2f2'; }}
            onMouseOut={e => { e.currentTarget.style.color = '#cbd5e1'; e.currentTarget.style.background = 'transparent'; }}
            title="Delete project"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
          </button>
          {project.testing_type && (
            <span className="proj-card-badge" style={{ background: typeColor + '22', color: typeColor, border: '1px solid ' + typeColor + '44', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>
              {project.testing_type}
            </span>
          )}
          {project.is_legacy && (
            <span className="proj-card-badge proj-card-badge--legacy" style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>Legacy</span>
          )}
        </div>
      </div>
      <h3 className="proj-card-name" style={{ margin: '0 0 8px 0', color: '#0f172a', fontSize: '18px' }}>{project.name}</h3>
      {project.description && (
        <p className="proj-card-desc" style={{ margin: '0 0 16px 0', color: '#64748b', fontSize: '14px', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{project.description}</p>
      )}
      <div className="proj-card-footer" style={{ display: 'flex', gap: '12px', color: '#94a3b8', fontSize: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '16px', marginTop: 'auto' }}>
        <span className="proj-card-domain">{project.domain || 'General'}</span>
        <span className="proj-card-date">{formatDate(project.created_at)}</span>
        {project.total_cases > 0 && (
          <span className="proj-card-cases">{project.total_cases} cases</span>
        )}
      </div>
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

  // New Project Form State
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDesc, setNewProjectDesc] = useState('')
  const [creating, setCreating] = useState(false)

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

  async function handleDeleteProject(projectId, e) {
    e.stopPropagation()
    if (!window.confirm("Are you sure you want to delete this project? This cannot be undone.")) return
    try {
      await projectsApi.delete(projectId)
      setProjects(prev => prev.filter(p => p.id !== projectId))
    } catch (err) {
      alert("Failed to delete project: " + err.message)
    }
  }

  async function handleCreateProject(e) {
    e.preventDefault()
    if (!newProjectName.trim()) return
    setCreating(true)
    try {
      const p = await projectsApi.create({
        name: newProjectName.trim(),
        description: newProjectDesc.trim() || undefined,
        testing_type: 'Functional',
        domain: 'General',
        is_legacy: false
      })
      navigate(`/project/${p.id}/build`)
    } catch (err) {
      alert("Failed to create project: " + err.message)
      setCreating(false)
    }
  }

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.domain || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="app-window step-1">
      {/* ================= LEFT SIDEBAR (Dark Black Theme) ================= */}
      <div className="app-sidebar" style={{ width: '420px', flexBasis: '420px', minWidth: '420px', display: 'flex', flexDirection: 'column' }}>
        {/* Sidebar Brand Header */}
        <div style={{ padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', width: '100%', marginBottom: '24px' }}>
          <img src="/Logo.png" alt="Prevoyance IT Solutions" style={{ width: '100%', maxWidth: '160px', height: 'auto', objectFit: 'contain' }} />
        </div>

        
        <div style={{ padding: '0 24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '24px', margin: '0 0 6px 0', color: '#ffffff', fontWeight: '700', letterSpacing: '-0.5px' }}>Create Project</h2>
            <p style={{ fontSize: '13px', margin: 0, color: '#94a3b8' }}>Start a new testing workspace.</p>
          </div>
          
          <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#cbd5e1', marginBottom: '8px' }}>Project Name <span style={{color: '#ef4444'}}>*</span></label>
              <input 
                type="text" 
                value={newProjectName} 
                onChange={e => setNewProjectName(e.target.value)}
                placeholder="e.g. Mobile E-commerce App"
                style={{ width: '100%', padding: '14px 16px', borderRadius: '8px', border: '1px solid #334155', fontSize: '14px', outline: 'none', background: '#1e293b', color: '#f8fafc', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)', transition: 'border-color 0.2s' }}
                onFocus={e => e.target.style.borderColor = '#3b82f6'}
                onBlur={e => e.target.style.borderColor = '#334155'}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#cbd5e1', marginBottom: '8px' }}>Description</label>
              <textarea 
                value={newProjectDesc} 
                onChange={e => setNewProjectDesc(e.target.value)}
                placeholder="Briefly describe the project..."
                style={{ width: '100%', padding: '14px 16px', borderRadius: '8px', border: '1px solid #334155', fontSize: '14px', outline: 'none', minHeight: '120px', resize: 'vertical', background: '#1e293b', color: '#f8fafc', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)', transition: 'border-color 0.2s', fontFamily: 'inherit' }}
                onFocus={e => e.target.style.borderColor = '#3b82f6'}
                onBlur={e => e.target.style.borderColor = '#334155'}
              />
            </div>
            <button 
              type="submit" 
              disabled={creating || !newProjectName.trim()}
              style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: '#ffffff', borderRadius: '8px', border: 'none', fontSize: '15px', fontWeight: '600', cursor: (creating || !newProjectName.trim()) ? 'not-allowed' : 'pointer', opacity: (creating || !newProjectName.trim()) ? 0.6 : 1, transition: 'all 0.2s', marginTop: '4px', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)' }}
              onMouseOver={e => { if(!creating && newProjectName.trim()) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(37, 99, 235, 0.4)'; } }}
              onMouseOut={e => { if(!creating && newProjectName.trim()) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.3)'; } }}
            >
              {creating ? 'Creating...' : 'Create Project ➔'}
            </button>
          </form>
        </div>

        <div className="sidebar-bottom">
          <span className="help-icon">❔</span> Help & Documentation
        </div>
      </div>

      <div className="app-main-content step-1" style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f8fafc' }}>
        {/* Floating Capsule Navbar */}
        <div className="floating-navbar-container" style={{ padding: '24px 32px' }}>
          <div className="floating-navbar" style={{ maxWidth: '100%', margin: 0, padding: '12px 24px' }}>
            <div className="nav-brand" style={{ gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src="/Logo.png" alt="Logo" style={{ height: '24px', width: 'auto', objectFit: 'contain', borderRadius: '4px' }} />
              </div>
              <span className="nav-brand-name" style={{ background: 'linear-gradient(to right, #ffffff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: '800', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>AI QA REVIEWER</span>
            </div>
            <div className="nav-links">
              <button className="nav-link-btn active">Dashboard</button>
            </div>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <span style={{ color: '#94a3b8', fontSize: '13px', display: 'flex', alignItems: 'center' }}>
                👤 {currentUser?.login_id}
              </span>
              {currentUser?.role === 'admin' && (
                <button className="nav-email-btn" style={{ background: 'rgba(255,255,255,0.1)', color: 'white', padding: '6px 12px' }} onClick={() => navigate('/admin')}>
                  Admin Panel
                </button>
              )}
              <button className="nav-email-btn" style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '6px 12px' }} onClick={() => { logout(); navigate('/login') }}>
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Dashboard Main Content (Split Screen) */}
        <div className="main-step-container" style={{ display: 'flex',  maxWidth: '100%', margin: '0', padding: '0 48px 48px 48px', flex: 1, overflow: 'hidden' }}>
          
          {/* Right Column: Project List */}
          <div style={{ flex: '1', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <div className="main-step-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', textAlign: 'left' }}>
              <div>
                <h2 style={{ fontSize: '28px', margin: '0 0 8px 0', color: '#0f172a', fontWeight: 'bold' }}>Your Projects</h2>
                <p style={{ fontSize: '14px', margin: 0, color: '#64748b' }}>Select an existing project to continue.</p>
              </div>
              <div className="proj-search-wrap" style={{ margin: 0, width: '300px', position: 'relative', background: 'transparent', border: 'none', padding: 0 }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', zIndex: 2 }}>🔍</span>
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', background: '#ffffff', color: '#0f172a', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                />
              </div>
            </div>

            {loading ? (
              <div className="proj-loading" style={{ color: '#64748b', textAlign: 'center', padding: '40px' }}>
                <div className="spinner" style={{ margin: '0 auto 16px auto', borderTopColor: '#3b82f6' }} />
                <p>Loading projects...</p>
              </div>
            ) : error ? (
              <div className="proj-error" style={{ textAlign: 'center', padding: '40px', color: '#ef4444', background: '#fef2f2', borderRadius: '12px', border: '1px solid #fecaca' }}>
                <p style={{ fontWeight: '600', marginBottom: '16px' }}>Failed to load projects: {error}</p>
                <button className="btn btn-primary" onClick={() => window.location.reload()} style={{ padding: '8px 16px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Retry</button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="proj-empty" style={{ background: '#ffffff', border: '1px dashed #cbd5e1', color: '#64748b', textAlign: 'center', padding: '60px 20px', borderRadius: '12px' }}>
                {search ? (
                  <>
                    <div className="proj-empty-icon" style={{ fontSize: '32px', marginBottom: '16px' }}>🔍</div>
                    <h3 style={{ color: '#0f172a', margin: '0 0 8px 0', fontSize: '18px' }}>No projects match "{search}"</h3>
                    <button onClick={() => setSearch('')} style={{ background: 'transparent', border: 'none', color: '#3b82f6', cursor: 'pointer', fontWeight: '600' }}>Clear search</button>
                  </>
                ) : (
                  <>
                    <div className="proj-empty-icon" style={{ fontSize: '32px', marginBottom: '16px' }}>🚀</div>
                    <h3 style={{ color: '#0f172a', margin: '0 0 8px 0', fontSize: '18px' }}>No projects yet</h3>
                    <p style={{ margin: 0 }}>Use the form on the left to create your first project.</p>
                  </>
                )}
              </div>
            ) : (
              <div className="proj-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', overflowY: 'auto', paddingBottom: '40px', alignContent: 'start', flex: 1, paddingRight: '12px' }}>
                {filtered.map(p => (
                  <ProjectCard key={p.id} project={p} onClick={() => handleProjectClick(p)} onDelete={handleDeleteProject} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
