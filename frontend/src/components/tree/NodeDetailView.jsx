import { useState } from 'react'
import { treeApi } from '../../api/tree.js'

/**
 * Lightweight inline editor for non-Feature leaf nodes (TestCase, Scenario, Requirement, etc.)
 */
export default function NodeDetailView({ node, onClose, onNodeUpdated }) {
  const data = node.data || {}

  const [fields, setFields] = useState({
    description:     data.description     || '',
    steps:           data.steps           || '',
    expected_result: data.expected_result || '',
    priority:        data.priority        || 'Medium',
    status:          data.status          || 'Not Run',
    notes:           data.notes           || '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function set(key, val) {
    setFields(f => ({ ...f, [key]: val }))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const updated = await treeApi.patchNodeData(node.id, fields)
      onNodeUpdated?.(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      console.error('Failed to save node data:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="node-detail-panel">
      <div className="node-detail-header">
        <div>
          <span className="node-detail-type">{node.node_type}</span>
          <h3 className="node-detail-name">{node.name}</h3>
        </div>
        <button className="node-drawer-close" onClick={onClose} aria-label="Close">✕</button>
      </div>

      <div className="node-detail-body">
        <div className="form-field">
          <label>Description</label>
          <textarea rows={2} value={fields.description} onChange={e => set('description', e.target.value)} />
        </div>
        <div className="form-field">
          <label>Steps / Preconditions</label>
          <textarea rows={4} value={fields.steps} onChange={e => set('steps', e.target.value)} placeholder="Step 1&#10;Step 2&#10;Step 3" />
        </div>
        <div className="form-field">
          <label>Expected Result</label>
          <textarea rows={3} value={fields.expected_result} onChange={e => set('expected_result', e.target.value)} />
        </div>
        <div className="form-row-2">
          <div className="form-field">
            <label>Priority</label>
            <select value={fields.priority} onChange={e => set('priority', e.target.value)}>
              {['Critical', 'High', 'Medium', 'Low'].map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label>Status</label>
            <select value={fields.status} onChange={e => set('status', e.target.value)}>
              {['Not Run', 'Pass', 'Fail', 'Blocked', 'Skip'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="form-field">
          <label>Notes</label>
          <textarea rows={2} value={fields.notes} onChange={e => set('notes', e.target.value)} />
        </div>

        <button
          className={`btn btn-primary ${saved ? 'btn-saved' : ''}`}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? <><span className="spinner-small" /> Saving...</> : saved ? '✓ Saved' : 'Save'}
        </button>
      </div>
    </div>
  )
}
