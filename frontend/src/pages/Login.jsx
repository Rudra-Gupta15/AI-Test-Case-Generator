import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import authService from '../services/authService.js'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [loginId, setLoginId] = useState('admin001')
  const [password, setPassword] = useState('admin')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // async function handleSubmit(e) {
  //   e.preventDefault()
  //   if (!loginId.trim() || !password) return
  //   setError('')
  //   setLoading(true)
  //   try {
  //     const data = await authService.login(loginId.trim(), password)
  //     login(data.access_token, data.user)
  //     if (data.user.role === 'admin') {
  //       navigate('/admin')
  //     } else {
  //       navigate('/projects')
  //     }
  //   } catch (err) {
  //     setError(err.message || 'Login failed. Check your credentials.')
  //   } finally {
  //     setLoading(false)
  //   }
  // }
  async function handleSubmit(e) {
    e.preventDefault();

    // Temporary login (skip backend)
    const fakeUser = {
      id: 1,
      name: "Admin",
      role: "admin",
    };
    login("temporary-token", fakeUser);

    navigate("/admin");
  }

  return (
    <div className="login-page">
      <div className="login-bg-ambient-1" />
      <div className="login-bg-ambient-2" />
      <div className="login-bg-grid" />
      <div className="login-card">
        {/* Logo / brand area */}
        <div className="login-brand">
          <div className="login-logo-container">
            <img src="/Logo.png" alt="QA Intelligence Logo" className="login-logo-img" />
          </div>
          <h1 className="login-title">QA Intelligence</h1>
          <p className="login-subtitle">Sign in to your workspace</p>
        </div>

        {/* Form */}
        <form className="login-form" onSubmit={handleSubmit} autoComplete="off">
          {error && (
            <div className="login-error">
              <span className="login-error-icon">⚠</span>
              {error}
            </div>
          )}

          <div className="login-field">
            <label htmlFor="login-id">Employee / Login ID</label>
            <input
              id="login-id"
              type="text"
              placeholder="e.g. emp001"
              value={loginId}
              onChange={e => setLoginId(e.target.value)}
              autoFocus
              disabled={loading}
              autoComplete="username"
            />
          </div>

          <div className="login-field">
            <label htmlFor="login-password">Password</label>
            <div className="login-password-wrap">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={loading}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="login-eye-btn"
                onClick={() => setShowPassword(v => !v)}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="login-submit-btn"
            disabled={loading || !loginId.trim() || !password}
          >
            {loading ? (
              <><span className="spinner-small" /> Signing in...</>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <p className="login-footer-note">
          No self-signup — accounts are provisioned by your administrator.
        </p>
      </div>
    </div>
  )
}
