import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import projectService from '../../services/projectService.js'
import treeService from '../../services/treeService.js'

const DOMAINS = ['Banking', 'Finance', 'Healthcare', 'E-commerce', 'Education',
                 'Insurance', 'Logistics', 'Real Estate', 'Social Media', 'Telecom',
                 'Travel', 'Retail', 'Other']

const TESTING_TYPES = ['Functional', 'Regression', 'Integration', 'Performance',
                       'Security', 'Exploratory', 'UAT', 'Smoke', 'Sanity']

const METHODOLOGIES = ['Agile / Scrum', 'Kanban', 'Waterfall', 'SAFe', 'DevOps', 'Other']

const NODE_TYPES = ['Module', 'Feature', 'Requirement', 'TestSuite', 'Release', 'Custom']

const VS_ICONS = {
  Module: '📁',
  Feature: '⚡',
  Requirement: '📄',
  TestSuite: '🧪',
  Release: '📦',
  Custom: '⚪'
}

function LocalAddNodeForm({ parentId, onCreated, onCancel }) {
  const [nodeType, setNodeType] = useState('Module')
  const [name, setName] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    onCreated({ node_type: nodeType, name: name.trim(), parent_id: parentId })
  }

  return (
    <form className="add-node-form" onSubmit={handleSubmit} style={{ marginBottom: '8px' }}>
      <div className="add-node-type-row" style={{ flexWrap: 'wrap' }}>
        {NODE_TYPES.map(t => (
          <button
            key={t}
            type="button"
            className={`add-node-type-btn ${nodeType === t ? 'active' : ''}`}
            onClick={() => setNodeType(t)}
            style={{ padding: '4px 8px', fontSize: '11px' }}
          >
            <span>{VS_ICONS[t]}</span>
            <span>{t}</span>
          </button>
        ))}
      </div>
      <div className="add-node-input-row" style={{ marginTop: '8px' }}>
        <input
          type="text"
          placeholder={`${nodeType} name...`}
          value={name}
          onChange={e => setName(e.target.value)}
          autoFocus
          style={{ flex: 1, padding: '4px 6px', fontSize: '13px' }}
        />
        <button type="submit" className="btn btn-primary btn-sm" disabled={!name.trim()}>+ Add</button>
        <button type="button" className="btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

function LocalTreeItem({ node, childMap, onNodeAdded, depth = 0, selectedNodeId, setSelectedNodeId }) {
  const [expanded, setExpanded] = useState(true)
  const [addingChild, setAddingChild] = useState(false)
  const children = childMap.get(node.id) || []
  const hasChildren = children.length > 0
  const isSelected = selectedNodeId === node.id

  return (
    <div className="tree-item" style={{ '--depth': depth }}>
      <div 
        className={`tree-item-row ${isSelected ? 'selected' : ''}`} 
        onClick={(e) => { e.stopPropagation(); setSelectedNodeId(node.id) }}
      >
        <button
          className="tree-item-toggle"
          onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}
          style={{ visibility: hasChildren ? 'visible' : 'hidden' }}
        >
          {expanded ? '▾' : '▸'}
        </button>
        <span className="tree-item-icon">{VS_ICONS[node.node_type] || '⚪'}</span>
        <span className="tree-item-name" title={node.name}>{node.name}</span>
        
        <button
          className="tree-item-add-btn"
          onClick={e => { e.stopPropagation(); setSelectedNodeId(node.id); setAddingChild(v => !v) }}
          title="Add child node"
        >
          +
        </button>
      </div>
      {addingChild && (
        <div style={{ paddingLeft: `32px`, paddingRight: '8px', paddingTop: '4px' }}>
          <LocalAddNodeForm
            parentId={node.id}
            onCreated={(n) => { onNodeAdded(n); setAddingChild(false); setExpanded(true) }}
            onCancel={() => setAddingChild(false)}
          />
        </div>
      )}
      {expanded && children.length > 0 && (
        <div className="tree-item-children">
          {children.map(child => (
            <LocalTreeItem
              key={child.id}
              node={child}
              childMap={childMap}
              onNodeAdded={onNodeAdded}
              depth={depth + 1}
              selectedNodeId={selectedNodeId}
              setSelectedNodeId={setSelectedNodeId}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ReadOnlyTreeItem({ node, childMap, depth = 0, selectedNodeId }) {
  const children = childMap.get(node.id) || []
  const hasChildren = children.length > 0
  const isSelected = selectedNodeId === node.id
  
  // Auto-expand if a child or descendant is selected, else default to true for preview
  const isExpanded = true 

  return (
    <div className="right-tree-item" style={{ '--depth': depth }}>
      <div className={`right-tree-row ${isSelected ? 'selected' : ''}`}>
        <button
          className="tree-item-toggle"
          style={{ visibility: hasChildren ? 'visible' : 'hidden', pointerEvents: 'none' }}
        >
          {isExpanded && hasChildren ? '▾' : '▸'}
        </button>
        <span className="right-tree-icon">{VS_ICONS[node.node_type] || '⚪'}</span>
        <span className="right-tree-name" title={node.name}>{node.name}</span>
      </div>
      {isExpanded && children.length > 0 && (
        <div className="tree-item-children">
          {children.map(child => (
            <ReadOnlyTreeItem
              key={child.id}
              node={child}
              childMap={childMap}
              depth={depth + 1}
              selectedNodeId={selectedNodeId}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function AIChatBox({ onGenerate }) {
  const [prompt, setPrompt] = useState('')
  const [mode, setMode] = useState('append') // 'append' or 'replace'
  const [loading, setLoading] = useState(false)
  
  async function handleSubmit(e) {
    e.preventDefault()
    if (!prompt.trim()) return
    setLoading(true)
    await onGenerate(prompt.trim(), mode)
    setLoading(false)
    setPrompt('')
  }
  
  return (
    <div className="ai-chat-box">
      <h4>✨ AI Tree Generation</h4>
      <textarea
        className="ai-chat-input"
        placeholder="e.g. for login website give me a tree structure"
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        disabled={loading}
      />
      <div className="ai-chat-actions">
        <label className="ai-chat-mode">
          <input 
            type="checkbox" 
            checked={mode === 'replace'} 
            onChange={e => setMode(e.target.checked ? 'replace' : 'append')} 
            disabled={loading}
          />
          Replace existing tree
        </label>
        <button className="btn btn-primary btn-sm" onClick={handleSubmit} disabled={loading || !prompt.trim()}>
          {loading ? 'Generating...' : 'Generate'}
        </button>
      </div>
    </div>
  )
}

export default function NewProjectForm() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    name: 'Authentication Module',
    description: 'This project covers the end-to-end authentication flow including login, signup, and password reset.',
    domain: 'E-commerce',
    testing_type: 'Functional',
    methodology: 'Agile / Scrum',
  })
  
  const [nodes, setNodes] = useState([
    { id: 'temp_1', parent_id: null, node_type: 'Module', name: 'User Authentication' },
    { id: 'temp_2', parent_id: 'temp_1', node_type: 'Feature', name: 'Login Flow' },
    { id: 'temp_3', parent_id: 'temp_1', node_type: 'Feature', name: 'Registration Flow' },
    { id: 'temp_4', parent_id: 'temp_2', node_type: 'Requirement', name: 'Support OAuth (Google/GitHub)' },
  ])
  const [addingRoot, setAddingRoot] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [selectedNodeId, setSelectedNodeId] = useState(null)

  function set(key, val) {
    setForm(f => ({ ...f, [key]: val }))
  }

  function handleAddNode(nodeData) {
    setNodes(prev => [...prev, {
      ...nodeData,
      id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
    }])
  }

  async function handleAIGenerate(promptText, mode) {
    try {
      const { nodes: generatedTree } = await treeService.generateFromPrompt(promptText)
      if (!generatedTree || generatedTree.length === 0) {
        alert("Failed to generate structure or empty response")
        return
      }
      
      const newFlatNodes = []
      function flatten(nodeList, parentId) {
        for (const n of nodeList) {
          const id = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
          newFlatNodes.push({
            id,
            parent_id: parentId,
            node_type: n.node_type || 'Custom',
            name: n.name || 'Untitled'
          })
          if (n.children && Array.isArray(n.children)) {
            flatten(n.children, id)
          }
        }
      }
      flatten(generatedTree, null)
      
      if (mode === 'replace') {
        setNodes(newFlatNodes)
      } else {
        setNodes(prev => [...prev, ...newFlatNodes])
      }
    } catch (err) {
      console.error(err)
      alert("Failed to generate structure")
    }
  }

  async function handleSave(e) {
    if (e) e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    setError('')
    try {
      // 1. Create project
      const project = await projectService.create({
        name: form.name.trim(),
        description: form.description.trim(),
        domain: form.domain,
        testing_type: form.testing_type,
        methodology: form.methodology,
      })

      // 2. Batch create nodes if there are any
      if (nodes.length > 0) {
        // Map local temp IDs to real IDs as they are created
        const idMap = { 'null': null } // parent_id is null for root nodes
        
        for (const node of nodes) {
          const actualParentId = node.parent_id ? idMap[node.parent_id] : null
          const created = await treeService.createNode({
            project_id: project.id,
            parent_id: actualParentId,
            node_type: node.node_type,
            name: node.name
          })
          idMap[node.id] = created.id
        }
      }

      // Navigate to tree builder page with real data
      navigate(`/project/${project.id}/build`)
    } catch (err) {
      setError(err.message || 'Failed to create project')
      setSaving(false)
    }
  }

  // Group nodes by parent
  const childMap = new Map()
  for (const node of nodes) {
    const pid = node.parent_id || '__root__'
    if (!childMap.has(pid)) childMap.set(pid, [])
    childMap.get(pid).push(node)
  }
  const rootChildren = childMap.get('__root__') || []

  return (
    <div className="tree-builder-page">
      <header className="tree-builder-nav">
        <button className="btn-back" onClick={() => navigate('/projects')}>← Projects</button>
        <div className="tree-builder-nav-center">
          <span className="tree-builder-project-name">New Project Setup</span>
        </div>
        <button 
          className="btn btn-primary btn-sm" 
          disabled={saving || !form.name.trim()} 
          onClick={handleSave}
        >
          {saving ? 'Saving...' : 'Create Project →'}
        </button>
      </header>

      <div className="new-proj-3pane" onClick={() => setSelectedNodeId(null)}>
        
        {/* Column 1: Project Details */}
        <div className="new-proj-panel" onClick={e => e.stopPropagation()}>
          <div className="new-proj-panel-header">
            <h3>Project Details</h3>
          </div>
          <div className="new-proj-panel-body" style={{ display: 'flex', flexDirection: 'column' }}>
            <form onSubmit={handleSave} className="new-proj-form">
              {error && (
                <div className="form-error-banner">
                  <span>⚠</span> {error}
                </div>
              )}

              <div className="form-field">
                <label htmlFor="proj-name">Project Name <span className="required">*</span></label>
                <input
                  id="proj-name" type="text"
                  placeholder="e.g. Authentication Module..."
                  value={form.name} onChange={e => set('name', e.target.value)}
                  autoFocus maxLength={120}
                />
              </div>

              <div className="form-field">
                <label htmlFor="proj-desc">Description</label>
                <textarea
                  id="proj-desc" placeholder="Brief overview..."
                  value={form.description} onChange={e => set('description', e.target.value)}
                  rows={3} maxLength={500}
                />
              </div>

              <div className="form-field" style={{ display: 'none' }}>
                <label htmlFor="proj-domain">Domain</label>
                <select id="proj-domain" value={form.domain} onChange={e => set('domain', e.target.value)}>
                  <option value="">Select domain...</option>
                  {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div className="form-field" style={{ display: 'none' }}>
                <label htmlFor="proj-type">Testing Type</label>
                <select id="proj-type" value={form.testing_type} onChange={e => set('testing_type', e.target.value)}>
                  <option value="">Select type...</option>
                  {TESTING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div className="form-field" style={{ display: 'none' }}>
                <label htmlFor="proj-methodology">Methodology</label>
                <select id="proj-methodology" value={form.methodology} onChange={e => set('methodology', e.target.value)}>
                  <option value="">Select methodology...</option>
                  {METHODOLOGIES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </form>
            
            <div style={{ flex: 1 }} />
            <AIChatBox onGenerate={handleAIGenerate} />
          </div>
        </div>

        {/* Column 2: Tree Builder */}
        <div className="new-proj-panel" style={{ borderLeft: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0' }} onClick={e => e.stopPropagation()}>
          <div className="new-proj-panel-header">
            <h3>Tree Builder</h3>
          </div>
          <div className="new-proj-panel-body">
            <div className="tree-middle-panel" style={{ background: 'transparent', height: '100%', border: 'none', padding: 0 }}>
              <div className="tree-panel-body" style={{ padding: 0 }}>
                
                {/* Root node */}
                <div 
                  className={`tree-item-row ${selectedNodeId === 'root' ? 'selected' : ''}`}
                  onClick={() => setSelectedNodeId('root')}
                  style={{ fontWeight: 600, paddingLeft: '8px' }}
                >
                  <button className="tree-item-toggle" style={{ visibility: rootChildren.length > 0 ? 'visible' : 'hidden' }}>▾</button>
                  <span className="tree-item-icon">🏗</span>
                  <span className="tree-item-name">{form.name || 'Untitled Project'}</span>
                  <button
                    className="tree-item-add-btn"
                    onClick={e => { e.stopPropagation(); setSelectedNodeId('root'); setAddingRoot(v => !v) }}
                    title="Add top-level node"
                  >
                    +
                  </button>
                </div>

                {addingRoot && (
                  <div style={{ paddingLeft: '28px', paddingTop: '4px' }}>
                    <LocalAddNodeForm
                      parentId={null}
                      onCreated={newNode => { handleAddNode(newNode); setAddingRoot(false) }}
                      onCancel={() => setAddingRoot(false)}
                    />
                  </div>
                )}

                <div className="tree-item-children" style={{ marginLeft: '12px' }}>
                  {rootChildren.map(node => (
                    <LocalTreeItem
                      key={node.id}
                      node={node}
                      childMap={childMap}
                      onNodeAdded={handleAddNode}
                      depth={0}
                      selectedNodeId={selectedNodeId}
                      setSelectedNodeId={setSelectedNodeId}
                    />
                  ))}
                  {rootChildren.length === 0 && !addingRoot && (
                    <div className="tree-empty-hint" style={{ marginTop: '20px' }}>
                      <p>Click <strong>+</strong> above to add your first Module or Feature.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Column 3: Live Tree Preview */}
        <div className="new-proj-panel" style={{ background: '#f8fafc' }} onClick={e => e.stopPropagation()}>
          <div className="new-proj-panel-header" style={{ background: '#f1f5f9' }}>
            <h3>Live Tree Preview</h3>
          </div>
          <div className="new-proj-panel-body">
            <div className={`right-tree-row ${selectedNodeId === 'root' ? 'selected' : ''}`} style={{ fontWeight: 600, paddingLeft: '8px' }}>
              <button className="tree-item-toggle" style={{ visibility: rootChildren.length > 0 ? 'visible' : 'hidden', pointerEvents: 'none' }}>▾</button>
              <span className="right-tree-icon">🏗</span>
              <span className="right-tree-name">{form.name || 'Untitled Project'}</span>
            </div>
            
            <div className="tree-item-children" style={{ marginLeft: '12px' }}>
              {rootChildren.map(node => (
                <ReadOnlyTreeItem
                  key={node.id}
                  node={node}
                  childMap={childMap}
                  depth={0}
                  selectedNodeId={selectedNodeId}
                />
              ))}
              {rootChildren.length === 0 && (
                <div style={{ color: '#a1a1aa', fontSize: '13px', fontStyle: 'italic', marginTop: '12px', paddingLeft: '16px' }}>
                  (No nodes added yet)
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
