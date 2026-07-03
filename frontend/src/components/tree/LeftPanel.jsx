import { useState } from 'react'
import { treeApi } from '../../api/tree.js'

const DOMAINS = ['Banking', 'Finance', 'Healthcare', 'E-commerce', 'Education',
                 'Insurance', 'Logistics', 'Real Estate', 'Social Media', 'Telecom',
                 'Travel', 'Retail', 'Other']
const TESTING_TYPES = ['Functional', 'Regression', 'Integration', 'Performance',
                       'Security', 'Exploratory', 'UAT', 'Smoke', 'Sanity']
const METHODOLOGIES = ['Agile / Scrum', 'Kanban', 'Waterfall', 'SAFe', 'DevOps', 'Other']

export default function LeftPanel({ project, onProjectUpdated }) {
  const [form, setForm] = useState({
    name: project.name || '',
    description: project.description || '',
    domain: project.domain || '',
    testing_type: project.testing_type || '',
    methodology: project.methodology || '',
    notepad: project.notepad || '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function set(key, val) {
    setForm(f => ({ ...f, [key]: val }))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const { projectsApi } = await import('../../api/projects.js')
      await projectsApi.update(project.id, form)
      onProjectUpdated?.(form)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      console.error('Failed to update project:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="tree-left-panel">
      <div className="tree-panel-header">
        <h3>Project Details</h3>
      </div>
      <div className="tree-panel-body left-panel-body">

        <div className="form-field">
          <label>Project Name</label>
          <input
            type="text"
            value={form.name}
            onChange={e => set('name', e.target.value)}
            maxLength={120}
          />
        </div>

        <div className="form-field">
          <label>Description</label>
          <textarea
            value={form.description}
            onChange={e => set('description', e.target.value)}
            rows={3}
            maxLength={500}
          />
        </div>

        <div className="form-field">
          <label>Domain</label>
          <select value={form.domain} onChange={e => set('domain', e.target.value)}>
            <option value="">Select...</option>
            {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <div className="form-field">
          <label>Testing Type</label>
          <select value={form.testing_type} onChange={e => set('testing_type', e.target.value)}>
            <option value="">Select...</option>
            {TESTING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="form-field">
          <label>Methodology</label>
          <select value={form.methodology} onChange={e => set('methodology', e.target.value)}>
            <option value="">Select...</option>
            {METHODOLOGIES.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div className="form-field">
          <label>Notepad</label>
          <textarea
            value={form.notepad}
            onChange={e => set('notepad', e.target.value)}
            rows={4}
            placeholder="Quick notes, reminders, context..."
          />
        </div>

        <button
          className={`btn btn-primary left-panel-save-btn ${saved ? 'btn-saved' : ''}`}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? <><span className="spinner-small" /> Saving...</> : saved ? '✓ Saved' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
