import re

with open("App.jsx", "r", encoding="utf-8") as f:
    code = f.read()

new_navbar = """
        {/* Project List / Dark Navbar Replacement */}
        <header className="proj-list-header" style={{ position: 'sticky', top: 0, zIndex: 1000 }}>
          <div className="proj-list-brand" onClick={() => navigate('/projects')} style={{ cursor: 'pointer' }}>
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
          <div className="nav-links" style={{ display: 'flex', gap: '10px' }}>
             {/* Keep wizard tabs but style them dark */}
             <button className={`nav-link-btn ${step === 1 ? 'active' : ''}`} style={{ color: 'white' }} onClick={() => setStep(1)}>Dashboard</button>
             <button className={`nav-link-btn ${step === 2 ? 'active' : ''} ${!job?.understanding ? 'disabled' : ''}`} style={{ color: 'white' }} onClick={() => job?.understanding && setStep(2)} disabled={!job?.understanding}>Analysis</button>
             <button className={`nav-link-btn ${step === 3 ? 'active' : ''} ${((submitting && job?.stage === 'generating_tests') || generating) ? 'loading' : !job?.test_report ? 'disabled' : ''}`} style={{ color: 'white' }} onClick={() => { if (submitting) setStep(1); else if (job?.test_report) setStep(3); }} disabled={!job?.test_report && !submitting && !generating}>{((submitting && job?.stage === 'generating_tests') || generating) ? 'Generating...' : 'Test Suite'}</button>
          </div>
          <div className="proj-list-header-right">
            <span className="proj-list-user">
              ?? {currentUser?.login_id || 'User'}
              {currentUser?.role === 'admin' && <span className="proj-admin-badge">Admin</span>}
            </span>
            <button className="btn-ghost btn-ghost--danger" onClick={() => { logout && logout(); navigate('/login') }}>
              Sign Out
            </button>
          </div>
        </header>
"""

old_navbar = """        {/* Floating Capsule Navbar */}
        <div className="floating-navbar-container">
          <div className="floating-navbar">
            <div className="nav-brand" style={{ gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src="/Logo.png" alt="Logo" style={{ height: '24px', width: 'auto', objectFit: 'contain', borderRadius: '4px' }} />
              </div>
              <span className="nav-brand-name" style={{ background: 'linear-gradient(to right, #ffffff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: '800', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>AI QA REVIEWER</span>
            </div>
            <div className="nav-links">
              <button
                className={`nav-link-btn ${step === 1 ? 'active' : ''}`}
                onClick={() => setStep(1)}
              >
                Upload
              </button>
              <button
                className={`nav-link-btn ${step === 2 ? 'active' : ''} ${!job?.understanding ? 'disabled' : ''}`}
                onClick={() => job?.understanding && setStep(2)}
                disabled={!job?.understanding}
              >
                Analysis
              </button>
              <button
                className={`nav-link-btn ${step === 3 ? 'active' : ''} ${((submitting && job?.stage === 'generating_tests') || generating) ? 'loading' : !job?.test_report ? 'disabled' : ''}`}
                onClick={() => {
                  if (submitting) {
                    setStep(1)
                  } else if (job?.test_report) {
                    setStep(3)
                  }
                }}
                disabled={!job?.test_report && !submitting && !generating}
              >
                {((submitting && job?.stage === 'generating_tests') || generating) ? 'Generating...' : 'Test Suite'}
              </button>
              <button
                className={`nav-link-btn ${step === 4 ? 'active' : ''}`}
                onClick={() => setStep(4)}
              >
                History
              </button>
            </div>
            <button className="nav-email-btn" onClick={() => setShowCreateProjectModal(true)}>
              Create Project
            </button>
          </div>
        </div>"""

code = code.replace(new_navbar, old_navbar)
code = code.replace("""<div className="app-sidebar" style={{ display: step === 1 ? 'none' : 'flex' }} """, """<div className="app-sidebar" """)
code = code.replace("""<div className={`app-main-content step-${step}`} style={step === 1 ? { display: 'flex', flexDirection: 'column', backgroundColor: '#111113' } : {}}>""", """<div className={`app-main-content step-${step}`}>""")

with open("App.jsx", "w", encoding="utf-8") as f:
    f.write(code)

print("Undid layout changes.")
