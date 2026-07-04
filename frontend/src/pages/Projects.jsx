import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import projectService from '../services/projectService.js'
import ProjectCard from '../components/projects/ProjectCard.jsx'

export default function Projects() {
  const { currentUser, logout } = useAuth()
  const navigate = useNavigate()

  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDesc, setNewProjectDesc] = useState('')
  const [creating, setCreating] = useState(false)

  // new form poup
  const [showCreatePopup, setShowCreatePopup] = useState(false)

  useEffect(() => {
    projectService.list()
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
      await projectService.delete(projectId)
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
      const p = await projectService.create({
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

      {/* <div className="app-sidebar" style={{ width: '420px', flexBasis: '420px', minWidth: '420px', display: 'flex', flexDirection: 'column' }}>
        Sidebar Brand Header
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
      </div>  */}

      <div className="app-main-content step-1" style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f8fafc', padding: 0, alignItems: 'stretch' }}>
        {/* Floating Capsule Navbar */} 
        <div className="floating-navbar-container" style={{ padding: '16px 24px 8px 24px' }}>
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

        {/* Dashboard Main Content */}
        <div className="main-step-container" style={{ display: 'flex', maxWidth: '100%', margin: '0', padding: '0 24px 24px 24px', flex: 1, overflow: 'hidden' }}>
          <div style={{ flex: '1', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            {/* <div className="main-step-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', textAlign: 'left' }}>
              <div>
                <h2 style={{ fontSize: '28px', margin: '0 0 8px 0', color: '#0f172a', fontWeight: 'bold' }}>Projects List</h2>
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
            </div> */}

            {/* Project Button created */}
           <div
  className="main-step-header"
  style={{
    marginBottom: "1.5rem",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    textAlign: "left"
  }}
>
  {/* Left */}
  <div>
    <h2
      style={{
        fontSize: "20px",
        margin: "0 0 4px 0",
        color: "#0f172a",
        fontWeight: "bold"
      }}
    >
      Projects List
    </h2>

    <p
      style={{
        fontSize: "13px",
        margin: 0,
        color: "#64748b"
      }}
    >
      Select an existing project to continue.
    </p>
  </div>

  {/* Right */}
 <div
  style={{
    display: "flex",
    alignItems: "center",
    gap: "12px"
  }}
>
  <div className="proj-search-wrap" style={{ margin: 0, width: '300px', position: 'relative', background: 'transparent', border: 'none', padding: 0 }}>
    <span
      style={{
        position: "absolute",
        left: "12px",
        top: "50%",
        transform: "translateY(-50%)",
        color: "#94a3b8",
        zIndex: 2
      }}
    >
      🔍
    </span>

    <input
      type="text"
      placeholder="Search projects..."
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      style={{
        width: "100%",
        padding: "10px 12px 10px 36px",
        borderRadius: "8px",
        border: "1.5px solid #cbd5e1",
        fontSize: "14px",
        outline: "none",
        background: "#ffffff",
        color: "#0f172a",
        boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
        transition: "border-color 0.2s"
      }}
      onFocus={e => e.target.style.borderColor = '#3b82f6'}
      onBlur={e => e.target.style.borderColor = '#cbd5e1'}
    />
  </div>

  <button
    onClick={() => setShowCreatePopup(true)}
    style={{
      background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
      color: "#fff",
      border: "none",
      padding: "10px 18px",
      borderRadius: "8px",
      cursor: "pointer",
      fontWeight: "600",
      transition: "all 0.2s ease",
      boxShadow: "0 4px 12px rgba(37, 99, 235, 0.2)"
    }}
    onMouseOver={e => {
      e.currentTarget.style.transform = 'translateY(-1px)';
      e.currentTarget.style.boxShadow = '0 6px 16px rgba(37, 99, 235, 0.3)';
    }}
    onMouseOut={e => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.2)';
    }}
  >
    + Create Project
  </button>
</div>
           </div>

            {/* pop up created  */}

            {showCreatePopup && (
              <div
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  background: "rgba(15, 23, 42, 0.3)",
                  backdropFilter: "blur(8px)",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  zIndex: 999
                }}
                onClick={() => setShowCreatePopup(false)}
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    width: "500px",
                    background: "#ffffff",
                    borderRadius: "20px",
                    padding: "32px",
                    boxShadow: "0 25px 50px -12px rgba(15, 23, 42, 0.15)"
                  }}
                >
                  <h2 style={{ fontSize: "24px", fontWeight: "800", color: "#0f172a", margin: "0 0 6px 0" }}>Create Project</h2>
                  <p style={{ fontSize: "14px", color: "#64748b", margin: "0 0 24px 0" }}>Start a new testing workspace.</p>
                  
                  <form onSubmit={handleCreateProject} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "8px" }}>
                        Project Name <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Mobile E-commerce App"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        required
                        style={{
                          width: "100%",
                          padding: "12px 16px",
                          borderRadius: "10px",
                          border: "1.5px solid #cbd5e1",
                          fontSize: "14px",
                          outline: "none",
                          color: "#0f172a",
                          background: "#ffffff",
                          boxShadow: "inset 0 1px 2px rgba(0,0,0,0.05)",
                          transition: "all 0.2s"
                        }}
                        onFocus={e => e.target.style.borderColor = '#3b82f6'}
                        onBlur={e => e.target.style.borderColor = '#cbd5e1'}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "8px" }}>
                        Description
                      </label>
                      <textarea
                        placeholder="Briefly describe the project..."
                        value={newProjectDesc}
                        onChange={(e) => setNewProjectDesc(e.target.value)}
                        style={{
                          width: "100%",
                          height: "120px",
                          padding: "12px 16px",
                          borderRadius: "10px",
                          border: "1.5px solid #cbd5e1",
                          fontSize: "14px",
                          outline: "none",
                          color: "#0f172a",
                          background: "#ffffff",
                          boxShadow: "inset 0 1px 2px rgba(0,0,0,0.05)",
                          resize: "vertical",
                          transition: "all 0.2s"
                        }}
                        onFocus={e => e.target.style.borderColor = '#3b82f6'}
                        onBlur={e => e.target.style.borderColor = '#cbd5e1'}
                      />
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: "12px",
                        marginTop: "8px"
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setShowCreatePopup(false)}
                        style={{
                          background: "transparent",
                          border: "1.5px solid #cbd5e1",
                          color: "#64748b",
                          padding: "10px 20px",
                          borderRadius: "8px",
                          cursor: "pointer",
                          fontWeight: "600",
                          transition: "all 0.2s"
                        }}
                        onMouseOver={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#334155'; }}
                        onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; }}
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        disabled={creating || !newProjectName.trim()}
                        style={{
                          background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                          color: "#fff",
                          padding: "10px 24px",
                          border: "none",
                          borderRadius: "8px",
                          cursor: (creating || !newProjectName.trim()) ? "not-allowed" : "pointer",
                          opacity: (creating || !newProjectName.trim()) ? 0.6 : 1,
                          fontWeight: "600",
                          transition: "all 0.2s",
                          boxShadow: "0 4px 12px rgba(37, 99, 235, 0.2)"
                        }}
                        onMouseOver={e => {
                          if (!creating && newProjectName.trim()) {
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 6px 16px rgba(37, 99, 235, 0.3)';
                          }
                        }}
                        onMouseOut={e => {
                          if (!creating && newProjectName.trim()) {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.2)';
                          }
                        }}
                      >
                        {creating ? "Creating..." : "Create Project"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}


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
                    <p style={{ margin: 0 }}>Click "+ Create Project" at the top to get started.</p>
                  </>
                )}
              </div>
            ) : (
               <div className="proj-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '24px', overflowY: 'auto', paddingTop: '20px', paddingBottom: '40px', alignContent: 'start', flex: 1, paddingRight: '12px' }}>
                {filtered.map(p => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    onClick={() => handleProjectClick(p)}
                    onDelete={handleDeleteProject}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}