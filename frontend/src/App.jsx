import { useState, useRef, useEffect } from 'react'

const ANALYZE_STAGES = [
  { key: 'parsing_documents', label: 'Parsing Documents' },
  { key: 'fetching_figma', label: 'Fetching Figma' },
  { key: 'understanding', label: 'AI Analysis' },
  { key: 'generating_tests', label: 'Generating Test Cases' },
  { key: 'done', label: 'Complete' },
]

function FilePreviewer({ file }) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!file) return

    const type = file.name.split('.').pop().toLowerCase()

    if (['txt', 'md', 'json', 'csv'].includes(type)) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setContent(e.target.result)
        setLoading(false)
      }
      reader.onerror = () => {
        setError('Failed to read file')
        setLoading(false)
      }
      reader.readAsText(file)
    } else if (type === 'pdf') {
      const url = URL.createObjectURL(file)
      setContent(url)
      setLoading(false)
    } else if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(type)) {
      const url = URL.createObjectURL(file)
      setContent(url)
      setLoading(false)
    } else if (['docx', 'doc'].includes(type)) {
      const formData = new FormData()
      formData.append('file', file)

      fetch('/api/preview', {
        method: 'POST',
        body: formData,
      })
        .then((res) => {
          if (!res.ok) throw new Error('Failed to extract text from Word document')
          return res.json()
        })
        .then((data) => {
          setContent(data.text)
          setLoading(false)
        })
        .catch((err) => {
          setError(err.message)
          setLoading(false)
        })
    } else {
      setError('Unsupported file type for preview')
      setLoading(false)
    }
  }, [file])

  if (loading) return <div className="preview-loading">Reading document...</div>
  if (error) return <div className="preview-error">{error}</div>

  const type = file.name.split('.').pop().toLowerCase()

  if (['txt', 'md', 'json', 'csv', 'docx', 'doc'].includes(type)) {
    return <pre className="preview-text-content">{content}</pre>
  }

  if (type === 'pdf') {
    return (
      <iframe
        src={content}
        title="PDF Preview"
        width="100%"
        height="100%"
        style={{ border: 'none' }}
      />
    )
  }

  if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(type)) {
    return (
      <div className="preview-image-container">
        <img src={content} alt={file.name} className="preview-image-element" />
      </div>
    )
  }

  return null
}

function ImageThumbnail({ file }) {
  const [src, setSrc] = useState('')

  useEffect(() => {
    if (!file) return
    const url = URL.createObjectURL(file)
    setSrc(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  if (!src) return <div className="image-thumbnail-placeholder" />

  return <img src={src} alt={file.name} className="image-thumbnail-src" />
}

import mermaid from 'mermaid'

// Initialize Mermaid outside the component with a premium monochrome style
mermaid.initialize({
  startOnLoad: false,
  theme: 'base',
  themeVariables: {
    background: '#ffffff',
    primaryColor: '#f4f4f5',
    primaryTextColor: '#111113',
    lineColor: '#a1a1aa',
    secondaryColor: '#ffffff',
    tertiaryColor: '#ffffff',
    nodeBorder: '#e4e4e7',
    mainBkg: '#f4f4f5',
  },
  securityLevel: 'loose',
  flowchart: {
    useMaxWidth: false,
    htmlLabels: true,
    padding: 12
  }
})

let uniqueIdCounter = 0;

function Mermaid({ chart }) {
  const containerRef = useRef(null)
  const [svg, setSvg] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!chart) return

    const renderChart = async () => {
      try {
        setError(null)
        const id = `mermaid-${++uniqueIdCounter}`
        if (containerRef.current) {
          containerRef.current.innerHTML = ''
        }
        const { svg: renderedSvg } = await mermaid.render(id, chart)
        setSvg(renderedSvg)
      } catch (err) {
        console.error('Mermaid render error:', err)
        setError(err)
      }
    }

    renderChart()
  }, [chart])

  useEffect(() => {
    if (svg && containerRef.current) {
      const svgEl = containerRef.current.querySelector('svg')
      if (svgEl) {
        const viewBox = svgEl.getAttribute('viewBox')
        if (viewBox) {
          const parts = viewBox.split(' ')
          if (parts.length === 4) {
            const width = parseFloat(parts[2])
            // Set the SVG width to its native viewBox width to prevent shrinking
            svgEl.style.width = `${width}px`
            svgEl.style.maxWidth = 'none'
            svgEl.style.height = 'auto'
          }
        }
      }
    }
  }, [svg])

  if (error) {
    return <pre style={{ fontSize: '12px', color: '#ef4444' }}>Error rendering flow diagram</pre>
  }

  return (
    <div
      className="mermaid-chart-container"
      dangerouslySetInnerHTML={{ __html: svg }}
      ref={containerRef}
      style={{ display: 'flex', justifyContent: 'flex-start', width: '100%' }}
    />
  )
}

export default function App() {
  // Input states
  const [brd, setBrd] = useState(null)
  const [fsd, setFsd] = useState(null)
  const [images, setImages] = useState([])
  const [figmaUrl, setFigmaUrl] = useState('')
  const [figmaToken, setFigmaToken] = useState('')
  const [deep, setDeep] = useState(false)

  // Job & UI states
  const [job, setJob] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [userPrompt, setUserPrompt] = useState('')
  const [generating, setGenerating] = useState(false)
  const [step, setStep] = useState(1) // 1 = Upload, 2 = Analysis, 3 = Test Report
  const [activeTab, setActiveTab] = useState('features') // Step 2 active tab
  const [previewFile, setPreviewFile] = useState(null) // Document preview state
  const [showPersonalizeModal, setShowPersonalizeModal] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const pollRef = useRef(null)

  useEffect(() => {
    let interval
    if (submitting) {
      setElapsedTime(0)
      interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1)
      }, 1000)
    } else {
      setElapsedTime(0)
    }
    return () => clearInterval(interval)
  }, [submitting])

  const getStageProgress = (stage) => {
    switch (stage) {
      case 'parsing_documents':
        return { percent: 25, est: 'Est. remaining: ~45s' }
      case 'fetching_figma':
        return { percent: 50, est: 'Est. remaining: ~35s' }
      case 'understanding':
        return { percent: 75, est: 'Est. remaining: ~20s' }
      case 'generating_tests':
        return { percent: 90, est: 'Est. remaining: ~5s' }
      case 'done':
        return { percent: 100, est: 'Wrapping up...' }
      default:
        return { percent: 10, est: 'Est. remaining: ~60s' }
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Step 3 (Report) states
  const [reportFilter, setReportFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedCases, setExpandedCases] = useState({})
  const [checkedSteps, setCheckedSteps] = useState({})

  const startAnalysis = async () => {
    setSubmitting(true)
    setJob(null)

    const formData = new FormData()
    if (brd) formData.append('brd', brd)
    if (fsd) formData.append('fsd', fsd)
    images.forEach((img) => formData.append('images', img))
    if (figmaUrl) formData.append('figma_url', figmaUrl)
    if (figmaToken) formData.append('figma_token', figmaToken)
    formData.append('deep', deep)

    try {
      const res = await fetch('/api/analyze', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) {
        setJob({ status: 'error', error: data.detail || 'Failed to start analysis' })
        setSubmitting(false)
        return
      }
      pollJob(data.job_id)
    } catch (e) {
      setJob({ status: 'error', error: String(e) })
      setSubmitting(false)
    }
  }

  const pollJob = (jobId) => {
    clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      const res = await fetch(`/api/job/${jobId}`)
      const data = await res.json()
      setJob(data)
      if (data.status === 'awaiting_prompt' || data.status === 'error' || (data.status === 'done' && data.test_report)) {
        clearInterval(pollRef.current)
        setSubmitting(false)
        setGenerating(false)

        if (data.status === 'awaiting_prompt') {
          setStep(2)
          setActiveTab('features')
        } else if (data.status === 'done' && data.test_report) {
          setStep(3)
          setReportFilter('All')
          setSearchQuery('')
          setExpandedCases({})
        }
      }
    }, 1500)
  }

  const generateTests = async () => {
    setGenerating(true)
    try {
      const res = await fetch('/api/generate-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: job.id, user_prompt: userPrompt, deep }),
      })
      const data = await res.json()
      if (!res.ok) {
        setJob({ ...job, status: 'error', error: data.detail })
        setGenerating(false)
        return
      }
      pollJob(data.job_id)
    } catch (e) {
      setGenerating(false)
    }
  }

  const resetApp = () => {
    setJob(null)
    setBrd(null)
    setFsd(null)
    setImages([])
    setFigmaUrl('')
    setFigmaToken('')
    setUserPrompt('')
    setStep(1)
  }

  // Helper calculations
  const stageIndex = job ? ANALYZE_STAGES.findIndex((s) => s.key === job.stage) : -1
  const showAnalyzeRail = submitting && job && !job.understanding

  // Step 2 counts
  const featuresCount = job?.understanding?.features?.length || 0
  const flowsCount = job?.understanding?.flows?.length || 0
  const inconsistenciesCount = job?.understanding?.inconsistencies?.length || 0
  const gapsCount = job?.understanding?.gaps?.length || 0
  const totalIssues = inconsistenciesCount + gapsCount

  // Step 3 calculations
  const cases = job?.test_report?.test_cases || []
  const categories = ['All', ...new Set(cases.map((c) => c.category))]
  const filteredCases = cases.filter((tc) => {
    const matchesCategory = reportFilter === 'All' || tc.category === reportFilter
    const matchesSearch =
      (tc.scenario && tc.scenario.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (tc.description && tc.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      tc.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tc.steps?.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (tc.expected_result && tc.expected_result.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesCategory && matchesSearch
  })

  const totalCount = cases.length
  const p0Count = cases.filter((c) => c.priority === 'P0').length
  const p1Count = cases.filter((c) => c.priority === 'P1').length
  const p2Count = cases.filter((c) => c.priority === 'P2').length
  const p3Count = cases.filter((c) => c.priority === 'P3').length

  const toggleExpand = (id) => {
    setExpandedCases((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const toggleAll = (expand) => {
    const next = {}
    if (expand) {
      cases.forEach((c) => { next[c.id] = true })
    }
    setExpandedCases(next)
  }

  const toggleStep = (e, caseId, stepIdx) => {
    e.stopPropagation()
    const key = `${caseId}-${stepIdx}`
    setCheckedSteps((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const copyMarkdown = (e, tc) => {
    e.stopPropagation()
    const md = `### ${tc.id}: ${tc.scenario}
**Description:** ${tc.description}
**Category:** ${tc.category} | **Priority:** ${tc.priority} | **Severity:** ${tc.severity}
**Precondition:** ${tc.precondition || 'None'}
**Steps:**
${tc.steps?.map((s) => `${s}`).join('\n')}

**Test Data:** \`${tc.test_data || 'None'}\`
**Expected Result:** ${tc.expected_result}
**Postcondition:** ${tc.postcondition || 'None'}`

    navigator.clipboard.writeText(md)
    alert(`Copied ${tc.id} to clipboard as Markdown!`)
  }

  const exportCSV = () => {
    const headers = [
      'Test Case ID',
      'Category',
      'Test Scenario',
      'Test Case Description',
      'Precondition',
      'Test Steps',
      'Test Data',
      'Expected Result',
      'Actual Result',
      'Postcondition',
      'Status',
      'Severity',
      'Priority',
      'Executed By'
    ]
    const rows = cases.map((tc) => [
      tc.id,
      tc.category || '',
      tc.scenario || '',
      tc.description || '',
      tc.precondition || '',
      tc.steps?.join('\n') || '',
      tc.test_data || '',
      tc.expected_result || '',
      tc.actual_result || '',
      tc.postcondition || '',
      tc.status || '',
      tc.severity || '',
      tc.priority || '',
      tc.executed_by || ''
    ])

    const csvContent = "data:text/csv;charset=utf-8,"
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", "test_suite.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className={`app-window step-${step}`}>
      {/* ================= LEFT SIDEBAR (Dark Black Theme) ================= */}
      <div className="app-sidebar">
        <div className="sidebar-top">
          <div className="brand-header">
            <span className="brand-icon">▤</span>
            <span className="brand-name">AI QA REVIEWER</span>
          </div>


        </div>

        {/* Step-Specific Sidebar Content */}
        <div className="sidebar-middle">
          {step === 1 && (
            <div className="sidebar-hero-content">
              <h1>Upload your specs.<br />Get a test plan.</h1>

              {/* Visual Pipeline */}
              <div className="sidebar-pipeline">
                <div className="pipeline-node">
                  <span className="node-icon">📥</span>
                  <span className="node-text">Inputs</span>
                </div>
                <div className="pipeline-arrow">➔</div>
                <div className="pipeline-node active">
                  <span className="node-icon">🧠</span>
                  <span className="node-text">AI Analysis</span>
                </div>
                <div className="pipeline-arrow">➔</div>
                <div className="pipeline-node">
                  <span className="node-icon">📋</span>
                  <span className="node-text">Test Plan</span>
                </div>
              </div>

              {/* Feature Grid */}
              <div className="sidebar-features-grid">
                <div className="sidebar-feature-item">
                  <span className="feature-item-icon">📄</span>
                  <div className="feature-item-info">
                    <strong>Specs & Docs</strong>
                    <span>Parses BRD & FSD requirements</span>
                  </div>
                </div>
                <div className="sidebar-feature-item">
                  <span className="feature-item-icon">🖼️</span>
                  <div className="feature-item-info">
                    <strong>UI & Figma</strong>
                    <span>Reads mockups & Figma layers</span>
                  </div>
                </div>
                <div className="sidebar-feature-item">
                  <span className="feature-item-icon">🔍</span>
                  <div className="feature-item-info">
                    <strong>Gap Analysis</strong>
                    <span>Flags document contradictions</span>
                  </div>
                </div>
                <div className="sidebar-feature-item">
                  <span className="feature-item-icon">⚡</span>
                  <div className="feature-item-info">
                    <strong>Test Suite</strong>
                    <span>Generates P0–P3 test cases</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && job?.understanding && (
            <div className="sidebar-analysis-controls">
              <div className="overview-card-sidebar">
                <div className="product-badge-sidebar">Product Overview</div>
                <h3 className="product-type-sidebar">{job.understanding.product_type}</h3>
                <p className="product-purpose-sidebar">{job.understanding.purpose}</p>
              </div>

              <div className="stats-grid-sidebar">
                <div className={`stat-card-sidebar ${activeTab === 'features' ? 'active' : ''}`} onClick={() => setActiveTab('features')}>
                  <span className="stat-num-sidebar">{featuresCount}</span>
                  <span className="stat-label-sidebar">Features</span>
                </div>
                <div className={`stat-card-sidebar ${activeTab === 'flows' ? 'active' : ''}`} onClick={() => setActiveTab('flows')}>
                  <span className="stat-num-sidebar">{flowsCount}</span>
                  <span className="stat-label-sidebar">Flows</span>
                </div>
                <div className={`stat-card-sidebar ${activeTab === 'issues' ? 'active' : ''}`} onClick={() => setActiveTab('issues')}>
                  <span className={`stat-num-sidebar ${totalIssues > 0 ? 'alert' : ''}`}>{totalIssues}</span>
                  <span className="stat-label-sidebar">Issues</span>
                </div>
              </div>


            </div>
          )}

          {step === 3 && job?.test_report && (
            <div className="sidebar-report-controls">
              <div className="sidebar-metrics-list">
                <div className="metric-row-sidebar total">
                  <span>Total Cases</span>
                  <strong>{totalCount}</strong>
                </div>
                <div className="metric-row-sidebar p0">
                  <span>P0 - Critical</span>
                  <strong>{p0Count}</strong>
                </div>
                <div className="metric-row-sidebar p1">
                  <span>P1 - High</span>
                  <strong>{p1Count}</strong>
                </div>
                <div className="metric-row-sidebar p2">
                  <span>P2 - Medium</span>
                  <strong>{p2Count}</strong>
                </div>
                <div className="metric-row-sidebar p3">
                  <span>P3 - Low</span>
                  <strong>{p3Count}</strong>
                </div>
              </div>

              <div className="sidebar-actions-box">
                <button className="sidebar-btn-monochrome expand-all" onClick={() => toggleAll(true)}>
                  Expand All
                </button>
                <button className="sidebar-btn-monochrome collapse-all" onClick={() => toggleAll(false)}>
                  Collapse All
                </button>
                <button className="sidebar-btn-monochrome export" onClick={exportCSV}>
                  📥 Export CSV
                </button>
                <button className="sidebar-btn-monochrome reset" onClick={resetApp}>
                  🔄 Start New Project
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="sidebar-bottom">
          <span className="help-icon">❔</span> Help & Documentation
        </div>
      </div>

      <div className={`app-main-content step-${step}`}>
        {/* Floating Capsule Navbar */}
        <div className="floating-navbar-container">
          <div className="floating-navbar">
            <div className="nav-brand">
              <div className="nav-logo-circle">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#111113' }}>
                  <rect x="4" y="4" width="16" height="16" rx="1" />
                  <line x1="8" y1="9" x2="16" y2="9" />
                  <line x1="8" y1="13" x2="16" y2="13" />
                  <line x1="8" y1="17" x2="16" y2="17" />
                </svg>
              </div>
              <span className="nav-brand-name">AI QA REVIEWER</span>
            </div>
            <div className="nav-links">
              <button
                className={`nav-link-btn ${step === 1 ? 'active' : ''}`}
                onClick={() => setStep(1)}
              >
                Upload
              </button>
              <button
                className={`nav-link-btn ${step === 2 ? 'active' : ''} ${!job?.understanding ? 'disabled' : ''}`}
                onClick={() => job?.understanding && setStep(2)}
                disabled={!job?.understanding}
              >
                Analysis
              </button>
              <button
                className={`nav-link-btn ${step === 3 ? 'active' : ''} ${((submitting && job?.stage === 'generating_tests') || generating) ? 'loading' : !job?.test_report ? 'disabled' : ''}`}
                onClick={() => {
                  if (submitting) {
                    setStep(1)
                  } else if (job?.test_report) {
                    setStep(3)
                  }
                }}
                disabled={!job?.test_report && !submitting && !generating}
              >
                {((submitting && job?.stage === 'generating_tests') || generating) ? 'Generating...' : 'Test Suite'}
              </button>
            </div>
            <button className="nav-email-btn" onClick={resetApp}>
              New Project
            </button>
          </div>
        </div>

        {/* Step 1: Upload Main Content */}
        {step === 1 && (
          <div className="main-step-container">
            <div className="main-step-header">
              <h2>1. Upload Specifications</h2>
              <p>Provide your product documents and design references below. You can analyze using any single document or design reference.</p>
            </div>

            {submitting ? (
              <div className="loading-card-container">
                <div className="loading-card-inner">
                  <div className="spinner-large" />
                  <h3 className="loading-title">Analyzing & Generating Test Suite</h3>
                  <p className="loading-subtitle">
                    Please wait while the AI parses your specifications and builds the test suite.
                  </p>

                  <div className="progress-bar-container">
                    <div className="progress-bar-fill" style={{ width: `${getStageProgress(job?.stage).percent}%` }} />
                  </div>

                  <div className="loading-status-row">
                    <span className="loading-stage-text">
                      Current Stage: <strong>{ANALYZE_STAGES.find(s => s.key === job?.stage)?.label || 'Preparing...'}</strong>
                    </span>
                    <span className="loading-percentage">{getStageProgress(job?.stage).percent}%</span>
                  </div>

                  <div className="loading-time-row">
                    <span>Elapsed: <strong>{formatTime(elapsedTime)}</strong></span>
                    <span>{getStageProgress(job?.stage).est}</span>
                  </div>

                  <div className="loading-stages-list">
                    {ANALYZE_STAGES.filter(s => s.key !== 'done').map((s, i) => {
                      const isDone = stageIndex > i
                      const isActive = job?.stage === s.key
                      return (
                        <div key={s.key} className={`loading-stage-item ${isDone ? 'done' : ''} ${isActive ? 'active' : ''}`}>
                          <span className="stage-dot">{isDone ? '✓' : ''}</span>
                          <span className="stage-label">{s.label}</span>
                          {isActive && <span className="stage-pulse-text">Processing...</span>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="upload-inputs-container">
                <div className="upload-grid">
                  <div className="upload-box-enhanced">
                    <label className="upload-label-title">BRD (Business Requirements Doc)</label>
                    {brd ? (
                      <div className="file-selected-card">
                        <button className="remove-file-btn" onClick={() => setBrd(null)} type="button">✕</button>
                        <div className="file-info">
                          <span className="file-icon">📄</span>
                          <span className="file-name-text">{brd.name}</span>
                        </div>
                        <button className="view-file-btn" onClick={() => setPreviewFile(brd)} type="button">
                          👁 View Document
                        </button>
                      </div>
                    ) : (
                      <label className="drag-drop-zone">
                        <input
                          type="file"
                          accept=".pdf,.docx,.doc,.txt,.md"
                          onChange={(e) => setBrd(e.target.files[0])}
                          className="hidden-file-input"
                        />
                        <span className="upload-zone-icon">📁</span>
                        <span className="upload-zone-text">Choose BRD file</span>
                        <span className="upload-zone-sub">PDF, DOCX, TXT, MD</span>
                      </label>
                    )}
                  </div>

                  <div className="upload-box-enhanced">
                    <label className="upload-label-title">FSD (Functional Spec Doc)</label>
                    {fsd ? (
                      <div className="file-selected-card">
                        <button className="remove-file-btn" onClick={() => setFsd(null)} type="button">✕</button>
                        <div className="file-info">
                          <span className="file-icon">📄</span>
                          <span className="file-name-text">{fsd.name}</span>
                        </div>
                        <button className="view-file-btn" onClick={() => setPreviewFile(fsd)} type="button">
                          👁 View Document
                        </button>
                      </div>
                    ) : (
                      <label className="drag-drop-zone">
                        <input
                          type="file"
                          accept=".pdf,.docx,.doc,.txt,.md"
                          onChange={(e) => setFsd(e.target.files[0])}
                          className="hidden-file-input"
                        />
                        <span className="upload-zone-icon">📁</span>
                        <span className="upload-zone-text">Choose FSD file</span>
                        <span className="upload-zone-sub">PDF, DOCX, TXT, MD</span>
                      </label>
                    )}
                  </div>
                </div>

                <div className="upload-box-enhanced full-width">
                  <label className="upload-label-title">Reference Figma Mockups (Optional)</label>
                  {images.length > 0 ? (
                    <div className="images-selected-container">
                      <div className="images-grid-preview">
                        {images.map((img, index) => (
                          <div key={index} className="image-preview-thumbnail">
                            <button
                              type="button"
                              className="remove-img-btn"
                              onClick={() => setImages(images.filter((_, i) => i !== index))}
                            >
                              ✕
                            </button>
                            <ImageThumbnail file={img} />
                            <span className="image-name-text">{img.name}</span>
                          </div>
                        ))}
                      </div>
                      <label className="add-more-images-btn">
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={(e) => setImages([...images, ...Array.from(e.target.files)])}
                          className="hidden-file-input"
                        />
                        + Add More
                      </label>
                    </div>
                  ) : (
                    <label className="drag-drop-zone">
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => setImages(Array.from(e.target.files))}
                        className="hidden-file-input"
                      />
                      <span className="upload-zone-icon">🖼️</span>
                      <span className="upload-zone-text">Choose reference images</span>
                      <span className="upload-zone-sub">PNG, JPG, WEBP (multiple allowed)</span>
                    </label>
                  )}
                </div>

                <div className="text-fields-grid">
                  <div>
                    <label className="field-label">Figma file URL</label>
                    <input
                      type="text"
                      placeholder="https://www.figma.com/design/abc123/My-Project"
                      value={figmaUrl}
                      onChange={(e) => setFigmaUrl(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="field-label">Figma API token (optional)</label>
                    <input
                      type="text"
                      placeholder="figd_..."
                      value={figmaToken}
                      onChange={(e) => setFigmaToken(e.target.value)}
                    />
                  </div>
                </div>

                <div className="toggle-row">
                  <input type="checkbox" id="deep" checked={deep} onChange={(e) => setDeep(e.target.checked)} />
                  <label htmlFor="deep">Deep mode (gpt-oss:120b — slower, more thorough, text-only)</label>
                </div>

                <button
                  className="primary-monochrome-btn"
                  onClick={startAnalysis}
                  disabled={submitting || (!brd && !fsd && images.length === 0 && !figmaUrl)}
                >
                  {submitting ? 'Analyzing…' : 'Analyze Documents'}
                </button>

                {job?.status === 'error' && <div className="error-banner" style={{ marginTop: 24 }}>{job.error}</div>}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Analysis Main Content */}
        {step === 2 && job?.understanding && (
          <div className="main-step-container">
            <div className="main-step-header">
              <h2>2. Requirements Analysis</h2>
              <p>Review the identified features, user flows, and inconsistencies.</p>
            </div>

            <div className="details-panel-monochrome">
              <div className="tabs-header-monochrome">
                <button
                  className={`tab-btn-monochrome ${activeTab === 'features' ? 'active' : ''}`}
                  onClick={() => setActiveTab('features')}
                >
                  📋 Features <span className="tab-count-monochrome">{featuresCount}</span>
                </button>
                <button
                  className={`tab-btn-monochrome ${activeTab === 'flows' ? 'active' : ''}`}
                  onClick={() => setActiveTab('flows')}
                >
                  🔄 User Flows <span className="tab-count-monochrome">{flowsCount}</span>
                </button>
                <button
                  className={`tab-btn-monochrome ${activeTab === 'issues' ? 'active' : ''}`}
                  onClick={() => setActiveTab('issues')}
                >
                  ⚠ Issues & Gaps <span className="tab-count-monochrome">{totalIssues}</span>
                </button>
              </div>

              <div className="tab-content-monochrome">
                {activeTab === 'features' && (
                  <div className="features-tab">
                    {featuresCount === 0 ? (
                      <div className="empty-state-monochrome">No features identified.</div>
                    ) : (
                      <div className="features-grid-monochrome">
                        {job.understanding.features.map((f, i) => (
                          <div key={i} className="feature-card-monochrome">
                            <div className="feature-card-header-monochrome">
                              <span className={`source-badge-monochrome ${f.source.toLowerCase()}`}>{f.source}</span>
                              <h4>{f.name}</h4>
                            </div>
                            <p>{f.description}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'flows' && (
                  <div className="flows-tab">
                    {flowsCount === 0 ? (
                      <div className="empty-state-monochrome">No user flows identified.</div>
                    ) : (
                      <div className="flows-list-monochrome">
                        {job.understanding.flows.map((f, i) => {
                          // Generate mermaid diagram string from steps
                          let chart = 'graph LR\n'
                          f.steps?.forEach((step, idx) => {
                            const cleanStep = step.replace(/"/g, '\\"')
                            chart += `  step${idx}["${cleanStep}"]\n`
                            if (idx < f.steps.length - 1) {
                              chart += `  step${idx} --> step${idx + 1}\n`
                            }
                          })

                          return (
                            <div key={i} className="flow-card-monochrome">
                              <h5>{f.name}</h5>
                              <div className="flow-steps-visual-monochrome" style={{ background: '#ffffff', padding: '24px 16px', overflowX: 'auto', display: 'flex', justifyContent: 'flex-start' }}>
                                <Mermaid chart={chart} />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'issues' && (
                  <div className="issues-tab">
                    {totalIssues === 0 ? (
                      <div className="empty-state-monochrome success-state">
                        <span className="success-icon-monochrome">✓</span>
                        No inconsistencies or gaps found between your documents!
                      </div>
                    ) : (
                      <div className="issues-list-monochrome">
                        {inconsistenciesCount > 0 && (
                          <div className="issues-section-monochrome">
                            <h6>Document Inconsistencies</h6>
                            {job.understanding.inconsistencies.map((iss, i) => (
                              <div key={i} className={`issue-card-monochrome ${iss.severity.toLowerCase()}`}>
                                <div className="issue-card-header-monochrome">
                                  <span className={`severity-badge-monochrome ${iss.severity.toLowerCase()}`}>{iss.severity}</span>
                                  <h5>{iss.issue}</h5>
                                </div>
                                <p>{iss.detail}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {gapsCount > 0 && (
                          <div className="issues-section-monochrome" style={{ marginTop: 24 }}>
                            <h6>Identified Gaps</h6>
                            {job.understanding.gaps.map((g, i) => (
                              <div key={i} className="issue-card-monochrome gap">
                                <div className="issue-card-header-monochrome">
                                  <span className="severity-badge-monochrome gap">GAP</span>
                                  <h5>{g.item}</h5>
                                </div>
                                <p>{g.detail}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Test Case Suite Main Content */}
        {step === 3 && job?.test_report && (
          <div className="main-step-container">
            <div className="main-step-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2>3. Test Case Suite</h2>
                <p>Execute, filter, or copy your generated test plan.</p>
              </div>
              <button className="personalize-btn-monochrome" onClick={() => setShowPersonalizeModal(true)}>
                ✨ Personalize test-case
              </button>
            </div>

            {generating ? (
              <div className="preview-loading" style={{ height: '50vh', display: 'flex', flexDirection: 'column', gap: 16, justifyContent: 'center', alignItems: 'center' }}>
                <div className="spinner" />
                <h3 style={{ marginTop: 16, fontWeight: 800 }}>Personalizing your test cases...</h3>
                <p style={{ color: 'var(--text-dim-dark)', fontSize: '13px' }}>The AI is rewriting the test suite based on your instructions.</p>
              </div>
            ) : (
              <>
                {/* Search and Filters */}
                <div className="filter-bar-monochrome">
                  <input
                    type="text"
                    className="search-input-monochrome"
                    placeholder="🔍 Search test cases (scenario, description, steps, expected)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <div className="filter-chips-monochrome">
                    {categories.map((c) => (
                      <button
                        key={c}
                        className={`filter-chip-btn-monochrome ${reportFilter === c ? 'active' : ''}`}
                        onClick={() => setReportFilter(c)}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Test Cases List Grouped by Section */}
                <div className="test-cases-list-monochrome">
                  {(() => {
                    const casesBySection = {}
                    filteredCases.forEach((tc) => {
                      const sec = tc.section || 'General'
                      if (!casesBySection[sec]) {
                        casesBySection[sec] = []
                      }
                      casesBySection[sec].push(tc)
                    })

                    const sections = Object.keys(casesBySection)

                    if (sections.length === 0) {
                      return (
                        <div className="empty-search-state-monochrome">
                          No test cases found matching your criteria.
                        </div>
                      )
                    }

                    return sections.map((sectionName) => (
                      <div key={sectionName} className="test-case-section-group">
                        <h3 className="section-group-title">{sectionName}</h3>
                        <div className="section-cases-container" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {casesBySection[sectionName].map((tc) => {
                            const isExpanded = !!expandedCases[tc.id]
                            return (
                              <div key={tc.id} className={`test-case-card-monochrome ${tc.priority} ${isExpanded ? 'expanded' : ''}`}>
                                {/* Card Header */}
                                <div className="tc-header-row-monochrome" onClick={() => toggleExpand(tc.id)}>
                                  <div className="tc-header-left-monochrome">
                                    <span className="expand-indicator-monochrome">{isExpanded ? '▼' : '▶'}</span>
                                    <span className="tc-id-badge-monochrome">{tc.id}</span>
                                    <span className="tc-title-text-monochrome">{tc.scenario}</span>
                                  </div>
                                  <div className="tc-header-right-monochrome">
                                    <span className={`badge-monochrome ${tc.priority}`}>{tc.priority}</span>
                                    <span className="badge-monochrome severity">{tc.severity}</span>
                                    <span className="badge-monochrome category">{tc.category}</span>
                                  </div>
                                </div>

                                {/* Card Body */}
                                {isExpanded && (
                                  <div className="tc-body-content-monochrome">
                                    <div className="tc-grid-layout-monochrome">
                                      <div className="tc-body-left-monochrome">
                                        {tc.description && (
                                          <div className="tc-meta-item-monochrome" style={{ marginBottom: 16 }}>
                                            <strong>Description:</strong>
                                            <p style={{ marginTop: 4, color: 'var(--text-dark)', fontSize: '13.5px' }}>{tc.description}</p>
                                          </div>
                                        )}
                                        {tc.precondition && (
                                          <div className="tc-preconditions-box-monochrome">
                                            <strong>Precondition:</strong>
                                            <p>{tc.precondition}</p>
                                          </div>
                                        )}
                                        {tc.steps?.length > 0 && (
                                          <div className="tc-steps-box-monochrome">
                                            <strong>Execution Steps:</strong>
                                            <span className="instruction-tip-monochrome">Check steps off as you test.</span>
                                            <ul className="tc-checklist-monochrome">
                                              {tc.steps.map((step, stepIdx) => {
                                                const isChecked = !!checkedSteps[`${tc.id}-${stepIdx}`]
                                                return (
                                                  <li
                                                    key={stepIdx}
                                                    className={isChecked ? 'completed' : ''}
                                                    onClick={(e) => toggleStep(e, tc.id, stepIdx)}
                                                  >
                                                    <input
                                                      type="checkbox"
                                                      checked={isChecked}
                                                      readOnly
                                                    />
                                                    <span>{step}</span>
                                                  </li>
                                                )
                                              })}
                                            </ul>
                                          </div>
                                        )}
                                      </div>

                                      <div className="tc-body-right-monochrome">
                                        {tc.test_data && (
                                          <div className="tc-data-box-monochrome">
                                            <strong>Test Data:</strong>
                                            <pre>{tc.test_data}</pre>
                                          </div>
                                        )}
                                        {tc.expected_result && (
                                          <div className="tc-expected-box-monochrome">
                                            <strong>Expected Result:</strong>
                                            <p>{tc.expected_result}</p>
                                          </div>
                                        )}
                                        {tc.postcondition && (
                                          <div className="tc-expected-box-monochrome" style={{ marginTop: 12 }}>
                                            <strong>Postcondition:</strong>
                                            <p>{tc.postcondition}</p>
                                          </div>
                                        )}

                                        <div className="tc-execution-fields-monochrome" style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                          <div>
                                            <strong style={{ fontSize: '11px', color: 'var(--text-dim-dark)' }}>Status</strong>
                                            <input type="text" placeholder="Pass/Fail" style={{ padding: '6px 8px', fontSize: '12px', marginTop: 4, width: '100%', border: '1px solid var(--border-light)', borderRadius: '4px' }} />
                                          </div>
                                          <div>
                                            <strong style={{ fontSize: '11px', color: 'var(--text-dim-dark)' }}>Executed By</strong>
                                            <input type="text" placeholder="Tester Name" style={{ padding: '6px 8px', fontSize: '12px', marginTop: 4, width: '100%', border: '1px solid var(--border-light)', borderRadius: '4px' }} />
                                          </div>
                                        </div>

                                        <button className="copy-md-btn-monochrome" onClick={(e) => copyMarkdown(e, tc)} style={{ marginTop: 16 }}>
                                          📋 Copy Markdown
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))
                  })()}
                </div>

                <div className="footer-nav-row-monochrome">
                  <button className="back-btn-monochrome" onClick={() => setStep(2)}>
                    ← Back to Requirements Analysis
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {showPersonalizeModal && (
        <div className="preview-modal-overlay" onClick={() => setShowPersonalizeModal(false)}>
          <div className="preview-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', height: 'auto' }}>
            <div className="preview-modal-header">
              <h3>Personalize Test Cases</h3>
              <button className="close-modal-btn" onClick={() => setShowPersonalizeModal(false)}>✕</button>
            </div>
            <div className="preview-modal-body" style={{ padding: '20px' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-dim-dark)', marginBottom: '12px', lineHeight: '1.4' }}>
                Enter custom instructions to steer the test case generation (e.g., focus on specific flows, add edge cases, prioritize security, etc.).
              </p>
              <textarea
                className="sidebar-textarea"
                placeholder="e.g. Focus more on transaction security and boundary values for amounts..."
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                style={{ height: '120px', width: '100%', border: '1px solid var(--border-light)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button className="back-btn-monochrome" onClick={() => setShowPersonalizeModal(false)} style={{ margin: 0, padding: '8px 16px' }}>
                  Cancel
                </button>
                <button
                  className="primary-monochrome-btn"
                  onClick={() => {
                    setShowPersonalizeModal(false)
                    generateTests()
                  }}
                  disabled={generating || !userPrompt}
                  style={{ margin: 0, width: 'auto', padding: '8px 20px' }}
                >
                  Generate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {previewFile && (
        <div className="preview-modal-overlay" onClick={() => setPreviewFile(null)}>
          <div className="preview-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="preview-modal-header">
              <h3>Document Preview: {previewFile.name}</h3>
              <button className="close-modal-btn" onClick={() => setPreviewFile(null)}>✕</button>
            </div>
            <div className="preview-modal-body">
              <FilePreviewer file={previewFile} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
