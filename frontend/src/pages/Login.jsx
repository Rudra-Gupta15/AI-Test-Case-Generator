import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { Mail, Lock, ArrowRight } from 'lucide-react'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [loginId, setLoginId] = useState('admin001')
  const [password, setPassword] = useState('admin')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    
    setTimeout(() => {
      // Temporary login (skip backend)
      const fakeUser = {
        id: 1,
        name: "Admin",
        role: "admin",
      };
      login("temporary-token", fakeUser);
      navigate("/projects");
    }, 400);
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f8fafc', // Light slate background for contrast
      fontFamily: '"Inter", sans-serif',
      padding: '20px'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        .modern-input::placeholder {
          color: #9ca3af;
          font-weight: 400;
        }
        /* Fix Chrome autofill background so it stays white */
        .modern-input:-webkit-autofill,
        .modern-input:-webkit-autofill:hover, 
        .modern-input:-webkit-autofill:focus, 
        .modern-input:-webkit-autofill:active {
            -webkit-box-shadow: 0 0 0 30px white inset !important;
            -webkit-text-fill-color: #1e293b !important;
            transition: background-color 5000s ease-in-out 0s;
        }
        .modern-btn {
          box-shadow: 0 4px 12px rgba(13, 74, 221, 0.2);
        }
        .modern-btn:hover {
          background-color: #083ab5 !important;
          box-shadow: 0 6px 16px rgba(13, 74, 221, 0.3);
          transform: translateY(-1px);
        }
      `}</style>

      {/* Outer Box Card */}
      <div style={{
        width: '100%',
        maxWidth: '480px',
        padding: '48px 40px',
        backgroundColor: '#ffffff',
        borderRadius: '24px',
        boxShadow: '0 10px 40px -10px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.03)',
        border: '1px solid #f1f5f9',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        {/* Logo */}
        <div style={{ marginBottom: '28px' }}>
          <img src="/logo2.png" alt="Logo" style={{ height: '110px', width: 'auto', objectFit: 'contain' }} />
        </div>

        {/* Header */}
        <h1 style={{
          margin: '0 0 16px 0',
          fontSize: '34px',
          color: '#0d4add',
          fontWeight: '700',
          textAlign: 'center',
          letterSpacing: '-0.02em'
        }}>Sign In</h1>
        
        <p style={{
          margin: '0 0 40px 0',
          fontSize: '15px',
          color: '#64748b',
          textAlign: 'center',
          lineHeight: '1.6',
          maxWidth: '400px',
          fontWeight: '400'
        }}>
          Access your project, collaborate with teams, and manage everything from one dashboard.
        </p>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          
          {/* Email Address */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#475569', fontWeight: '500' }}>
              Email Address
            </label>
            <div style={{
              display: 'flex',
              border: '1px solid #cbd5e1',
              borderRadius: '12px',
              overflow: 'hidden',
              height: '52px',
              backgroundColor: '#ffffff',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
            }}>
              <div style={{
                backgroundColor: '#f8fafc',
                borderRight: '1px solid #f1f5f9',
                width: '60px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Mail size={20} color="#1d4ed8" strokeWidth={1.75} />
              </div>
              <input 
                className="modern-input"
                type="text" 
                placeholder="Enter your email" 
                value={loginId}
                onChange={e => setLoginId(e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  padding: '0 16px',
                  width: '100%',
                  fontSize: '15px',
                  color: '#1e293b',
                  background: 'transparent',
                  fontFamily: 'inherit'
                }}
              />
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#475569', fontWeight: '500' }}>
              Password
            </label>
            <div style={{
              display: 'flex',
              border: '1px solid #cbd5e1',
              borderRadius: '12px',
              overflow: 'hidden',
              height: '52px',
              backgroundColor: '#ffffff',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
            }}>
              <div style={{
                backgroundColor: '#f8fafc',
                borderRight: '1px solid #f1f5f9',
                width: '60px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Lock size={20} color="#1d4ed8" strokeWidth={1.75} />
              </div>
              <input 
                className="modern-input"
                type="password" 
                placeholder="Enter your password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  padding: '0 16px',
                  width: '100%',
                  fontSize: '15px',
                  color: '#1e293b',
                  background: 'transparent',
                  fontFamily: 'inherit'
                }}
              />
            </div>
          </div>

          {/* Remember me & Forgot Password */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input type="checkbox" style={{ marginRight: '8px', width: '16px', height: '16px', cursor: 'pointer', accentColor: '#0d4add' }} />
              <span style={{ fontSize: '14px', color: '#64748b', fontWeight: '400' }}>Remember me</span>
            </label>
            <a href="#" style={{ fontSize: '14px', color: '#0d4add', textDecoration: 'none', fontWeight: '500' }} onClick={(e) => e.preventDefault()}>
              Forget Password?
            </a>
          </div>

          {/* Submit Button */}
          <button 
            className="modern-btn"
            type="submit"
            disabled={loading || !loginId || !password}
            style={{
              width: '100%',
              height: '52px',
              border: 'none',
              borderRadius: '12px',
              backgroundColor: '#0d4add',
              color: 'white',
              fontSize: '16px',
              fontWeight: '600',
              cursor: (loading || !loginId || !password) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              opacity: (loading || !loginId || !password) ? 0.7 : 1,
              transition: 'all 0.2s ease',
              fontFamily: 'inherit'
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
            {!loading && <ArrowRight size={20} strokeWidth={2} />}
          </button>
        </form>
      </div>
    </div>
  )
}
