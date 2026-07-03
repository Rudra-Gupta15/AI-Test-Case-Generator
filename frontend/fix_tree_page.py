import re

with open("src/components/tree/TreeBuilderPage.jsx", "r", encoding="utf-8") as f:
    code = f.read()

new_header = """      <header className="tree-builder-nav" style={{ background: '#0f172a', borderBottom: '1px solid #1e293b', padding: '12px 24px', color: '#ffffff' }}>
        <button 
          style={{ background: 'rgba(255,255,255,0.1)', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }} 
          onClick={() => navigate('/projects')}
        >
          <span>?</span> Projects
        </button>
        <div className="tree-builder-nav-center" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '16px', fontWeight: '700', letterSpacing: '0.3px' }}>{project.name}</span>
          {project.domain && <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(99, 102, 241, 0.2)', color: '#a5b4fc', fontWeight: '600' }}>{project.domain}</span>}
          {project.testing_type && <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(59, 130, 246, 0.2)', color: '#93c5fd', fontWeight: '600' }}>{project.testing_type}</span>}
        </div>
        <button 
          style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }} 
          onClick={() => { logout(); navigate('/login') }}
        >
          Sign Out
        </button>
      </header>"""

pattern = r'<header className="tree-builder-nav">.*?</header>'
code = re.sub(pattern, new_header, code, flags=re.DOTALL)

with open("src/components/tree/TreeBuilderPage.jsx", "w", encoding="utf-8") as f:
    f.write(code)

print("TreeBuilderPage nav updated.")
