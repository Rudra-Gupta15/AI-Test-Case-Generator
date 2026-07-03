import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { projectsApi } from '../../api/projects.js'
import { treeApi } from '../../api/tree.js'
import LeftPanel from './LeftPanel.jsx'
import MiddlePanel from './MiddlePanel.jsx'
import RightPanel from './RightPanel.jsx'
import NodeDrawer from './NodeDrawer.jsx'
import NodeDetailView from './NodeDetailView.jsx'
import { useAuth } from '../../context/AuthContext.jsx'

/**
 * Build an ancestor chain for a node up to (but not including) the project root.
 * Returns array of { id, name } from root → node.
 */
function buildBreadcrumb(nodeId, nodesById, projectName, projectId) {
  const chain = []
  let cur = nodesById[nodeId]
  while (cur) {
    chain.unshift({ id: cur.id, name: cur.name })
    cur = cur.parent_id ? nodesById[cur.parent_id] : null
  }
  return [{ id: projectId, name: projectName }, ...chain]
}

export default function TreeBuilderPage() {
  const { id: projectId } = useParams()
  const navigate = useNavigate()
  const { logout } = useAuth()

  const [project, setProject] = useState(null)
  const [nodes, setNodes] = useState([])
  const [selectedNode, setSelectedNode] = useState(null)  // full node object or {id:'__project__',...}
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Derived: is the Feature drawer open?
  const drawerOpen = selectedNode && selectedNode.node_type === 'Feature'
  // Derived: is the lightweight detail panel open?
  const detailOpen = selectedNode &&
    selectedNode.node_type !== 'Feature' &&
    selectedNode.id !== '__project__'

  useEffect(() => {
    Promise.all([
      projectsApi.get(projectId),
      treeApi.getNodes(projectId),
    ])
      .then(([proj, nodeList]) => {
        setProject(proj)
        setNodes(nodeList)
      })
      .catch(err => {
        if (err.message === 'Unauthorized') return
        setError(err.message)
      })
      .finally(() => setLoading(false))
  }, [projectId])

  function handleSelectNode(node) {
    setSelectedNode(prev => (prev?.id === node.id ? null : node))
  }

  function handleNodeAdded(newNode) {
    // Support both a plain new node and the {__newNode} wrapper from NodeDrawer batch
    if (newNode.__newNode) {
      setNodes(prev => [...prev, newNode.__newNode])
    } else {
      setNodes(prev => [...prev, newNode])
    }
  }

  function handleNodeUpdated(updatedNode) {
    if (updatedNode.__newNode) {
      setNodes(prev => [...prev, updatedNode.__newNode])
      return
    }
    setNodes(prev => prev.map(n => n.id === updatedNode.id ? updatedNode : n))
    // Keep selected node fresh
    if (selectedNode?.id === updatedNode.id) {
      setSelectedNode(updatedNode)
    }
  }

  if (loading) {
    return (
      <div className="tree-loading">
        <div className="spinner" />
        <p>Loading project...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="tree-error">
        <p>Failed to load: {error}</p>
        <button className="btn btn-primary" onClick={() => navigate('/projects')}>← Back to Projects</button>
      </div>
    )
  }

  if (!project) return null

  const nodesById = Object.fromEntries(nodes.map(n => [n.id, n]))
  const breadcrumb = selectedNode && selectedNode.id !== '__project__'
    ? buildBreadcrumb(selectedNode.id, nodesById, project.name, projectId)
    : [{ id: projectId, name: project.name }]

  return (
    <div className="tree-builder-page">
      {/* Top nav */}
            <header className="tree-builder-nav" style={{ background: '#0f172a', borderBottom: '1px solid #1e293b', padding: '12px 24px', color: '#ffffff' }}>
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
      </header>

      {/* 3-panel layout */}
      <div className="tree-builder-panels">
        {/* Left: project details */}
        <LeftPanel
          project={project}
          onProjectUpdated={updated => setProject(p => ({ ...p, ...updated }))}
        />

        {/* Middle: interactive tree */}
        <MiddlePanel
          project={project}
          nodes={nodes}
          selectedNodeId={selectedNode?.id}
          onSelectNode={handleSelectNode}
          onNodeAdded={handleNodeAdded}
        />

        {/* Right: orientation outline */}
        <RightPanel
          project={project}
          nodes={nodes}
          selectedNodeId={selectedNode?.id}
          onSelectNode={handleSelectNode}
        />
      </div>

      {/* Feature drawer (slide-over) */}
      {drawerOpen && (
        <NodeDrawer
          node={selectedNode}
          breadcrumb={breadcrumb}
          onClose={() => setSelectedNode(null)}
          onNodeUpdated={handleNodeUpdated}
        />
      )}

      {/* Lightweight detail panel (inline bottom or side panel) */}
      {detailOpen && (
        <div className="node-detail-overlay">
          <NodeDetailView
            node={selectedNode}
            onClose={() => setSelectedNode(null)}
            onNodeUpdated={handleNodeUpdated}
          />
        </div>
      )}
    </div>
  )
}
