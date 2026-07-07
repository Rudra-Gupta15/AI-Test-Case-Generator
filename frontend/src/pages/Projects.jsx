import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import projectService from '../services/projectService.js'
import ProjectCard from '../components/projects/ProjectCard.jsx'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LabelList } from 'recharts'

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
  const [selectedProject, setSelectedProject] = useState(null)
  const [projectStats, setProjectStats] = useState({ file_uploaded: 0, analysis: 0, tc_generated: 0, executed: 0 })
  const [deleteTarget, setDeleteTarget] = useState(null)

  const [notepadContent, setNotepadContent] = useState('')
  const [isSavingNotepad, setIsSavingNotepad] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    if (selectedProject?.id) {
      projectService.getStats(selectedProject.id)
        .then(setProjectStats)
        .catch(err => console.error("Failed to fetch project stats:", err.message))
    }
  }, [selectedProject])

  useEffect(() => {
    projectService.list()
      .then(setProjects)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  function handleProjectClick(project) {
    setSelectedProject(project)
    setNotepadContent(project.notepad || '')
    setSaveSuccess(false)
  }

  const [isDuplicating, setIsDuplicating] = useState(false)

  async function handleDuplicateProject(e) {
    e.stopPropagation()
    if (!selectedProject) return
    setIsDuplicating(true)
    try {
      const newProject = await projectService.duplicate(selectedProject.id)
      setProjects(prev => [newProject, ...prev])
      setSelectedProject(newProject)
      setNotepadContent(newProject.notepad || '')
      setSaveSuccess(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsDuplicating(false)
    }
  }

  function handleDeleteProject(projectId, e, type = 'project') {
    e.stopPropagation()
    setDeleteTarget({ id: projectId, type })
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await projectService.delete(deleteTarget.id)
      setProjects(prev => prev.filter(p => p.id !== deleteTarget.id))
      setDeleteTarget(null)
      if (selectedProject?.id === deleteTarget.id) {
        setSelectedProject(null)
      }
    } catch (err) {
      alert("Failed to delete project: " + err.message)
    }
  }

  async function handleSaveNotepad() {
    if (!selectedProject) return;
    setIsSavingNotepad(true);
    try {
      await projectService.update(selectedProject.id, {
        name: selectedProject.name,
        notepad: notepadContent,
        description: selectedProject.description || "",
        domain: selectedProject.domain || "",
        testing_type: selectedProject.testing_type || "",
        methodology: selectedProject.methodology || ""
      });
      setSaveSuccess(true);
      setSelectedProject(prev => ({ ...prev, notepad: notepadContent }));
      setProjects(prev => prev.map(p => p.id === selectedProject.id ? { ...p, notepad: notepadContent } : p));
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert("Failed to save notepad: " + err.message);
    } finally {
      setIsSavingNotepad(false);
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
        is_legacy: true
      })
      navigate(`/project/${p.id}/legacy`)
    } catch (err) {
      alert("Failed to create project: " + err.message)
      setCreating(false)
    }
  }



  const groupedProjects = useMemo(() => {
    const groups = {}
    projects.forEach(p => {
      const parentId = p.parent_id || p.id
      if (!groups[parentId]) {
        groups[parentId] = []
      }
      groups[parentId].push(p)
    })

    const displayList = []
    Object.values(groups).forEach(group => {
      // Sort chronologically (oldest first)
      group.sort((a, b) => (a.created_at || 0) - (b.created_at || 0))
      // Use the root project (the oldest one) for the display card
      displayList.push(group[0])
    })
    // Sort display list so most recently created root projects are first
    return displayList.sort((a, b) => (b.created_at || 0) - (a.created_at || 0))
  }, [projects])

  const filtered = groupedProjects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.domain || '').toLowerCase().includes(search.toLowerCase())
  )

  const projectVersions = useMemo(() => {
    if (!selectedProject) return []
    const parentId = selectedProject.parent_id || selectedProject.id
    const versions = projects.filter(p => (p.parent_id || p.id) === parentId)
    return versions.sort((a, b) => (a.created_at || 0) - (b.created_at || 0))
  }, [projects, selectedProject])

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
        {/* Full-width Rectangular Navbar */}
        <div className="floating-navbar-container">
          <div className="floating-navbar" style={{ padding: '16px 24px' }}>
            <div className="nav-brand" style={{ gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer' }} onClick={() => navigate('/project')}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src="/Logo.png" alt="Logo" style={{ height: '28px', width: 'auto', objectFit: 'contain', borderRadius: '4px', transform: 'scale(1.9)', transformOrigin: 'left center', marginRight: '28px' }} />
                </div>
                <span className="nav-brand-name" style={{ background: 'linear-gradient(to right, #ffffff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: '800', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>AI QA REVIEWER</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <span style={{ color: '#94a3b8', fontSize: '13px', display: 'flex', alignItems: 'center' }}>
                👤 {currentUser?.login_id}
              </span>
              {currentUser?.role === 'admin' && (
                <button className="nav-email-btn" style={{ background: 'rgba(255,255,255,0.1)', color: 'white', padding: '8px 16px' }} onClick={() => navigate('/admin')}>
                  Admin Panel
                </button>
              )}
              <button className="nav-email-btn" style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '8px 16px' }} onClick={() => { logout(); navigate('/login') }}>
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Dashboard Main Content */}
        <div className="main-step-container" style={{ display: 'flex', flexDirection: 'column', maxWidth: '100%', margin: '0', padding: '24px 24px 24px 24px', flex: 1, overflow: 'hidden' }}>

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

          <div style={{ display: 'flex', flex: 1, gap: '24px', minHeight: 0, overflow: 'hidden' }}>
            {/* LEFT PANEL */}
            <div style={{ flex: '1', display: 'flex', flexDirection: 'column', minWidth: 0 }}>

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

              {/* Delete Confirmation Popup */}
              {deleteTarget && (
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
                  onClick={() => setDeleteTarget(null)}
                >
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      width: "400px",
                      background: "#ffffff",
                      borderRadius: "20px",
                      padding: "32px",
                      boxShadow: "0 25px 50px -12px rgba(15, 23, 42, 0.15)",
                      textAlign: "center"
                    }}
                  >
                    <div style={{ fontSize: "40px", marginBottom: "16px" }}>⚠️</div>
                    <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#0f172a", margin: "0 0 12px 0" }}>
                      {deleteTarget.type === 'version' ? "Delete Version?" : "Delete Project?"}
                    </h2>
                    <p style={{ fontSize: "14px", color: "#64748b", margin: "0 0 24px 0", lineHeight: "1.5" }}>
                      {deleteTarget.type === 'version'
                        ? "Are you sure you want to delete this version? This action cannot be undone and all associated data will be permanently removed."
                        : "Are you sure you want to delete this project? This action cannot be undone and all associated data will be permanently removed."}
                    </p>

                    <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(null)}
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
                        onClick={confirmDelete}
                        style={{
                          background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                          color: "#fff",
                          padding: "10px 24px",
                          border: "none",
                          borderRadius: "8px",
                          cursor: "pointer",
                          fontWeight: "600",
                          transition: "all 0.2s",
                          boxShadow: "0 4px 12px rgba(220, 38, 38, 0.2)"
                        }}
                        onMouseOver={e => {
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = '0 6px 16px rgba(220, 38, 38, 0.3)';
                        }}
                        onMouseOut={e => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(220, 38, 38, 0.2)';
                        }}
                      >
                        Delete
                      </button>
                    </div>
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
                      onDelete={(id, e) => handleDeleteProject(id, e, 'project')}
                      isSelected={(selectedProject?.parent_id || selectedProject?.id) === (p.parent_id || p.id)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* RIGHT PANEL */}
            <div style={{ flex: '1', display: 'flex', flexDirection: 'column', minWidth: 0, background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
              {!selectedProject ? (
                <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '15px', padding: '24px' }}>
                  <div style={{ textAlign: 'center', border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '40px', width: '100%' }}>
                    Select a project to view insights
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  {/* Project Header */}
                  <div style={{ padding: '10px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '28px', height: '28px', background: '#eff6ff', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', boxShadow: 'inset 0 1px 2px rgba(59, 130, 246, 0.1)' }}>
                      📁
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h2 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>{selectedProject.name}</h2>
                      <span style={{ fontSize: '12px', color: '#cbd5e1' }}>|</span>
                      <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
                        {selectedProject.domain || 'General Workspace'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'row', flex: 1, minHeight: 0 }}>
                    {/* 25% Left Section (Versions) */}
                    <div style={{ flex: '0 0 25%', minWidth: '220px', padding: '24px', borderRight: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
                      <div className="hide-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
                        {projectVersions.map((v, i) => {
                          const isActive = v.id === selectedProject.id;
                          return (
                            <div
                              key={v.id}
                              onClick={() => { if (!isActive) { handleProjectClick(v); } }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '12px 16px',
                                background: isActive ? '#ffffff' : '#f8fafc',
                                border: isActive ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                                borderRadius: '12px',
                                color: isActive ? '#1e40af' : '#475569',
                                cursor: isActive ? 'default' : 'pointer',
                                boxShadow: isActive ? '0 4px 6px -1px rgba(59, 130, 246, 0.1), 0 2px 4px -1px rgba(59, 130, 246, 0.06)' : 'none',
                                position: 'relative',
                                transition: 'all 0.2s',
                                flexShrink: 0
                              }}
                              onMouseOver={e => { if (!isActive) e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                              onMouseOut={e => { if (!isActive) e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.transform = 'translateY(0)'; }}
                            >
                              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                <span style={{ fontSize: '15px', fontWeight: 'bold' }}>Version {i + 1}</span>
                                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '500', marginTop: '4px' }}>
                                  {v.created_at ? (() => {
                                    const d = new Date(v.created_at * 1000);
                                    return `${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} | ${d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`;
                                  })() : ''}
                                </span>
                              </div>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteProject(v.id, e, 'version');
                                }}
                                title="Delete Version"
                                style={{
                                  background: '#fee2e2',
                                  color: '#ef4444',
                                  border: 'none',
                                  borderRadius: '8px',
                                  width: '32px',
                                  height: '32px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                  marginLeft: '12px',
                                  padding: 0,
                                  flexShrink: 0
                                }}
                                onMouseOver={e => { e.currentTarget.style.background = '#fecaca'; e.currentTarget.style.color = '#dc2626'; }}
                                onMouseOut={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#ef4444'; }}
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6"></polyline>
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                              </button>
                            </div>
                          )
                        })}

                        <div
                          onClick={isDuplicating ? undefined : handleDuplicateProject}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '12px 16px',
                            background: '#f8fafc',
                            border: '2px dashed #cbd5e1',
                            borderRadius: '12px',
                            color: '#94a3b8',
                            fontWeight: '600',
                            cursor: isDuplicating ? 'wait' : 'pointer',
                            transition: 'all 0.2s',
                            opacity: isDuplicating ? 0.7 : 1,
                            flexShrink: 0
                          }}
                          onMouseOver={e => { if (!isDuplicating) { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = '#94a3b8'; } }}
                          onMouseOut={e => { if (!isDuplicating) { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = '#cbd5e1'; } }}
                        >
                          {isDuplicating ? (
                            <span style={{ fontSize: '14px' }}>Duplicating...</span>
                          ) : (
                            <>
                              <span style={{ fontSize: '18px', marginRight: '8px' }}>+</span> New Version
                            </>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', marginTop: '24px', flexShrink: 0 }}>
                        <button
                          onClick={() => navigate(`/project/${selectedProject.id}/legacy`)}
                          style={{ background: '#3b82f6', color: 'white', padding: '10px 16px', borderRadius: '8px', border: 'none', fontWeight: '600', cursor: 'pointer', transition: 'background 0.2s', width: '100%' }}
                          onMouseOver={e => e.currentTarget.style.background = '#2563eb'}
                          onMouseOut={e => e.currentTarget.style.background = '#3b82f6'}
                        >
                          Open Project ➔
                        </button>
                      </div>
                    </div>

                    {/* 75% Right Section (Analytics & Notepad) */}
                    <div style={{ flex: '1', padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      {/* Single Progress Bar Graph */}
                      <div style={{ flex: '0 0 auto', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', height: '300px' }}>
                        <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#0f172a' }}>Project Progress Overview</h4>
                        <div style={{ flex: 1, minHeight: 0 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[
                              {
                                name: 'File Uploaded',
                                percent: Math.min(((projectStats?.file_uploaded || 0) / 10) * 100, 100),
                                actual: projectStats?.file_uploaded || 0,
                                target: 10,
                                fill: '#ef4444'
                              },
                              {
                                name: 'Analysis',
                                percent: Math.min(((projectStats?.analysis || 0) / 200) * 100, 100),
                                actual: projectStats?.analysis || 0,
                                target: 200,
                                fill: '#10b981'
                              },
                              {
                                name: 'TC Generated',
                                percent: Math.min(((projectStats?.tc_generated || 0) / 1000) * 100, 100),
                                actual: projectStats?.tc_generated || 0,
                                target: 1000,
                                fill: '#3b82f6'
                              },
                              {
                                name: 'Executed',
                                percent: Math.min(((projectStats?.executed || 0) / 1000) * 100, 100),
                                actual: projectStats?.executed || 0,
                                target: 1000,
                                fill: '#f59e0b'
                              }
                            ]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <XAxis dataKey="name" fontSize={12} axisLine={false} tickLine={false} />
                              <YAxis fontSize={12} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={(val) => `${val}%`} />
                              <Tooltip
                                cursor={{ fill: '#f1f5f9' }}
                                content={({ active, payload, label }) => {
                                  if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    return (
                                      <div style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '8px 12px', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                                        <p style={{ margin: 0, fontWeight: 'bold', color: '#0f172a', fontSize: '13px' }}>{label}</p>
                                        <p style={{ margin: '4px 0 0 0', color: data.fill, fontSize: '13px', fontWeight: '600' }}>
                                          {data.actual} <span style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 'normal' }}>/ {data.target} max</span>
                                        </p>
                                      </div>
                                    );
                                  }
                                  return null;
                                }}
                              />
                              <Bar dataKey="percent" radius={[4, 4, 0, 0]} barSize={50}>
                                <LabelList dataKey="actual" position="top" fill="#64748b" fontSize={12} fontWeight="bold" />
                                {
                                  [
                                    { fill: '#ef4444' },
                                    { fill: '#10b981' },
                                    { fill: '#3b82f6' },
                                    { fill: '#f59e0b' }
                                  ].map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                  ))
                                }
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Note Pad */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <h4 style={{ margin: 0, fontSize: '14px', color: '#334155' }}>Collaborative Notepad</h4>
                          <button
                            onClick={handleSaveNotepad}
                            disabled={isSavingNotepad}
                            style={{
                              background: saveSuccess ? '#10b981' : '#3b82f6',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '4px 12px',
                              fontSize: '12px',
                              fontWeight: '600',
                              cursor: isSavingNotepad ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.2s',
                              opacity: isSavingNotepad ? 0.7 : 1
                            }}
                          >
                            {isSavingNotepad ? 'Saving...' : saveSuccess ? (
                              <>
                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#fff', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 'bold' }}>✓</div>
                                Saved
                              </>
                            ) : 'Save'}
                          </button>
                        </div>
                        <textarea
                          placeholder="Leave instructions or manual prompt notes for team members..."
                          value={notepadContent}
                          onChange={e => {
                            setNotepadContent(e.target.value)
                            setSaveSuccess(false)
                          }}
                          style={{ width: '100%', flex: 1, minHeight: '100px', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', resize: 'vertical', fontSize: '13px', outline: 'none', background: '#f8fafc', color: '#334155', fontFamily: 'inherit' }}
                          onFocus={e => e.target.style.borderColor = '#3b82f6'}
                          onBlur={e => e.target.style.borderColor = '#cbd5e1'}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}