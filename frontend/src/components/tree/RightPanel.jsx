import { useEffect, useState } from 'react'
import { TYPE_ICONS } from './AddNodeForm.jsx'

function RightTreeItem({ node, childMap, selectedId, onSelect, autoExpand }) {
  const children = childMap.get(node.id) || []
  const isSelected = selectedId === node.id
  const hasChildren = children.length > 0
  const [expanded, setExpanded] = useState(autoExpand || isSelected)

  // Auto-expand if selected node is somewhere below
  useEffect(() => {
    if (autoExpand) setExpanded(true)
  }, [autoExpand])

  return (
    <div className="right-tree-item">
      <div
        className={`right-tree-row ${isSelected ? 'selected' : ''}`}
        onClick={() => onSelect(node)}
      >
        {hasChildren && (
          <button
            className="tree-item-toggle"
            onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}
          >
            <span style={{ transform: expanded ? 'rotate(90deg)' : 'none', display: 'inline-block', transition: 'transform 0.15s', fontSize: '9px' }}>▶</span>
          </button>
        )}
        {!hasChildren && <span style={{ width: 20 }} />}
        <span className="right-tree-icon">{TYPE_ICONS[node.node_type] || '🔷'}</span>
        <span className="right-tree-name" title={node.name}>{node.name}</span>
        {node.data && <span className="tree-item-analyzed" title="Analyzed">●</span>}
      </div>
      {expanded && children.length > 0 && (
        <div className="right-tree-children">
          {children.map(child => (
            <RightTreeItem
              key={child.id}
              node={child}
              childMap={childMap}
              selectedId={selectedId}
              onSelect={onSelect}
              autoExpand={autoExpand}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Right panel — read-only orientation tree.
 * Auto-expands to reveal selectedNodeId.
 */
export default function RightPanel({ project, nodes, selectedNodeId, onSelectNode }) {
  const childMap = new Map()
  for (const node of nodes) {
    const pid = node.parent_id || '__root__'
    if (!childMap.has(pid)) childMap.set(pid, [])
    childMap.get(pid).push(node)
  }

  const rootChildren = childMap.get('__root__') || []

  // Build ancestor set for selected node so we auto-expand those paths
  const ancestorIds = new Set()
  if (selectedNodeId) {
    const nodeById = Object.fromEntries(nodes.map(n => [n.id, n]))
    let cur = nodeById[selectedNodeId]
    while (cur?.parent_id) {
      ancestorIds.add(cur.parent_id)
      cur = nodeById[cur.parent_id]
    }
  }

  return (
    <div className="tree-right-panel">
      <div className="tree-panel-header">
        <h3>Outline</h3>
      </div>
      <div className="tree-panel-body">
        {/* Project root */}
        <div
          className={`right-tree-row right-tree-root ${selectedNodeId === '__project__' ? 'selected' : ''}`}
          onClick={() => onSelectNode({ id: '__project__', name: project.name, node_type: 'Project' })}
        >
          <span className="right-tree-icon">🏗</span>
          <span className="right-tree-name">{project.name}</span>
        </div>

        {rootChildren.map(node => (
          <RightTreeItem
            key={node.id}
            node={node}
            childMap={childMap}
            selectedId={selectedNodeId}
            onSelect={onSelectNode}
            autoExpand={ancestorIds.has(node.id) || node.id === selectedNodeId}
          />
        ))}

        {rootChildren.length === 0 && (
          <p className="right-tree-empty">No nodes yet. Start building your tree in the middle panel.</p>
        )}
      </div>
    </div>
  )
}
