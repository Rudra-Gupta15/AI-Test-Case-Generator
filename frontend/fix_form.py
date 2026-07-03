import re

with open("src/components/projects/ProjectListPage.jsx", "r", encoding="utf-8") as f:
    code = f.read()

# Replace the create form
old_form_pattern = r'<div style=\{\{ padding: \'0 24px\', flex: 1, display: \'flex\', flexDirection: \'column\' \}\}>.*?</div>\n\n        <div className="sidebar-bottom">'

new_form = """<div style={{ padding: '0 24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
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
              {creating ? 'Creating...' : 'Create Project ?'}
            </button>
          </form>
        </div>

        <div className="sidebar-bottom">"""

code = re.sub(old_form_pattern, new_form, code, flags=re.DOTALL)

with open("src/components/projects/ProjectListPage.jsx", "w", encoding="utf-8") as f:
    f.write(code)

print("Form styling updated.")
