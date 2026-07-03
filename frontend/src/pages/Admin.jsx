import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import client from '../services/client.js'

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

  return (
    <div className="admin-page">
      {/* Header */}
      <header className="proj-list-header">
        <div className="proj-list-brand">
          <svg width="28" height="28" viewBox="0 0 36 36" fill="none">
            <rect width="36" height="36" rx="10" fill="url(#adm-lg)"/>
            <path d="M10 18h16M18 10v16" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            <defs>
              <linearGradient id="adm-lg" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                <stop stopColor="#6366f1"/><stop offset="1" stopColor="#3b82f6"/>
              </linearGradient>
            </defs>
          </svg>
          <span className="proj-list-brand-name">Admin Dashboard</span>
        </div>
        <div className="proj-list-header-right">
          <button className="btn-ghost" onClick={() => navigate('/projects')}>← Projects</button>
          <button className="btn-ghost btn-ghost--danger" onClick={() => { logout(); navigate('/login') }}>
            Sign Out
          </button>
        </div>
      </header>

      <div className="admin-content">
        {/* Hero */}
        <div className="proj-list-hero">
          <h1>User Management</h1>
          <p>Create and manage team accounts. Only admins can access this page.</p>
        </div>

        {error && <div className="form-error-banner"><span>⚠</span> {error}</div>}

        {/* Toolbar */}
        <div className="proj-list-toolbar">
          <span style={{ color: '#64748b', fontSize: '14px' }}>
            {users.length} account{users.length !== 1 ? 's' : ''}
          </span>
          <button className="btn btn-primary" onClick={() => setShowCreate(v => !v)}>
            {showCreate ? '✕ Cancel' : '+ Create Account'}
          </button>
        </div>

        {/* Create form */}
        {showCreate && (
          <div className="admin-create-card">
            <h3>New Account</h3>
            <form onSubmit={handleCreate} className="admin-create-form">
              <div className="form-row-2">
                <div className="form-field">
                  <label>Login ID / Employee ID</label>
                  <input
                    type="text"
                    placeholder="emp001"
                    value={createForm.login_id}
                    onChange={e => setCreateForm(f => ({ ...f, login_id: e.target.value }))}
                    autoFocus
                    required
                  />
                </div>
                <div className="form-field">
                  <label>Role</label>
                  <select value={createForm.role} onChange={e => setCreateForm(f => ({ ...f, role: e.target.value }))}>
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <div className="form-field">
                <label>Password</label>
                <input
                  type="password"
                  placeholder="Temporary password"
                  value={createForm.password}
                  onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))}
                  required
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? <><span className="spinner-small" /> Creating...</> : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* User table */}
        {loading ? (
          <div className="proj-loading"><div className="spinner" /><p>Loading users...</p></div>
        ) : (
          <div className="admin-table-wrap">
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
                    <td className="admin-td-loginid">
                      {u.login_id}
                      {u.id === currentUser?.id && <span className="admin-badge-you">You</span>}
                    </td>
                    <td>
                      <span className={`admin-role-badge admin-role-${u.role}`}>{u.role}</span>
                    </td>
                    <td>
                      <span className={`admin-status-badge ${u.is_active ? 'active' : 'inactive'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ color: '#64748b', fontSize: '13px' }}>
                      {u.created_at ? new Date(u.created_at * 1000).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      <div className="admin-actions">
                        {u.id !== currentUser?.id && (
                          <>
                            <button
                               className="admin-action-btn"
                              onClick={() => toggleActive(u)}
                              title={u.is_active ? 'Deactivate' : 'Activate'}
                            >
                              {u.is_active ? '⏸ Deactivate' : '▶ Activate'}
                            </button>
                            <button
                               className="admin-action-btn admin-action-btn--danger"
                              onClick={() => handleDelete(u.id)}
                              title="Delete user"
                            >
                              🗑 Delete
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
