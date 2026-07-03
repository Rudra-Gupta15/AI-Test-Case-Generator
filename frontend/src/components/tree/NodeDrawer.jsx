import { useState, useRef, useEffect } from 'react'
import Breadcrumb from '../common/Breadcrumb.jsx'
import treeService from '../../services/treeService.js'

const ANALYZE_STAGES = [
  { key: 'parsing_documents', label: 'Parsing Documents' },
  { key: 'fetching_figma',    label: 'Fetching Figma' },
  { key: 'understanding',     label: 'AI Analysis' },
  { key: 'planning_tests',    label: 'Planning Test Suite' },
  { key: 'generating_tests',  label: 'Generating Test Cases' },
  { key: 'finalizing',        label: 'Finalizing Report' },
  { key: 'done',              label: 'Complete' },
]

function StageBar({ stage }) {
  const idx = ANALYZE_STAGES.findIndex(s => s.key === stage)
  const pct = idx < 0 ? 5 : Math.round(((idx + 1) / ANALYZE_STAGES.length) * 100)
  return (
    <div className="nd-progress">
      <div className="nd-progress-bar" style={{ width: `${pct}%` }} />
      <span className="nd-progress-label">
        {ANALYZE_STAGES.find(s => s.key === stage)?.label || 'Processing...'}
      </span>
    </div>
  )
}

/**
 * NodeDrawer — slide-over panel for Feature nodes.
 * Props:
 *   node          — selected TreeNode
 *   breadcrumb    — array of { id, name, onClick? }
 *   onClose       — close the drawer
 *   onNodeUpdated — (updatedNode) => void
 */
export default function NodeDrawer({ node, breadcrumb, onClose, onNodeUpdated }) {
  const [activeTab, setActiveTab] = useState('upload')

  // ── Upload state ──────────────────────────────────────────────────────────
  const [brd, setBrd]     = useState(null)
  const [fsd, setFsd]     = useState(null)
  const [images, setImages] = useState([])
  const [figmaUrl, setFigmaUrl] = useState('')
  const [deep, setDeep]   = useState(false)

  // ── Analysis job state ────────────────────────────────────────────────────
  const [jobId, setJobId] = useState(node.data?.job_id || null)
  const [jobData, setJobData] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const pollRef = useRef(null)

  // ── AI suggest state ──────────────────────────────────────────────────────
  const [suggestions, setSuggestions] = useState(null)
  const [suggesting, setSuggesting] = useState(false)
  const [confirmingSuggestions, setConfirmingSuggestions] = useState(false)
  const [selectedSuggestions, setSelectedSuggestions] = useState([])

  // Resume polling if node already had an active job
  useEffect(() => {
    if (node.data?.job_id && !node.data?.test_report) {
      setJobId(node.data.job_id)
      startPoll(node.data.job_id)
    }
    if (node.data?.test_report) {
      setJobData(node.data)
      setActiveTab('results')
    }
    return () => clearPoll()
  }, [node.id])

  function clearPoll() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }

  function startPoll(jid) {
    clearPoll()
    setAnalyzing(true)
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/job/${jid}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('qa_auth_token')}` }
        })
        const data = await res.json()
        setJobData(data)
        if (data.status === 'done' || data.status === 'error') {
          clearPoll()
          setAnalyzing(false)
          if (data.status === 'done') {
            setActiveTab('results')
            onNodeUpdated?.({ ...node, data: { ...node.data, ...data, job_id: jid } })
          }
        }
      } catch {}
    }, 2500)
  }

  async function handleAnalyze() {
    if (analyzing) return
    const formData = new FormData()
    if (brd) formData.append('brd', brd)
    if (fsd) formData.append('fsd', fsd)
    images.forEach(img => formData.append('images', img))
    if (figmaUrl) formData.append('figma_url', figmaUrl)
    formData.append('deep', String(deep))
    formData.append('node_id', node.id)  // ← key: scoped to this node

    const token = localStorage.getItem('qa_auth_token')
    try {
      setAnalyzing(true)
      setJobData(null)
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      })
      const { job_id } = await res.json()
      setJobId(job_id)
      // Persist job_id in node data so we can resume on re-open
      await treeService.patchNodeData(node.id, { job_id })
      startPoll(job_id)
    } catch (err) {
      setAnalyzing(false)
      console.error('Analyze error:', err)
    }
  }

  // ── AI Suggest Structure ──────────────────────────────────────────────────
  async function handleSuggest() {
    setSuggesting(true)
    try {
      const data = await treeService.suggestStructure(node.id)
      setSuggestions(data.suggestions)
      setSelectedSuggestions(data.suggestions.map((_, i) => i))
      setConfirmingSuggestions(true)
    } catch (err) {
      console.error('Suggest error:', err)
    } finally {
      setSuggesting(false)
    }
  }

  async function handleConfirmSuggestions() {
    if (!suggestions) return
    const toCreate = suggestions
      .filter((_, i) => selectedSuggestions.includes(i))
      .map((s, i) => ({
        project_id: node.project_id,
        parent_id: node.id,
        node_type: s.node_type,
        name: s.name,
        order: i,
      }))
    try {
      const created = await treeService.createNodesBatch(toCreate)
      created.forEach(n => onNodeUpdated?.({ __newNode: n }))
      setConfirmingSuggestions(false)
      setSuggestions(null)
    } catch (err) {
      console.error('Batch create error:', err)
    }
  }

  // ── Test cases from node data ─────────────────────────────────────────────
  const testCases = jobData?.test_report?.test_cases || node.data?.test_report?.test_cases || []
  const understanding = jobData?.understanding || node.data?.understanding

  const currentStage = jobData?.stage || (analyzing ? 'parsing_documents' : null)

  return (
    <div className="node-drawer-overlay" onClick={onClose}>
      <div className="node-drawer" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="node-drawer-header">
          <div className="node-drawer-header-left">
            <Breadcrumb items={breadcrumb} />
            <h2 className="node-drawer-title">
              ⚡ {node.name}
              <span className="node-drawer-type">{node.node_type}</span>
            </h2>
          </div>
          <button className="node-drawer-close" onClick={onClose} aria-label="Close drawer">✕</button>
        </div>

        {/* Tabs */}
        <div className="node-drawer-tabs">
          {[
            { key: 'upload', label: '📤 Upload' },
            { key: 'suggest', label: '🤖 AI Suggest' },
            { key: 'results', label: `📊 Test Cases ${testCases.length > 0 ? `(${testCases.length})` : ''}` },
          ].map(tab => (
            <button
              key={tab.key}
              className={`drawer-tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab body */}
        <div className="node-drawer-body">

          {/* ── Upload Tab ── */}
          {activeTab === 'upload' && (
            <div className="nd-upload-tab">
              <div className="nd-upload-fields">
                <div className="nd-file-field">
                  <label>BRD Document</label>
                  <input type="file" accept=".pdf,.docx,.doc,.txt" onChange={e => setBrd(e.target.files[0] || null)} />
                  {brd && <span className="nd-file-name">{brd.name}</span>}
                </div>
                <div className="nd-file-field">
                  <label>FSD / Spec Document</label>
                  <input type="file" accept=".pdf,.docx,.doc,.txt" onChange={e => setFsd(e.target.files[0] || null)} />
                  {fsd && <span className="nd-file-name">{fsd.name}</span>}
                </div>
                <div className="nd-file-field">
                  <label>Reference Images</label>
                  <input type="file" accept="image/*" multiple onChange={e => setImages(Array.from(e.target.files))} />
                  {images.length > 0 && <span className="nd-file-name">{images.length} image(s) selected</span>}
                </div>
                <div className="nd-file-field">
                  <label>Figma URL</label>
                  <input type="url" placeholder="https://figma.com/file/..." value={figmaUrl} onChange={e => setFigmaUrl(e.target.value)} />
                </div>
                <label className="nd-deep-label">
                  <input type="checkbox" checked={deep} onChange={e => setDeep(e.target.checked)} />
                  Deep Mode (slower, more thorough)
                </label>
              </div>

              {/* Progress */}
              {analyzing && currentStage && <StageBar stage={currentStage} />}
              {jobData?.status === 'error' && (
                <div className="nd-error">Analysis failed: {jobData.error}</div>
              )}

              <button
                className="btn btn-primary nd-analyze-btn"
                onClick={handleAnalyze}
                disabled={analyzing || (!brd && !fsd && images.length === 0 && !figmaUrl)}
              >
                {analyzing ? <><span className="spinner-small" /> Analyzing…</> : '🚀 Run Analysis'}
              </button>

              {testCases.length > 0 && (
                <p className="nd-results-hint">
                  Analysis complete — <button className="link-btn" onClick={() => setActiveTab('results')}>view {testCases.length} test cases →</button>
                </p>
              )}
            </div>
          )}

          {/* ── AI Suggest Tab ── */}
          {activeTab === 'suggest' && (
            <div className="nd-suggest-tab">
              <p className="nd-suggest-intro">
                Let AI propose a standard child node structure for <strong>{node.name}</strong>.
                You can select which ones to create.
              </p>

              {!confirmingSuggestions ? (
                <button
                  className="btn btn-primary"
                  onClick={handleSuggest}
                  disabled={suggesting}
                >
                  {suggesting ? <><span className="spinner-small" /> Generating suggestions…</> : '✨ Suggest Structure'}
                </button>
              ) : (
                <div className="nd-suggestions">
                  <h4>Suggested child nodes:</h4>
                  <div className="nd-suggestions-list">
                    {suggestions.map((s, i) => (
                      <label key={i} className="nd-suggestion-item">
                        <input
                          type="checkbox"
                          checked={selectedSuggestions.includes(i)}
                          onChange={() => setSelectedSuggestions(prev =>
                            prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]
                          )}
                        />
                        <span className="nd-suggestion-type">{s.node_type}</span>
                        <span className="nd-suggestion-name">{s.name}</span>
                      </label>
                    ))}
                  </div>
                  <div className="nd-suggestions-actions">
                    <button className="btn-ghost" onClick={() => { setConfirmingSuggestions(false); setSuggestions(null) }}>
                      Cancel
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={handleConfirmSuggestions}
                      disabled={selectedSuggestions.length === 0}
                    >
                      Create {selectedSuggestions.length} Node{selectedSuggestions.length !== 1 ? 's' : ''}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Results Tab ── */}
          {activeTab === 'results' && (
            <div className="nd-results-tab">
              {testCases.length === 0 ? (
                <div className="nd-results-empty">
                  <div className="nd-results-empty-icon">🧪</div>
                  <p>No test cases yet. Run an analysis in the Upload tab first.</p>
                  <button className="btn btn-primary" onClick={() => setActiveTab('upload')}>
                    Go to Upload →
                  </button>
                </div>
              ) : (
                <>
                  {understanding && (
                    <div className="nd-understanding-banner">
                      <strong>Product:</strong> {understanding.product_type} &nbsp;|&nbsp;
                      <strong>Purpose:</strong> {understanding.purpose}
                    </div>
                  )}
                  <div className="nd-results-summary">
                    <span>{testCases.length} test case{testCases.length !== 1 ? 's' : ''} generated</span>
                  </div>
                  <div className="nd-tc-table-wrap">
                    <table className="nd-tc-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Feature</th>
                          <th>Scenario</th>
                          <th>Priority</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {testCases.map((tc, i) => (
                          <tr key={tc.id || i} className={`nd-tc-row nd-priority-${(tc.priority || '').toLowerCase()}`}>
                            <td className="nd-tc-id">{tc.id}</td>
                            <td>{tc.feature}</td>
                            <td className="nd-tc-scenario">{tc.scenario}</td>
                            <td>
                              <span className={`priority-badge priority-${(tc.priority || '').toLowerCase()}`}>
                                {tc.priority || '—'}
                              </span>
                            </td>
                            <td>
                              <span className={`status-badge status-${(tc.status || 'not-run').toLowerCase().replace(' ', '-')}`}>
                                {tc.status || 'Not Run'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
