import { useState } from 'react'
import AddNodeForm, { TYPE_ICONS } from './AddNodeForm.jsx'

/**
 * A single tree node rendered recursively.
 * Props:
 *   node        — the node object
 *   childMap    — Map<parent_id, node[]>
 *   selectedId  — currently selected node id
 *   onSelect    — (node) => void
 *   onNodeAdded — (newNode) => void
 *   projectId
 *   depth
 */
function TreeItem({ node, childMap, selectedId, onSelect, onNodeAdded, projectId, depth = 0 }) {
  const [expanded, setExpanded] = useState(true)
  const [addingChild, setAddingChild] = useState(false)
  const children = childMap.get(node.id) || []
  const isSelected = selectedId === node.id
  const hasChildren = children.length > 0

  return (
    <div className="tree-item" style={{ '--depth': depth }}>
      <div
        className={`tree-item-row ${isSelected ? 'selected' : ''}`}
        onClick={() => onSelect(node)}
      >
        {/* Expand / collapse toggle */}
        <button
          className="tree-item-toggle"
          onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}
          style={{ visibility: hasChildren ? 'visible' : 'hidden' }}
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          <span style={{ transform: expanded ? 'rotate(90deg)' : 'none', display: 'inline-block', transition: 'transform 0.15s' }}>▶</span>
        </button>

        {/* Icon */}
        <span className="tree-item-icon">{TYPE_ICONS[node.node_type] || '🔷'}</span>

        {/* Name */}
        <span className="tree-item-name" title={node.name}>{node.name}</span>

        {/* Type badge */}
        <span className={`tree-node-badge tree-node-badge--${node.node_type.toLowerCase()}`}>
          {node.node_type}
        </span>

        {/* Analysis indicator */}
        {node.data && <span className="tree-item-analyzed" title="Has AI analysis">●</span>}

        {/* Add child button */}
        <button
          className="tree-item-add-btn"
          onClick={e => { e.stopPropagation(); setAddingChild(v => !v) }}
          title="Add child node"
          aria-label="Add child node"
        >
          +
        </button>
      </div>

      {/* Inline add form */}
      {addingChild && (
        <div style={{ paddingLeft: `${(depth + 1) * 20 + 28}px` }}>
          <AddNodeForm
            projectId={projectId}
            parentId={node.id}
            onCreated={newNode => { onNodeAdded(newNode); setAddingChild(false) }}
            onCancel={() => setAddingChild(false)}
          />
        </div>
      )}

      {/* Children */}
      {expanded && children.length > 0 && (
        <div className="tree-item-children">
          {children.map(child => (
            <TreeItem
              key={child.id}
              node={child}
              childMap={childMap}
              selectedId={selectedId}
              onSelect={onSelect}
              onNodeAdded={onNodeAdded}
              projectId={projectId}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Middle panel — interactive tree + root project node.
 * Props:
 *   project        — { id, name }
 *   nodes          — flat array of TreeNode
 *   selectedNodeId — string | null
 *   onSelectNode   — (node) => void
 *   onNodeAdded    — (newNode) => void
 */
export default function MiddlePanel({ project, nodes, selectedNodeId, onSelectNode, onNodeAdded }) {
  const [addingRoot, setAddingRoot] = useState(false)

  // Build child map from flat list
  const childMap = new Map()
  for (const node of nodes) {
    const pid = node.parent_id || '__root__'
    if (!childMap.has(pid)) childMap.set(pid, [])
    childMap.get(pid).push(node)
  }

  const rootChildren = childMap.get('__root__') || []

  return (
    <div className="tree-middle-panel">
      <div className="tree-panel-header">
        <h3>Project Tree</h3>
        <span className="tree-node-count">{nodes.length} node{nodes.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="tree-panel-body">
        {/* Root node — the project itself */}
        <div
          className={`tree-root-node ${selectedNodeId === '__project__' ? 'selected' : ''}`}
          onClick={() => onSelectNode({ id: '__project__', name: project.name, node_type: 'Project' })}
        >
          <span className="tree-item-icon">🏗</span>
          <span className="tree-item-name">{project.name}</span>
          <span className="tree-node-badge tree-node-badge--project">Project</span>
          <button
            className="tree-item-add-btn"
            onClick={e => { e.stopPropagation(); setAddingRoot(v => !v) }}
            title="Add top-level node"
          >
            +
          </button>
        </div>

        {/* Add root-level child form */}
        {addingRoot && (
          <div style={{ paddingLeft: '12px' }}>
            <AddNodeForm
              projectId={project.id}
              parentId={null}
              onCreated={newNode => { onNodeAdded(newNode); setAddingRoot(false) }}
              onCancel={() => setAddingRoot(false)}
            />
          </div>
        )}

        {/* Tree */}
        <div className="tree-children">
          {rootChildren.map(node => (
            <TreeItem
              key={node.id}
              node={node}
              childMap={childMap}
              selectedId={selectedNodeId}
              onSelect={onSelectNode}
              onNodeAdded={onNodeAdded}
              projectId={project.id}
              depth={0}
            />
          ))}
          {rootChildren.length === 0 && !addingRoot && (
            <div className="tree-empty-hint">
              <p>Click <strong>+</strong> above to add your first Module or Feature.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
