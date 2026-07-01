import { useState, useRef, useEffect } from 'react'

const ANALYZE_STAGES = [
  { key: 'parsing_documents', label: 'Parsing Documents' },
  { key: 'fetching_figma', label: 'Fetching Figma' },
  { key: 'understanding', label: 'AI Analysis' },
  { key: 'planning_tests', label: 'Planning Test Suite' },
  { key: 'generating_tests', label: 'Generating Test Cases' },
  { key: 'finalizing', label: 'Finalizing Report' },
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

function TreeFolder({ section, testCases, selectedView, onSelect }) {
  const [isOpen, setIsOpen] = useState(true)

  const isSelected = selectedView?.type === 'section' && selectedView?.id === section

  return (
    <div className="tree-folder">
      <div 
        className={`tree-folder-header ${isSelected ? 'selected' : ''}`}
        onClick={() => {
          setIsOpen(!isOpen)
          onSelect('section', section)
        }} 
        style={{ cursor: 'pointer', userSelect: 'none' }}
      >
        <span 
          className="tree-icon" 
          style={{ 
            transform: isOpen ? 'rotate(90deg)' : 'none', 
            transition: 'transform 0.1s ease-out',
            display: 'inline-block',
            fontSize: '9px',
            marginRight: '2px',
            color: '#71717a'
          }}
        >
          ▶
        </span>
        <span className="tree-icon">📁</span>
        <span className="tree-label" title={section}>{section}</span>
      </div>
      {isOpen && (
        <div className="tree-folder-children">
          {testCases.map((tc) => {
            const isFileSelected = selectedView?.type === 'case' && selectedView?.id === tc.id
            return (
              <div 
                key={tc.id} 
                className={`tree-file ${isFileSelected ? 'selected' : ''}`} 
                title={tc.scenario}
                onClick={() => onSelect('case', tc.id)}
              >
                <span className="tree-icon" style={{ marginLeft: '4px' }}>📄</span>
                <span className="tree-label">{tc.scenario}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function App() {
  // Input states
  const [brd, setBrd] = useState(null)
  const [fsd, setFsd] = useState(null)
  const [images, setImages] = useState([])
  const [figmaUrl, setFigmaUrl] = useState('')
  const [figmaToken, setFigmaToken] = useState('')
  const [showFigmaToken, setShowFigmaToken] = useState(false)
  const [srs, setSrs] = useState(null)
  const [frd, setFrd] = useState(null)
  const [githubUrl, setGithubUrl] = useState('')
  const [projectUrl, setProjectUrl] = useState('')
  const [deep, setDeep] = useState(false)

  // Job & UI states
  const [job, setJob] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [userPrompt, setUserPrompt] = useState('')
  const [selectedView, setSelectedView] = useState({ type: 'all', id: null })
  const [generating, setGenerating] = useState(false)
  const [step, setStep] = useState(1) // 1 = Upload, 2 = Analysis, 3 = Test Report
  const [activeTab, setActiveTab] = useState('features') // Step 2 active tab
  const [previewFile, setPreviewFile] = useState(null) // Document preview state
  const [docPreviewHtml, setDocPreviewHtml] = useState(null)
  const [showPersonalizeModal, setShowPersonalizeModal] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const pollRef = useRef(null)

  const handleCellEdit = (tcId, field, value) => {
    setJob((prev) => {
      if (!prev?.test_report?.test_cases) return prev
      const newCases = prev.test_report.test_cases.map(tc => {
        if (tc.id === tcId) {
          return { ...tc, [field]: value }
        }
        return tc
      })
      return {
        ...prev,
        test_report: {
          ...prev.test_report,
          test_cases: newCases
        }
      }
    })
  }

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
        return { percent: 15, est: 'Est. remaining: ~2 min' }
      case 'fetching_figma':
        return { percent: 25, est: 'Est. remaining: ~1.5 min' }
      case 'understanding':
        return { percent: 40, est: 'Est. remaining: ~1 min' }
      case 'planning_tests':
        return { percent: 55, est: 'Planning test coverage...' }
      case 'generating_tests':
        return { percent: 75, est: 'Generating per-feature...' }
      case 'finalizing':
        return { percent: 95, est: 'Merging & validating...' }
      case 'done':
        return { percent: 100, est: 'Wrapping up...' }
      default:
        return { percent: 10, est: 'Est. remaining: ~3 min' }
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
  const [caseStatuses, setCaseStatuses] = useState({})
  const [viewFlowChart, setViewFlowChart] = useState(null)

  const startAnalysis = async () => {
    setSubmitting(true)
    setJob(null)

    const formData = new FormData()
    if (brd) formData.append('brd', brd)
    if (fsd) formData.append('fsd', fsd)
    if (srs) formData.append('srs', srs)
    if (frd) formData.append('frd', frd)
    images.forEach((img) => formData.append('images', img))
    if (figmaUrl) formData.append('figma_url', figmaUrl)
    if (figmaToken) formData.append('figma_token', figmaToken)
    if (githubUrl) formData.append('github_url', githubUrl)
    if (projectUrl) formData.append('project_url', projectUrl)
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

  const exportDoc = () => {
    const casesBySection = {}
    cases.forEach((tc) => {
      const sec = tc.section || 'General'
      if (!casesBySection[sec]) {
        casesBySection[sec] = []
      }
      casesBySection[sec].push(tc)
    })

    const sections = Object.keys(casesBySection)
    const subtitle = `Module: ${sections.join(' | ')}`

    let tablesHtml = ''
    sections.forEach((sec, idx) => {
      tablesHtml += `
        <h2>Module ${idx}: ${sec}</h2>
        <table>
          <thead>
            <tr>
              <th width="5%">Test Case ID</th>
              <th width="6%">Category</th>
              <th width="9%">Test Scenario</th>
              <th width="13%">Test Case Description</th>
              <th width="8%">Precondition</th>
              <th width="16%">Test Steps</th>
              <th width="7%">Test Data</th>
              <th width="12%">Expected Result</th>
              <th width="5%">Actual Result</th>
              <th width="6%">Postcondition</th>
              <th width="4%">Status</th>
              <th width="3%">Severity</th>
              <th width="3%">Priority</th>
              <th width="3%">Executed By</th>
            </tr>
          </thead>
          <tbody>
            ${casesBySection[sec].map(tc => `
              <tr>
                <td>${tc.id}</td>
                <td>${tc.category || ''}</td>
                <td>${tc.scenario || ''}</td>
                <td>${tc.description || ''}</td>
                <td>${tc.precondition || ''}</td>
                <td>${(tc.steps || []).join('<br/>')}</td>
                <td>${tc.test_data || ''}</td>
                <td>${tc.expected_result || ''}</td>
                <td>${tc.actual_result || ''}</td>
                <td>${tc.postcondition || ''}</td>
                <td>${tc.status || ''}</td>
                <td>${tc.severity || ''}</td>
                <td>${tc.priority || ''}</td>
                <td>${tc.executed_by || ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `
    })

    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Test Suite</title>
        <style>
          @page {
            size: 29.7cm 21cm;
            margin: 1.5cm;
          }
          * {
            font-family: Arial, sans-serif !important;
          }
          body {
            font-family: Arial, sans-serif !important;
            font-size: 9pt;
          }
          h1 {
            text-align: center;
            color: #e65c00;
            font-size: 16pt;
            margin-bottom: 5px;
            font-family: Arial, sans-serif !important;
          }
          .subtitle {
            text-align: center;
            color: #555555;
            font-size: 10pt;
            margin-bottom: 20px;
            font-family: Arial, sans-serif !important;
          }
          h2 {
            color: #e65c00;
            font-size: 14pt;
            margin-top: 30px;
            margin-bottom: 10px;
            font-family: Arial, sans-serif !important;
          }
          table {
            border-collapse: collapse;
            width: 100%;
            font-size: 8.5pt;
            margin-bottom: 20px;
            table-layout: fixed;
          }
          th {
            background-color: #e65c00;
            color: white;
            padding: 4px;
            text-align: left;
            border: 1px solid #000000;
            font-weight: bold;
            word-wrap: break-word;
          }
          td {
            padding: 4px;
            border: 1px solid #000000;
            vertical-align: top;
            word-wrap: break-word;
          }
        </style>
      </head>
      <body>
        <h1 style="font-family: Arial, sans-serif;">${job?.understanding?.product_type || "Project"} - Test Cases</h1>
        <div class="subtitle" style="font-family: Arial, sans-serif;">${subtitle}</div>
        ${tablesHtml.replace(/<h2>/g, '<h2 style="font-family: Arial, sans-serif;">')}
      </body>
      </html>
    `;

    setDocPreviewHtml(htmlContent);
  }

  const downloadDoc = () => {
    if (!docPreviewHtml) return;
    const blob = new Blob(['\ufeff', docPreviewHtml], {
        type: 'application/msword'
    });
    
    const downloadLink = document.createElement("a");
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = "test_suite.doc";
    
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    setDocPreviewHtml(null);
  }

  return (
    <div className={`app-window step-${step}`}>
      {/* ================= LEFT SIDEBAR (Dark Black Theme) ================= */}
      <div className="app-sidebar">


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
              {(() => {
                const treeData = {}
                job.test_report.test_cases.forEach((tc) => {
                  const sec = tc.section || 'General'
                  if (!treeData[sec]) treeData[sec] = []
                  treeData[sec].push(tc)
                })

                return (
                  <div className="test-explorer-tree">
                    <div className="tree-root" onClick={() => setSelectedView({ type: 'all', id: null })} style={{ cursor: 'pointer' }}>
                      <span className="tree-icon">📁</span>
                      <span className="tree-label">{job.understanding?.product_type || "Test Project"}</span>
                    </div>
                    <div className="tree-children">
                      {Object.keys(treeData).map((sec, idx) => (
                        <TreeFolder 
                          key={idx} 
                          section={sec} 
                          testCases={treeData[sec]} 
                          selectedView={selectedView}
                          onSelect={(type, id) => setSelectedView({ type, id })}
                        />
                      ))}
                    </div>
                  </div>
                )
              })()}
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
              <div className="upload-inputs-container new-sleek-design">
                {/* SECTION 1: PROJECT DOCUMENTS */}
                <div className="sleek-section">
                  <div className="sleek-section-header">
                    <h3>📄 Project Documents</h3>
                    <p>Upload any requirements or spec documents (Optional)</p>
                  </div>
                  <div className="sleek-upload-list">
                    
                    {/* BRD */}
                    <div className={`sleek-list-item ${brd ? 'has-file' : ''}`}>
                      <div className="sleek-item-left">
                        <span className="sleek-item-label">BRD (Business Requirements)</span>
                      </div>
                      <div className="sleek-item-right">
                        {brd ? (
                          <>
                            <span className="sleek-filename">{brd.name}</span>
                            <button type="button" className="sleek-icon-btn" onClick={() => setPreviewFile(brd)}>👁</button>
                            <button type="button" className="sleek-icon-btn danger" onClick={() => setBrd(null)}>✕</button>
                          </>
                        ) : (
                          <label className="sleek-upload-btn">
                            Upload
                            <input type="file" accept=".pdf,.docx,.doc,.txt,.md" onChange={(e) => setBrd(e.target.files[0])} className="hidden-file-input" />
                          </label>
                        )}
                      </div>
                    </div>

                    {/* FSD */}
                    <div className={`sleek-list-item ${fsd ? 'has-file' : ''}`}>
                      <div className="sleek-item-left">
                        <span className="sleek-item-label">FSD (Functional Specs)</span>
                      </div>
                      <div className="sleek-item-right">
                        {fsd ? (
                          <>
                            <span className="sleek-filename">{fsd.name}</span>
                            <button type="button" className="sleek-icon-btn" onClick={() => setPreviewFile(fsd)}>👁</button>
                            <button type="button" className="sleek-icon-btn danger" onClick={() => setFsd(null)}>✕</button>
                          </>
                        ) : (
                          <label className="sleek-upload-btn">
                            Upload
                            <input type="file" accept=".pdf,.docx,.doc,.txt,.md" onChange={(e) => setFsd(e.target.files[0])} className="hidden-file-input" />
                          </label>
                        )}
                      </div>
                    </div>

                    {/* SRS */}
                    <div className={`sleek-list-item ${srs ? 'has-file' : ''}`}>
                      <div className="sleek-item-left">
                        <span className="sleek-item-label">SRS (Software Requirements)</span>
                      </div>
                      <div className="sleek-item-right">
                        {srs ? (
                          <>
                            <span className="sleek-filename">{srs.name}</span>
                            <button type="button" className="sleek-icon-btn" onClick={() => setPreviewFile(srs)}>👁</button>
                            <button type="button" className="sleek-icon-btn danger" onClick={() => setSrs(null)}>✕</button>
                          </>
                        ) : (
                          <label className="sleek-upload-btn">
                            Upload
                            <input type="file" accept=".pdf,.docx,.doc,.txt,.md" onChange={(e) => setSrs(e.target.files[0])} className="hidden-file-input" />
                          </label>
                        )}
                      </div>
                    </div>

                    {/* FRD */}
                    <div className={`sleek-list-item ${frd ? 'has-file' : ''}`}>
                      <div className="sleek-item-left">
                        <span className="sleek-item-label">FRD (Functional Requirements)</span>
                      </div>
                      <div className="sleek-item-right">
                        {frd ? (
                          <>
                            <span className="sleek-filename">{frd.name}</span>
                            <button type="button" className="sleek-icon-btn" onClick={() => setPreviewFile(frd)}>👁</button>
                            <button type="button" className="sleek-icon-btn danger" onClick={() => setFrd(null)}>✕</button>
                          </>
                        ) : (
                          <label className="sleek-upload-btn">
                            Upload
                            <input type="file" accept=".pdf,.docx,.doc,.txt,.md" onChange={(e) => setFrd(e.target.files[0])} className="hidden-file-input" />
                          </label>
                        )}
                      </div>
                    </div>

                  </div>
                </div>

                {/* SECTION 2: DESIGN & UI */}
                <div className="sleek-section">
                  <div className="sleek-section-header">
                    <h3>🎨 Design & UI References</h3>
                    <p>Upload mockup images or link your Figma designs (Optional)</p>
                  </div>
                  
                  <div className="sleek-list-item" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: images.length > 0 ? '16px' : '0' }}>
                      <span className="sleek-item-label">Reference Mockups (Images)</span>
                      <label className="sleek-upload-btn">
                        {images.length > 0 ? '+ Add More' : 'Upload Images'}
                        <input type="file" multiple accept="image/*" onChange={(e) => setImages([...images, ...Array.from(e.target.files)])} className="hidden-file-input" />
                      </label>
                    </div>
                    {images.length > 0 && (
                      <div className="sleek-images-gallery">
                        {images.map((img, index) => (
                          <div key={index} className="sleek-image-thumb">
                            <button type="button" className="sleek-remove-img" onClick={() => setImages(images.filter((_, i) => i !== index))}>✕</button>
                            <ImageThumbnail file={img} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="sleek-inputs-row">
                    <div className="sleek-input-group">
                      <label>Figma File URL</label>
                      <div className="sleek-input-wrapper">
                        <span className="sleek-input-icon">🎨</span>
                        <input type="text" placeholder="https://www.figma.com/design/..." value={figmaUrl} onChange={(e) => setFigmaUrl(e.target.value)} />
                      </div>
                    </div>
                    <div className="sleek-input-group">
                      <label>Figma API Token</label>
                      <div className="sleek-input-wrapper">
                        <span className="sleek-input-icon">🔑</span>
                        <input type={showFigmaToken ? "text" : "password"} placeholder="figd_..." value={figmaToken} onChange={(e) => setFigmaToken(e.target.value)} />
                        <button type="button" className="sleek-icon-btn" style={{border: 'none', background: 'transparent', width: 'auto'}} onClick={() => setShowFigmaToken(!showFigmaToken)} title={showFigmaToken ? "Hide Token" : "Show Token"}>
                          {showFigmaToken ? '🙈' : '👁️'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION 3: EXTERNAL LINKS */}
                <div className="sleek-section">
                  <div className="sleek-section-header">
                    <h3>🔗 Code & Environment</h3>
                    <p>Link your repository and deployed application (Optional)</p>
                  </div>
                  <div className="sleek-inputs-row">
                    <div className="sleek-input-group">
                      <label>GitHub Repository URL</label>
                      <div className="sleek-input-wrapper">
                        <span className="sleek-input-icon">💻</span>
                        <input type="text" placeholder="https://github.com/org/repo" value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} />
                      </div>
                    </div>
                    <div className="sleek-input-group">
                      <label>Deployed Project URL</label>
                      <div className="sleek-input-wrapper">
                        <span className="sleek-input-icon">🌐</span>
                        <input type="text" placeholder="https://my-app.vercel.app" value={projectUrl} onChange={(e) => setProjectUrl(e.target.value)} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* FOOTER ACTION */}
                <div className="sleek-action-footer">
                  <div className="toggle-row sleek-toggle">
                    <input type="checkbox" id="deep" checked={deep} onChange={(e) => setDeep(e.target.checked)} />
                    <label htmlFor="deep">Deep mode (gpt-oss:120b — slower, extremely thorough)</label>
                  </div>

                  <button
                    className="sleek-submit-btn"
                    onClick={startAnalysis}
                    disabled={submitting || (!brd && !fsd && !srs && !frd && images.length === 0 && !figmaUrl && !githubUrl && !projectUrl)}
                  >
                    {submitting ? 'Analyzing & Generating...' : 'Analyze Documents ➔'}
                  </button>
                </div>

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
                          let allSteps = []
                          f.steps?.forEach(step => {
                            if (step.includes('->')) {
                              allSteps.push(...step.split('->').map(s => s.trim()))
                            } else if (step.includes('→')) {
                              allSteps.push(...step.split('→').map(s => s.trim()))
                            } else {
                              allSteps.push(step.trim())
                            }
                          })

                          let chart = 'graph LR\n'
                          allSteps.forEach((step, idx) => {
                            const cleanStep = step.replace(/"/g, '\\"')
                            chart += `  step${idx}["${cleanStep}"]\n`
                            if (idx < allSteps.length - 1) {
                              chart += `  step${idx} --> step${idx + 1}\n`
                            }
                          })

                          return (
                            <div key={i} className="flow-card-monochrome">
                              <div className="flow-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h5 style={{ margin: 0 }}>{f.name}</h5>
                                <button className="personalize-btn-monochrome" onClick={() => setViewFlowChart(chart)} style={{ padding: '4px 12px', fontSize: '12px', margin: 0, height: 'auto' }}>🔍 View Graph</button>
                              </div>
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
            <div className="main-step-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h2>3. Test Case Suite</h2>
                <p>Execute, filter, or copy your generated test plan.</p>
              </div>
              <div className="header-metrics-row" style={{ flex: 1 }}>
                <div className="header-metric-badge">
                  <span>Total</span>
                  <strong>{totalCount}</strong>
                </div>
                <div className="header-metric-badge p0">
                  <span>P0</span>
                  <strong>{p0Count}</strong>
                </div>
                <div className="header-metric-badge p1">
                  <span>P1</span>
                  <strong>{p1Count}</strong>
                </div>
                <div className="header-metric-badge p2">
                  <span>P2</span>
                  <strong>{p2Count}</strong>
                </div>
                <div className="header-metric-badge p3">
                  <span>P3</span>
                  <strong>{p3Count}</strong>
                </div>
                <button className="personalize-btn-monochrome" onClick={() => setShowPersonalizeModal(true)} style={{ marginLeft: 'auto' }}>
                  ✨ Personalize
                </button>
                <button className="personalize-btn-monochrome" onClick={exportDoc} style={{ background: '#f4f4f5', color: '#18181b', borderColor: '#e4e4e7' }}>
                  📄 View as Doc
                </button>
              </div>
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

                </div>

                {/* Test Cases List Grouped by Section (Table Design) */}
                <div className="test-cases-list-table-wrapper">
                  {(() => {
                    const casesBySection = {}
                    let visibleCases = filteredCases
                    if (selectedView.type === 'section') {
                      visibleCases = visibleCases.filter(tc => (tc.section || 'General') === selectedView.id)
                    } else if (selectedView.type === 'case') {
                      visibleCases = visibleCases.filter(tc => tc.id === selectedView.id)
                    }

                    visibleCases.forEach((tc) => {
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
                      <div key={sectionName} className="test-case-table-section">
                        <h3 className="section-group-title-orange">{sectionName}</h3>
                        <div className="test-suite-table-container">
                          <table className="test-suite-table">
                            <thead>
                              <tr>
                                <th style={{ minWidth: '100px' }}>Test Case ID</th>
                                <th style={{ minWidth: '120px' }}>Category</th>
                                <th style={{ minWidth: '180px' }}>Test Scenario</th>
                                <th style={{ minWidth: '250px' }}>Test Case Description</th>
                                <th style={{ minWidth: '150px' }}>Precondition</th>
                                <th style={{ minWidth: '300px' }}>Test Steps</th>
                                <th style={{ minWidth: '150px' }}>Test Data</th>
                                <th style={{ minWidth: '250px' }}>Expected Result</th>
                                <th style={{ minWidth: '200px' }}>Actual Result</th>
                                <th style={{ minWidth: '150px' }}>Postcondition</th>
                                <th style={{ minWidth: '120px' }}>Status</th>
                                <th style={{ minWidth: '100px' }}>Severity</th>
                                <th style={{ minWidth: '100px' }}>Priority</th>
                                <th style={{ minWidth: '120px' }}>Executed By</th>
                              </tr>
                            </thead>
                            <tbody>
                              {casesBySection[sectionName].map((tc) => (
                                <tr key={tc.id}>
                                  <td contentEditable="plaintext-only" suppressContentEditableWarning={true} onBlur={(e) => handleCellEdit(tc.id, 'id', e.target.innerText)} style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>{tc.id}</td>
                                  <td contentEditable="plaintext-only" suppressContentEditableWarning={true} onBlur={(e) => handleCellEdit(tc.id, 'category', e.target.innerText)}>{tc.category}</td>
                                  <td contentEditable="plaintext-only" suppressContentEditableWarning={true} onBlur={(e) => handleCellEdit(tc.id, 'scenario', e.target.innerText)}>{tc.scenario}</td>
                                  <td contentEditable="plaintext-only" suppressContentEditableWarning={true} onBlur={(e) => handleCellEdit(tc.id, 'description', e.target.innerText)}>{tc.description}</td>
                                  <td contentEditable="plaintext-only" suppressContentEditableWarning={true} onBlur={(e) => handleCellEdit(tc.id, 'precondition', e.target.innerText)}>{tc.precondition || 'N/A'}</td>
                                  <td contentEditable="plaintext-only" suppressContentEditableWarning={true} style={{ whiteSpace: 'pre-wrap' }} onBlur={(e) => {
                                    const text = e.target.innerText.trim();
                                    handleCellEdit(tc.id, 'steps', text ? text.split('\n') : [])
                                  }}>
                                    {tc.steps?.length > 0 ? tc.steps.join('\n') : 'N/A'}
                                  </td>
                                  <td contentEditable="plaintext-only" suppressContentEditableWarning={true} onBlur={(e) => handleCellEdit(tc.id, 'test_data', e.target.innerText)}>{tc.test_data || 'N/A'}</td>
                                  <td contentEditable="plaintext-only" suppressContentEditableWarning={true} onBlur={(e) => handleCellEdit(tc.id, 'expected_result', e.target.innerText)}>{tc.expected_result || 'N/A'}</td>
                                  <td contentEditable="plaintext-only" suppressContentEditableWarning={true} onBlur={(e) => handleCellEdit(tc.id, 'actual_result', e.target.innerText)}>{tc.actual_result || 'N/A'}</td>
                                  <td contentEditable="plaintext-only" suppressContentEditableWarning={true} onBlur={(e) => handleCellEdit(tc.id, 'postcondition', e.target.innerText)}>{tc.postcondition || 'N/A'}</td>
                                  <td contentEditable="plaintext-only" suppressContentEditableWarning={true} onBlur={(e) => handleCellEdit(tc.id, 'status', e.target.innerText)} style={{
                                    fontWeight: tc.status && tc.status !== 'N/A' ? 700 : 400,
                                    color:
                                      tc.status === 'Pass' ? '#16a34a' :
                                      tc.status === 'Fail' ? '#dc2626' :
                                      tc.status === 'Blocked' ? '#ca8a04' :
                                      tc.status === 'Skipped' ? '#6b7280' : 'inherit'
                                  }}>
                                    {tc.status || 'N/A'}
                                  </td>
                                  <td contentEditable="plaintext-only" suppressContentEditableWarning={true} onBlur={(e) => handleCellEdit(tc.id, 'severity', e.target.innerText)} className={`severity-${tc.severity?.toLowerCase()}`}>{tc.severity}</td>
                                  <td contentEditable="plaintext-only" suppressContentEditableWarning={true} onBlur={(e) => handleCellEdit(tc.id, 'priority', e.target.innerText)}>{tc.priority}</td>
                                  <td contentEditable="plaintext-only" suppressContentEditableWarning={true} onBlur={(e) => handleCellEdit(tc.id, 'executed_by', e.target.innerText)}>{tc.executed_by || 'N/A'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
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

      {viewFlowChart && (
        <div className="preview-modal-overlay" onClick={() => setViewFlowChart(null)}>
          <div className="preview-modal-content" onClick={(e) => e.stopPropagation()} style={{ width: '90vw', height: '90vh', maxWidth: '1400px', display: 'flex', flexDirection: 'column' }}>
            <div className="preview-modal-header">
              <h3>User Flow Diagram</h3>
              <button className="close-modal-btn" onClick={() => setViewFlowChart(null)}>✕</button>
            </div>
            <div className="preview-modal-body" style={{ flex: 1, padding: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'auto', background: '#ffffff' }}>
              <div style={{ transform: 'scale(1.2)', transformOrigin: 'center center' }}>
                <Mermaid chart={viewFlowChart} />
              </div>
            </div>
          </div>
        </div>
      )}

      {docPreviewHtml && (
        <div className="preview-modal-overlay" onClick={() => setDocPreviewHtml(null)}>
          <div className="preview-modal-content" onClick={(e) => e.stopPropagation()} style={{ width: '90%', maxWidth: '1200px', height: '90vh' }}>
            <div className="preview-modal-header">
              <h3>Document Preview</h3>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="primary-monochrome-btn" onClick={downloadDoc} style={{ padding: '6px 16px', margin: 0 }}>
                  📥 Download .doc
                </button>
                <button className="close-modal-btn" onClick={() => setDocPreviewHtml(null)}>✕</button>
              </div>
            </div>
            <div className="preview-modal-body" style={{ padding: 0, height: 'calc(100% - 60px)', background: '#fff' }}>
              <iframe 
                srcDoc={docPreviewHtml} 
                style={{ width: '100%', height: '100%', border: 'none' }}
                title="Document Preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
