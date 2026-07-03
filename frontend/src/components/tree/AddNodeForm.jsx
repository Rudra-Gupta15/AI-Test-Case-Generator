import { useState } from 'react'
import { treeApi } from '../../api/tree.js'

const NODE_TYPES = ['Module', 'Feature', 'Requirement', 'TestSuite', 'Release', 'Custom']

const TYPE_ICONS = {
  Module: '📦', Feature: '⚡', Requirement: '📋',
  TestSuite: '🧪', Release: '🚀', Custom: '🔷',
  TestCase: '✅', Scenario: '📝', Defect: '🐛',
}

export default function AddNodeForm({ projectId, parentId, onCreated, onCancel }) {
  const [nodeType, setNodeType] = useState('Module')
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleCreate(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      const node = await treeApi.createNode({
        project_id: projectId,
        parent_id: parentId || null,
        node_type: nodeType,
        name: name.trim(),
      })
      onCreated(node)
    } catch (err) {
      console.error('Failed to create node:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="add-node-form" onSubmit={handleCreate}>
      <div className="add-node-type-row">
        {NODE_TYPES.map(t => (
          <button
            key={t}
            type="button"
            className={`add-node-type-btn ${nodeType === t ? 'active' : ''}`}
            onClick={() => setNodeType(t)}
          >
            <span>{TYPE_ICONS[t]}</span>
            <span>{t}</span>
          </button>
        ))}
      </div>
      <div className="add-node-input-row">
        <input
          type="text"
          placeholder={`${nodeType} name...`}
          value={name}
          onChange={e => setName(e.target.value)}
          autoFocus
          maxLength={120}
        />
        <button type="submit" className="btn btn-primary btn-sm" disabled={!name.trim() || saving}>
          {saving ? <span className="spinner-small" /> : '+ Add'}
        </button>
        <button type="button" className="btn-ghost btn-sm" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}

export { TYPE_ICONS }
