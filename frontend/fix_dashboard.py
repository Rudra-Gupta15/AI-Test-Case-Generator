import re

with open("src/components/projects/ProjectListPage.jsx", "r", encoding="utf-8") as f:
    code = f.read()

create_form_dark = """
        <div style={{ padding: '0 24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '22px', margin: '0 0 8px 0', color: '#ffffff', fontWeight: 'bold' }}>Create Project</h2>
            <p style={{ fontSize: '13px', margin: 0, color: '#94a3b8' }}>Start a new testing workspace.</p>
          </div>
          
          <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '8px' }}>Project Name *</label>
              <input 
                type="text" 
                value={newProjectName} 
                onChange={e => setNewProjectName(e.target.value)}
                placeholder="e.g. Mobile E-commerce App"
                style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '14px', outline: 'none', background: 'rgba(0,0,0,0.2)', color: '#ffffff' }}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '8px' }}>Description</label>
              <textarea 
                value={newProjectDesc} 
                onChange={e => setNewProjectDesc(e.target.value)}
                placeholder="Briefly describe the project..."
                style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '14px', outline: 'none', minHeight: '100px', resize: 'vertical', background: 'rgba(0,0,0,0.2)', color: '#ffffff' }}
              />
            </div>
            <button 
              type="submit" 
              disabled={creating || !newProjectName.trim()}
              style={{ width: '100%', padding: '14px', background: '#3b82f6', color: '#ffffff', borderRadius: '8px', border: 'none', fontSize: '14px', fontWeight: '600', cursor: (creating || !newProjectName.trim()) ? 'not-allowed' : 'pointer', opacity: (creating || !newProjectName.trim()) ? 0.5 : 1, transition: 'all 0.2s', marginTop: '8px' }}
              onMouseOver={e => { if(!creating && newProjectName.trim()) e.currentTarget.style.background = '#2563eb' }}
              onMouseOut={e => { if(!creating && newProjectName.trim()) e.currentTarget.style.background = '#3b82f6' }}
            >
              {creating ? 'Creating...' : 'Create Project ?'}
            </button>
          </form>
        </div>
"""

# Replace the sidebar-middle
sidebar_middle_pattern = r'<div className="sidebar-middle">.*?</div>\n        </div>\n\n        <div className="sidebar-bottom">'
code = re.sub(sidebar_middle_pattern, create_form_dark + '\n        <div className="sidebar-bottom">', code, flags=re.DOTALL)

# Remove the white left column form
left_column_pattern = r'\{\/\* Left Column: Create Project \*\/\}.*?\{\/\* Right Column: Project List \*\/\}'
code = re.sub(left_column_pattern, '{/* Right Column: Project List */}', code, flags=re.DOTALL)

# In the right column, we can remove the flex: 1 wrapper or just let it stretch
code = code.replace("gap: '3rem',", "")
code = code.replace("padding: '0 32px 32px 32px'", "padding: '0 48px 48px 48px'") # more breathing room

with open("src/components/projects/ProjectListPage.jsx", "w", encoding="utf-8") as f:
    f.write(code)

print("Dashboard layout updated.")
