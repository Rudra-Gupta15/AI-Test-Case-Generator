import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import client from '../services/client.js'
import { 
  Users, 
  Shield, 
  Power, 
  UserPlus, 
  Trash2, 
  ArrowLeft, 
  LogOut, 
  X, 
  AlertTriangle 
} from 'lucide-react'

export default function Admin() {
  const { currentUser, logout } = useAuth()
  const navigate = useNavigate()

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ login_id: '', password: '', role: 'user' })
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    client.get('/api/admin/users')
      .then(setUsers)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleCreate(e) {
    e.preventDefault()
    if (!createForm.login_id.trim() || !createForm.password) return
    setCreating(true)
    setError('')
    try {
      const newUser = await client.post('/api/admin/users', createForm)
      setUsers(prev => [newUser, ...prev])
      setCreateForm({ login_id: '', password: '', role: 'user' })
      setShowCreate(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  async function toggleActive(user) {
    try {
      const updated = await client.put(`/api/admin/users/${user.id}`, { is_active: !user.is_active })
      setUsers(prev => prev.map(u => u.id === updated.id ? updated : u))
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDelete(userId) {
    if (!confirm('Delete this user? This cannot be undone.')) return
    try {
      await client.delete(`/api/admin/users/${userId}`)
      setUsers(prev => prev.filter(u => u.id !== userId))
    } catch (err) {
      setError(err.message)
    }
  }

  const totalAccounts = users.length
  const activeAdmins = users.filter(u => u.role === 'admin' && u.is_active).length
  const activeUsers = users.filter(u => u.role === 'user' && u.is_active).length

  return (
    <div className="admin-page">
      {/* Header / Navbar */}
      <div className="floating-navbar-container">
        <div className="floating-navbar" style={{ padding: '16px 40px' }}>
          <div className="nav-brand" style={{ gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="/Logo.png" alt="Logo" style={{ height: '28px', width: 'auto', objectFit: 'contain', borderRadius: '4px' }} />
            </div>
            <span className="nav-brand-name" style={{ background: 'linear-gradient(to right, #ffffff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: '800', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>AI QA REVIEWER</span>
            <span style={{ color: '#a78bfa', fontSize: '10px', fontWeight: '800', padding: '2px 8px', borderRadius: '6px', background: 'rgba(167, 139, 250, 0.15)', marginLeft: '8px', border: '1px solid rgba(167, 139, 250, 0.25)', letterSpacing: '0.05em' }}>ADMIN</span>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button className="nav-email-btn" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '8px 16px', display: 'inline-flex', alignItems: 'center', gap: '6px' }} onClick={() => navigate('/projects')}>
              <ArrowLeft size={14} /> Back to Projects
            </button>
            <button className="nav-email-btn" style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '8px 16px', display: 'inline-flex', alignItems: 'center', gap: '6px' }} onClick={() => { logout(); navigate('/login') }}>
              <LogOut size={14} /> Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="admin-content">
        {/* Hero Header */}
        <div className="admin-hero">
          <h1>User Management</h1>
          <p>Create, manage, and configure team member accounts. Only system administrators can access this dashboard.</p>
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#fee2e2', border: '1px solid #fecaca', color: '#b91c1c', padding: '14px 20px', borderRadius: '10px', margin: '0 40px 24px', fontSize: '14px', fontWeight: '500' }}>
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Stats Grid */}
        <div className="admin-stats-grid">
          <div className="admin-stat-card">
            <div className="admin-stat-icon-wrap users">
              <Users size={20} />
            </div>
            <div className="admin-stat-info">
              <span className="admin-stat-label">Total Accounts</span>
              <span className="admin-stat-value">{totalAccounts}</span>
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-icon-wrap admins">
              <Shield size={20} />
            </div>
            <div className="admin-stat-info">
              <span className="admin-stat-label">Admins</span>
              <span className="admin-stat-value">{activeAdmins}</span>
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-icon-wrap active">
              <Power size={20} />
            </div>
            <div className="admin-stat-info">
              <span className="admin-stat-label">Active Users</span>
              <span className="admin-stat-value">{activeUsers}</span>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="admin-toolbar">
          <div className="admin-toolbar-left">
            <Users size={16} style={{ color: '#64748b' }} />
            <span>{totalAccounts} account{totalAccounts !== 1 ? 's' : ''} configured</span>
          </div>
          <button 
            className="admin-btn admin-btn-primary" 
            onClick={() => setShowCreate(true)}
          >
            <UserPlus size={14} /> Create Account
          </button>
        </div>

        {/* Create form modal popup */}
        {showCreate && (
          <div className="admin-modal-overlay" onClick={() => setShowCreate(false)}>
            <div className="admin-create-card" onClick={e => e.stopPropagation()}>
              <h3><UserPlus size={18} style={{ color: '#4f46e5' }} /> New Account</h3>
              <form onSubmit={handleCreate} className="admin-create-form">
                <div className="admin-form-row">
                  <div className="admin-input-group">
                    <label>Login ID / Employee ID</label>
                    <input
                      type="text"
                      placeholder="e.g. emp001"
                      value={createForm.login_id}
                      onChange={e => setCreateForm(f => ({ ...f, login_id: e.target.value }))}
                      autoFocus
                      required
                    />
                  </div>
                  <div className="admin-input-group">
                    <label>Role</label>
                    <select value={createForm.role} onChange={e => setCreateForm(f => ({ ...f, role: e.target.value }))}>
                      <option value="user">User (Standard)</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                </div>
                <div className="admin-input-group">
                  <label>Password</label>
                  <input
                    type="password"
                    placeholder="Enter temporary password"
                    value={createForm.password}
                    onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))}
                    required
                  />
                </div>
                <div className="admin-form-actions">
                  <button type="button" className="admin-btn" onClick={() => setShowCreate(false)}>Cancel</button>
                  <button type="submit" className="admin-btn admin-btn-primary" disabled={creating}>
                    {creating ? 'Creating...' : 'Create Account'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* User table */}
        {loading ? (
          <div className="proj-loading" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: '16px' }}>
            <div className="spinner" />
            <p style={{ color: '#64748b', fontSize: '14px', fontWeight: '500' }}>Loading system accounts...</p>
          </div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Login ID</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className={!u.is_active ? 'admin-row--inactive' : ''}>
                    <td>
                      <div className="admin-user-cell">
                        <div className="admin-avatar">
                          {u.login_id.slice(0, 2)}
                        </div>
                        <span className="admin-user-name">
                          {u.login_id}
                          {u.id === currentUser?.id && <span className="admin-row-you">You</span>}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`admin-badge-role-${u.role}`}>
                        <Shield size={11} /> {u.role}
                      </span>
                    </td>
                    <td>
                      <span className={u.is_active ? 'admin-badge-status-active' : 'admin-badge-status-inactive'}>
                        {u.is_active ? <Power size={11} /> : <X size={11} />} {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ color: '#64748b', fontSize: '13px' }}>
                      {u.created_at ? new Date(u.created_at * 1000).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                    </td>
                    <td>
                      <div className="admin-actions-cell">
                        {u.id !== currentUser?.id && (
                          <>
                            <button
                              className="admin-btn admin-btn-action"
                              onClick={() => toggleActive(u)}
                            >
                              <Power size={12} /> {u.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              className="admin-btn admin-btn-action admin-btn-danger-outline"
                              onClick={() => handleDelete(u.id)}
                            >
                              <Trash2 size={12} /> Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
