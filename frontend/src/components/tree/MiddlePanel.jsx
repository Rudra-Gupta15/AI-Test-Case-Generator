import { useState } from 'react'
import AddNodeForm from './AddNodeForm.jsx'
import { 
  ChevronRight, ChevronDown, Folder, 
  FileText, Sparkles, Plus, Rocket, 
  TestTube2, Bug, CheckCircle, Component, CircleDot
} from 'lucide-react'

const VSCODE_ICONS = {
  Module: <Folder size={15} fill="#eab308" color="#ca8a04" />,
  Feature: <Sparkles size={15} color="#eab308" />,
  Requirement: <FileText size={15} color="#60a5fa" />,
  TestSuite: <TestTube2 size={15} color="#4ade80" />,
  Release: <Rocket size={15} color="#a78bfa" />,
  Custom: <Component size={15} color="#9ca3af" />,
  TestCase: <CheckCircle size={15} color="#4ade80" />,
  Scenario: <FileText size={15} color="#60a5fa" />,
  Defect: <Bug size={15} color="#f87171" />,
  Project: <Folder size={15} fill="#0ea5e9" color="#0284c7" />
}

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
        className={`vscode-tree-row ${isSelected ? 'selected' : ''}`}
        style={{ paddingLeft: `${depth * 14 + 12}px` }}
        onClick={() => onSelect(node)}
      >
        {/* Indent guides logic - simulated via multiple absolute spans */}
        {Array.from({ length: depth }).map((_, i) => (
          <span key={i} className="vscode-tree-indent-guide" style={{ left: `${i * 14 + 18}px` }} />
        ))}

        {/* Expand / collapse toggle */}
        <div 
          className="vscode-chevron"
          onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}
          style={{ visibility: hasChildren ? 'visible' : 'hidden' }}
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>

        {/* Icon */}
        <span className="vscode-icon">
          {VSCODE_ICONS[node.node_type] || <CircleDot size={15} color="#9ca3af" />}
        </span>

        {/* Name */}
        <span className="vscode-tree-name" title={node.name}>{node.name}</span>

        {/* Type badge (hidden normally in vscode, but let's keep it subtle if we want) */}
        {/* <span className="vscode-tree-badge">{node.node_type}</span> */}

        {/* Add child button */}
        <button
          className="tree-item-add-btn"
          onClick={e => { e.stopPropagation(); setAddingChild(v => !v) }}
          title="Add child node"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Inline add form */}
      {addingChild && (
        <div style={{ paddingLeft: `${(depth + 1) * 14 + 40}px` }}>
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
        <div className="tree-children">
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
          className={`vscode-tree-row ${selectedNodeId === '__project__' ? 'selected' : ''}`}
          style={{ paddingLeft: '12px' }}
          onClick={() => onSelectNode({ id: '__project__', name: project.name, node_type: 'Project' })}
        >
          <div className="vscode-chevron">
            <ChevronDown size={14} />
          </div>
          <span className="vscode-icon">
            {VSCODE_ICONS.Project}
          </span>
          <span className="vscode-tree-name">{project.name}</span>
          <button
            className="tree-item-add-btn"
            onClick={e => { e.stopPropagation(); setAddingRoot(v => !v) }}
            title="Add top-level node"
          >
            <Plus size={14} />
          </button>
        </div>

        {/* Add root-level child form */}
        {addingRoot && (
          <div style={{ paddingLeft: '40px' }}>
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
