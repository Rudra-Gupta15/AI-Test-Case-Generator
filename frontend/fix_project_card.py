import re

with open("src/components/projects/ProjectListPage.jsx", "r", encoding="utf-8") as f:
    code = f.read()

# 1. Update ProjectCard signature and add delete button
old_card_sig = r'function ProjectCard\(\{ project, onClick \}\) \{'
new_card_sig = 'function ProjectCard({ project, onClick, onDelete }) {'
code = re.sub(old_card_sig, new_card_sig, code)

old_meta = r'<div className="proj-card-meta" style=\{\{ display: \'flex\', gap: \'8px\' \}\}>'
new_meta = """<div className="proj-card-meta" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete?.(project.id, e); }}
            style={{ background: 'transparent', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: '4px 6px', borderRadius: '4px', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }}
            onMouseOver={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = '#fef2f2'; }}
            onMouseOut={e => { e.currentTarget.style.color = '#cbd5e1'; e.currentTarget.style.background = 'transparent'; }}
            title="Delete project"
          >
            ???
          </button>"""
code = re.sub(old_meta, new_meta, code)

# 2. Add handleDeleteProject function
handle_create = r'async function handleCreateProject\(e\) \{'
handle_delete = """async function handleDeleteProject(projectId, e) {
    e.stopPropagation()
    if (!window.confirm("Are you sure you want to delete this project? This cannot be undone.")) return
    try {
      await projectsApi.delete(projectId)
      setProjects(prev => prev.filter(p => p.id !== projectId))
    } catch (err) {
      alert("Failed to delete project: " + err.message)
    }
  }

  async function handleCreateProject(e) {"""
code = re.sub(handle_create, handle_delete, code)

# 3. Update mapping to pass onDelete
old_map = r'<ProjectCard key=\{p.id\} project=\{p\} onClick=\{\(\) => handleProjectClick\(p\)\} />'
new_map = '<ProjectCard key={p.id} project={p} onClick={() => handleProjectClick(p)} onDelete={handleDeleteProject} />'
code = re.sub(old_map, new_map, code)


with open("src/components/projects/ProjectListPage.jsx", "w", encoding="utf-8") as f:
    f.write(code)

print("ProjectListPage.jsx updated with delete functionality.")
