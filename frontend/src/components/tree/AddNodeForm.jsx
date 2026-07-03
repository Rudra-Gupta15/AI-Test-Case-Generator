import { useState } from 'react'
import treeService from '../../services/treeService.js'

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
      const node = await treeService.createNode({
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
    <form className="vscode-add-form" onSubmit={handleCreate}>
      <select 
        value={nodeType} 
        onChange={e => setNodeType(e.target.value)}
        disabled={saving}
      >
        {NODE_TYPES.map(t => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
      <input
        type="text"
        placeholder="Name..."
        value={name}
        onChange={e => setName(e.target.value)}
        autoFocus
        maxLength={120}
        disabled={saving}
        onKeyDown={e => {
          if (e.key === 'Escape') onCancel()
        }}
      />
      {saving && <span className="spinner-small" style={{width: 12, height: 12, borderTopColor: '#000'}} />}
    </form>
  )
}

export { TYPE_ICONS }
