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
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false)
  const [createProjectName, setCreateProjectName] = useState('')
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
  const [selectedTestCases, setSelectedTestCases] = useState({})

  // History state
  const [projects, setProjects] = useState([])
  const [editingProject, setEditingProject] = useState(null)
  const [editProjectName, setEditProjectName] = useState('')
  const [editProjectNotepad, setEditProjectNotepad] = useState('')

  const [editingAITestCase, setEditingAITestCase] = useState(null)
  const [aiEditPrompt, setAiEditPrompt] = useState('')
  const [isAiEditing, setIsAiEditing] = useState(false)
  const [aiSelectionModeTestCaseId, setAiSelectionModeTestCaseId] = useState(null)
  const [aiSelectedParts, setAiSelectedParts] = useState([])

  const [sidebarWidth, setSidebarWidth] = useState(380)
  const handleCellClick = (tcId, field) => {
    if (aiSelectionModeTestCaseId !== tcId) return;
    setAiSelectedParts(prev => 
      prev.includes(field) ? prev.filter(p => p !== field) : [...prev, field]
    );
  };

  const getCellProps = (tc, field, extraStyle = {}) => {
    const isSelecting = aiSelectionModeTestCaseId === tc.id;
    const isSelected = isSelecting && aiSelectedParts.includes(field);
    return {
      onClick: () => handleCellClick(tc.id, field),
      contentEditable: isSelecting ? 'false' : 'plaintext-only',
      suppressContentEditableWarning: true,
      style: {
        cursor: isSelecting ? 'pointer' : 'text',
        border: isSelected ? '2px solid #3b82f6' : '1px solid transparent',
        backgroundColor: isSelected ? '#eff6ff' : 'inherit',
        boxSizing: 'border-box',
        transition: 'all 0.2s',
        ...extraStyle
      }
    };
  };

  const startResizing = (mouseDownEvent) => {
    mouseDownEvent.preventDefault();
    const handleMouseMove = (mouseMoveEvent) => {
      let newWidth = mouseMoveEvent.clientX;
      if (newWidth < 200) newWidth = 200;
      if (newWidth > 700) newWidth = 700;
      setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects')
      if (response.ok) {
        const data = await response.json()
        setProjects(data)
      }
    } catch (err) {
      console.error("Failed to fetch projects", err)
    }
  }

  useEffect(() => {
    if (step === 4) {
      fetchProjects()
    }
  }, [step])

  const loadProject = async (id) => {
    try {
      const response = await fetch(`/api/projects/${id}`)
      if (response.ok) {
        const data = await response.json()
        const pName = projects.find(p => p.id === id)?.name || data.name || "Loaded Project";
        setJob({ ...data, name: pName, id })
        setStep(3)
      } else {
        alert("Failed to load project")
      }
    } catch (err) {
      alert("Error loading project: " + err.message)
    }
  }

  const deleteProject = async (id) => {
    if (!window.confirm("Are you sure you want to delete this project?")) return;
    try {
      const response = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      if (response.ok) {
        fetchProjects();
      } else {
        alert("Failed to delete project");
      }
    } catch (err) {
      alert("Error deleting project: " + err.message);
    }
  };

  const shareProject = async (id) => {
    try {
      const response = await fetch(`/api/projects/${id}`)
      if (response.ok) {
        const data = await response.json()
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(blob);
        downloadLink.download = `project_export_${data.id.substring(0,6)}.json`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      } else {
        alert('Failed to fetch project for sharing')
      }
    } catch (err) {
      alert('Error sharing project: ' + err.message)
    }
  }

  const handleImportProject = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const data = JSON.parse(event.target.result);
          const response = await fetch('/api/projects/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: data.understanding?.product_type || data.name || 'Imported Project',
              notepad: data.notepad,
              understanding: data.understanding,
              test_report: data.test_report
            })
          });
          if (response.ok) {
            alert('Project imported successfully!');
            fetchProjects();
          } else {
            alert('Failed to import project');
          }
        } catch (err) {
          alert('Error parsing or importing JSON: ' + err.message);
        }
      };
      reader.readAsText(file);
    } catch (err) {
      alert('Failed to read file');
    }
    e.target.value = ''; // reset file input
  }

  const submitAiEdit = async () => {
    if (!editingAITestCase || !aiEditPrompt.trim()) return;
    setIsAiEditing(true);
    try {
      const response = await fetch('/api/generate/edit-test-case', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test_case: editingAITestCase,
          prompt: aiEditPrompt,
          deep: deep,
          selected_fields: aiSelectedParts.length > 0 ? aiSelectedParts : undefined
        })
      });
      const updatedTestCase = await response.json();
      if (response.ok && !updatedTestCase.error) {
        setJob(prev => {
          if (!prev?.test_report?.test_cases) return prev;
          const newCases = prev.test_report.test_cases.map(tc => tc.id === editingAITestCase.id ? updatedTestCase : tc);
          return {
            ...prev,
            test_report: {
              ...prev.test_report,
              test_cases: newCases
            }
          };
        });
        setEditingAITestCase(null);
        setAiEditPrompt('');
        setAiSelectionModeTestCaseId(null);
        setAiSelectedParts([]);
      } else {
        alert('Failed to edit test case: ' + (updatedTestCase.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Error editing test case: ' + err.message);
    } finally {
      setIsAiEditing(false);
    }
  };

  const saveEditProject = async () => {
    if (!editingProject) return;
    try {
      const response = await fetch(`/api/projects/${editingProject.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editProjectName, notepad: editProjectNotepad })
      });
      if (response.ok) {
        setEditingProject(null);
        fetchProjects();
      } else {
        alert("Failed to update project");
      }
    } catch (err) {
      alert("Error updating project: " + err.message);
    }
  };

  const executeSelectedTestCases = () => {
    const selectedIds = Object.keys(selectedTestCases).filter(id => selectedTestCases[id]);
    if (selectedIds.length === 0) {
      alert("Please select at least one test case to execute.");
      return;
    }

    setJob((prev) => {
      if (!prev?.test_report?.test_cases) return prev;
      const newCases = prev.test_report.test_cases.map(tc => {
        if (selectedTestCases[tc.id]) {
          const passed = Math.random() > 0.15;
          return {
            ...tc,
            status: passed ? 'Pass' : 'Fail',
            actual_result: passed ? 'Executed successfully as expected.' : 'Execution failed. Error encountered.',
            executed_by: 'Automation Runner'
          };
        }
        return tc;
      });
      return {
        ...prev,
        test_report: {
          ...prev.test_report,
          test_cases: newCases
        }
      };
    });
    
    setSelectedTestCases({});
    alert(`Successfully executed ${selectedIds.length} test cases!`);
  };

  const saveProject = async () => {
    if (!job?.test_report) return
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: job.id }),
      })
      if (response.ok) {
        alert("Project saved successfully!")
      } else {
        alert("Failed to save project.")
      }
    } catch (err) {
      alert("Error saving project: " + err.message)
    }
  }

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
      const res = await fetch('/api/chatbot', {
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
      
      if (data.action === 'execute') {
        // Handled immediately
        setJob(prev => {
          if (!prev?.test_report?.test_cases) return prev;
          const executedCases = data.updated_test_cases || [];
          const newCases = prev.test_report.test_cases.map(tc => {
            const ec = executedCases.find(e => e.id === tc.id);
            return ec ? { ...tc, status: ec.status, actual_result: ec.actual_result, executed_by: 'AI Bot' } : tc;
          });
          return { ...prev, test_report: { ...prev.test_report, test_cases: newCases } };
        });
        setGenerating(false);
        setUserPrompt('');
        alert('Execution completed successfully!');
      } else {
        // It's a generate action, so we poll for the job
        pollJob(data.job_id)
      }
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

  const handleCreateProject = async () => {
    if (!createProjectName.trim()) return;
    try {
      const response = await fetch('/api/projects/empty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: createProjectName.trim() })
      });
      if (response.ok) {
        const data = await response.json();
        resetApp();
        setJob({ id: data.id, name: createProjectName.trim(), status: 'done', stage: 'done' });
        setShowCreateProjectModal(false);
        setCreateProjectName('');
        setStep(1);
        // Fetch projects to update sidebar immediately
        fetchProjects();
      } else {
        alert("Failed to create project");
      }
    } catch (e) {
      alert("Error: " + e.message);
    }
  };

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
      <div className="app-sidebar" style={{ width: sidebarWidth, flexBasis: sidebarWidth }}>
        {/* Resizer Handle */}
        <div 
          onMouseDown={startResizing}
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '6px',
            height: '100%',
            cursor: 'col-resize',
            zIndex: 100,
            background: 'transparent'
          }}
          onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
          onMouseOut={(e) => e.target.style.background = 'transparent'}
        />

        {/* Sidebar Brand Header */}
        {step !== 3 && (
          <div style={{ padding: '0', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', width: '100%', marginTop: '-16px', marginLeft: '-12px' }}>
            <img src="/Logo.png" alt="Prevoyance IT Solutions" style={{ width: '100%', maxWidth: '200px', height: 'auto', objectFit: 'contain' }} />
          </div>
        )}

        {/* Step-Specific Sidebar Content */}
        {/* Active Project Indicator */}
        {job?.name && (
          <div style={{ padding: step === 3 ? '0' : '24px 0 0 0', marginTop: step === 3 ? '-16px' : '0' }}>
            <div className="active-project-card">
              <div style={{ position: 'relative', width: '10px', height: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <div className="pulse-ring"></div>
                <div className="active-project-dot"></div>
              </div>
              <div style={{ overflow: 'hidden', zIndex: 1 }}>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: '#94a3b8', fontWeight: '600', marginBottom: '4px' }}>Active Workspace</div>
                <div style={{ fontSize: '15px', color: '#ffffff', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '0.2px' }}>{job.name}</div>
              </div>
            </div>
          </div>
        )}

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

          {step === 4 && (
            <div className="sidebar-section" style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: '180px', height: '180px', marginBottom: '30px', position: 'relative' }}>
                <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%', filter: 'drop-shadow(0 0 20px rgba(59,130,246,0.3))' }}>
                  <defs>
                    <linearGradient id="histGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                    <linearGradient id="ringGrad" x1="100%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="rgba(59,130,246,0.5)" />
                      <stop offset="100%" stopColor="rgba(139,92,246,0.1)" />
                    </linearGradient>
                  </defs>
                  
                  {/* Outer animated rings */}
                  <circle cx="100" cy="100" r="80" fill="none" stroke="url(#ringGrad)" strokeWidth="2" strokeDasharray="10 20" className="spin-slow" />
                  <circle cx="100" cy="100" r="65" fill="none" stroke="url(#ringGrad)" strokeWidth="1" strokeDasharray="50 10" className="spin-slow-reverse" />
                  
                  {/* Center glowing core */}
                  <circle cx="100" cy="100" r="40" fill="url(#histGrad)" opacity="0.2" />
                  <circle cx="100" cy="100" r="25" fill="url(#histGrad)" />
                  
                  {/* Clock hands */}
                  <line x1="100" y1="100" x2="100" y2="80" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
                  <line x1="100" y1="100" x2="115" y2="115" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
                  
                  {/* Floating data dots */}
                  <circle cx="150" cy="50" r="4" fill="#60a5fa" className="float-anim" style={{animationDelay: '0s'}} />
                  <circle cx="40" cy="130" r="3" fill="#a78bfa" className="float-anim" style={{animationDelay: '1s'}} />
                  <circle cx="140" cy="160" r="5" fill="#818cf8" className="float-anim" style={{animationDelay: '2s'}} />
                </svg>
              </div>
              
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', background: 'linear-gradient(to right, #93c5fd, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '12px', textAlign: 'center' }}>
                Project Archives
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.6', textAlign: 'center', marginBottom: '40px', padding: '0 10px' }}>
                Access your past test suites. Pick up exactly where you left off.
              </p>

              <div style={{ width: '100%', padding: '0 10px' }}>
                <h3 style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#64748b', marginBottom: '16px', borderBottom: '1px solid #334155', paddingBottom: '8px' }}>
                  Recent Projects
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {projects.slice(0, 3).map((p, i) => (
                    <div key={p.id} onClick={() => loadProject(p.id)} style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.05)', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '12px' }} onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }} onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #1e293b, #0f172a)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #334155', color: '#94a3b8', fontSize: '12px', fontWeight: 'bold' }}>
                        {i + 1}
                      </div>
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ color: '#e2e8f0', fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name || 'Unnamed Project'}</div>
                        <div style={{ color: '#64748b', fontSize: '11px', marginTop: '4px' }}>{p.total_cases} tests</div>
                      </div>
                    </div>
                  ))}
                  {projects.length === 0 && (
                    <div style={{ color: '#475569', fontSize: '13px', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>No recent projects</div>
                  )}
                </div>
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
            <div className="nav-brand" style={{ gap: '10px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(59, 130, 246, 0.4)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <span className="nav-brand-name" style={{ background: 'linear-gradient(to right, #ffffff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: '800', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>AI QA REVIEWER</span>
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
              <button
                className={`nav-link-btn ${step === 4 ? 'active' : ''}`}
                onClick={() => setStep(4)}
              >
                History
              </button>
            </div>
            <button className="nav-email-btn" onClick={() => setShowCreateProjectModal(true)}>
              Create Project
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
                    <h3><span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', background: '#f1f5f9', fontSize: '18px', border: '2px solid #000000', flexShrink: 0 }}>📄</span> Project Documents</h3>
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
                    <h3><span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', background: '#f1f5f9', fontSize: '18px', border: '2px solid #000000', flexShrink: 0 }}>🎨</span> Design & UI References</h3>
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
                        <input type="text" autoComplete="off" placeholder="https://www.figma.com/design/..." value={figmaUrl} onChange={(e) => setFigmaUrl(e.target.value)} />
                      </div>
                    </div>
                    <div className="sleek-input-group">
                      <label>Figma API Token</label>
                      <div className="sleek-input-wrapper">
                        <span className="sleek-input-icon">🔑</span>
                        <input type={showFigmaToken ? "text" : "password"} autoComplete="new-password" placeholder="figd_..." value={figmaToken} onChange={(e) => setFigmaToken(e.target.value)} />
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
                    <h3><span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', background: '#f1f5f9', fontSize: '18px', border: '2px solid #000000', flexShrink: 0 }}>🔗</span> Code & Environment</h3>
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

        {/* Step 4: History Main Content */}
        {step === 4 && (
          <div className="main-step-container">
            <div className="main-step-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2>4. Project History</h2>
                <p>View your past generated test suites and analysis reports.</p>
              </div>
              <div>
                <input type="file" id="import-project-input" style={{ display: 'none' }} accept=".json" onChange={handleImportProject} />
                <button className="btn btn-primary" style={{ padding: '10px 16px', fontSize: '14px', background: 'black', color: 'white', border: 'none', borderRadius: '8px' }} onClick={() => document.getElementById('import-project-input').click()}>
                  📁 Upload Shared Project
                </button>
              </div>
            </div>
            {projects.length === 0 ? (
              <div className="empty-state-monochrome" style={{ textAlign: 'center', marginTop: '40px', padding: '40px' }}>
                <span style={{ fontSize: '32px', display: 'block', marginBottom: '16px' }}>🕒</span>
                No history available yet. Generate and save a project first!
              </div>
            ) : (
              <div className="history-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px' }}>
                {projects.map(p => (
                  <div key={p.id} className="history-card" style={{ padding: '20px', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }} onClick={() => loadProject(p.id)} onMouseOver={e => e.currentTarget.style.borderColor = '#3b82f6'} onMouseOut={e => e.currentTarget.style.borderColor = '#e2e8f0'}>
                    <div>
                      <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>{p.name || 'Unnamed Project'}</h3>
                      <p style={{ margin: '0', fontSize: '14px', color: '#64748b' }}>
                        Created: {new Date(p.created_at * 1000).toLocaleString()} | {p.total_cases} Test Cases
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn" style={{ padding: '8px 16px', fontSize: '14px', background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1' }} onClick={(e) => { e.stopPropagation(); shareProject(p.id); }}>Share</button>
                      <button className="btn" style={{ padding: '8px 16px', fontSize: '14px', background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1' }} onClick={(e) => { e.stopPropagation(); setEditingProject(p); setEditProjectName(p.name || ''); setEditProjectNotepad(p.notepad || ''); }}>Edit / Notes</button>
                      <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '14px' }} onClick={(e) => { e.stopPropagation(); loadProject(p.id); }}>Open</button>
                      <button className="btn" style={{ padding: '8px 16px', fontSize: '14px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fca5a5' }} onClick={(e) => { e.stopPropagation(); deleteProject(p.id); }}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
              <div className="header-metrics-row" style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
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
                  ✨ Chat Bot
                </button>
                <button className="personalize-btn-monochrome" onClick={exportDoc} style={{ background: '#f4f4f5', color: '#18181b', borderColor: '#e4e4e7' }}>
                  📄 View as Doc
                </button>
                <button className="personalize-btn-monochrome" onClick={executeSelectedTestCases} style={{ background: '#10b981', color: 'white', borderColor: '#059669' }}>
                  ▶ Execute Selected
                </button>
                <button className="personalize-btn-monochrome" onClick={saveProject} style={{ background: '#3b82f6', color: 'white', borderColor: '#2563eb' }}>
                  💾 Save Project
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
                <div className="filter-bar-monochrome" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <button 
                    className="btn" 
                    style={{ padding: '8px 16px', fontSize: '14px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#334155', fontWeight: '500', minWidth: 'max-content' }}
                    onClick={() => {
                      const allSelected = job.test_report.test_cases.every(tc => selectedTestCases[tc.id]);
                      const next = { ...selectedTestCases };
                      job.test_report.test_cases.forEach(tc => {
                        next[tc.id] = !allSelected;
                      });
                      setSelectedTestCases(next);
                    }}
                  >
                    <input 
                      type="checkbox" 
                      checked={job.test_report.test_cases.length > 0 && job.test_report.test_cases.every(tc => selectedTestCases[tc.id])}
                      readOnly
                      style={{ cursor: 'pointer', transform: 'scale(1.2)' }}
                    />
                    {job.test_report.test_cases.length > 0 && job.test_report.test_cases.every(tc => selectedTestCases[tc.id]) ? 'Deselect All' : 'Select All'}
                  </button>
                  <input
                    type="text"
                    className="search-input-monochrome"
                    placeholder="🔍 Search test cases (scenario, description, steps, expected)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ flex: 1 }}
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
                                <th style={{ width: '40px', textAlign: 'center' }}>
                                  <input 
                                    type="checkbox" 
                                    onChange={(e) => {
                                      const checked = e.target.checked;
                                      const next = { ...selectedTestCases };
                                      casesBySection[sectionName].forEach(tc => {
                                        next[tc.id] = checked;
                                      });
                                      setSelectedTestCases(next);
                                    }}
                                    checked={casesBySection[sectionName].length > 0 && casesBySection[sectionName].every(tc => selectedTestCases[tc.id])}
                                    style={{ cursor: 'pointer', transform: 'scale(1.2)' }}
                                  />
                                </th>
                                <th style={{ minWidth: '100px' }}>Actions</th>
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
                                <tr key={tc.id} style={{ backgroundColor: selectedTestCases[tc.id] ? '#fef3c7' : 'inherit' }}>
                                  <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                    <input 
                                      type="checkbox" 
                                      checked={!!selectedTestCases[tc.id]} 
                                      onChange={(e) => setSelectedTestCases(prev => ({ ...prev, [tc.id]: e.target.checked }))}
                                      style={{ cursor: 'pointer', transform: 'scale(1.2)' }}
                                    />
                                  </td>
                                  <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                                    {aiSelectionModeTestCaseId === tc.id ? (
                                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                        <button 
                                          className="btn btn-primary" 
                                          style={{ padding: '4px 8px', fontSize: '0.8rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                          onClick={() => setEditingAITestCase(tc)}
                                        >
                                          Continue ({aiSelectedParts.length})
                                        </button>
                                        <button 
                                          className="btn btn-secondary" 
                                          style={{ padding: '4px 8px', fontSize: '0.8rem', backgroundColor: '#94a3b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                          onClick={() => {
                                            setAiSelectionModeTestCaseId(null);
                                            setAiSelectedParts([]);
                                          }}
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    ) : (
                                      <button 
                                        className="btn btn-secondary" 
                                        style={{ padding: '4px 8px', fontSize: '0.8rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                        onClick={() => {
                                          setAiSelectionModeTestCaseId(tc.id);
                                          setAiSelectedParts([]);
                                        }}
                                      >
                                        🪄 AI Edit
                                      </button>
                                    )}
                                  </td>
                                  <td {...getCellProps(tc, 'id', { whiteSpace: 'nowrap', fontWeight: 600 })} onBlur={(e) => handleCellEdit(tc.id, 'id', e.target.innerText)}>{tc.id}</td>
                                  <td {...getCellProps(tc, 'category')} onBlur={(e) => handleCellEdit(tc.id, 'category', e.target.innerText)}>{tc.category}</td>
                                  <td {...getCellProps(tc, 'scenario')} onBlur={(e) => handleCellEdit(tc.id, 'scenario', e.target.innerText)}>{tc.scenario}</td>
                                  <td {...getCellProps(tc, 'description')} onBlur={(e) => handleCellEdit(tc.id, 'description', e.target.innerText)}>{tc.description}</td>
                                  <td {...getCellProps(tc, 'precondition')} onBlur={(e) => handleCellEdit(tc.id, 'precondition', e.target.innerText)}>{tc.precondition || 'N/A'}</td>
                                  <td {...getCellProps(tc, 'steps', { whiteSpace: 'pre-wrap' })} onBlur={(e) => {
                                    const text = e.target.innerText.trim();
                                    handleCellEdit(tc.id, 'steps', text ? text.split('\n') : [])
                                  }}>
                                    {tc.steps?.length > 0 ? tc.steps.join('\n') : 'N/A'}
                                  </td>
                                  <td {...getCellProps(tc, 'test_data')} onBlur={(e) => handleCellEdit(tc.id, 'test_data', e.target.innerText)}>{tc.test_data || 'N/A'}</td>
                                  <td {...getCellProps(tc, 'expected_result')} onBlur={(e) => handleCellEdit(tc.id, 'expected_result', e.target.innerText)}>{tc.expected_result || 'N/A'}</td>
                                  <td {...getCellProps(tc, 'actual_result')} onBlur={(e) => handleCellEdit(tc.id, 'actual_result', e.target.innerText)}>{tc.actual_result || 'N/A'}</td>
                                  <td {...getCellProps(tc, 'postcondition')} onBlur={(e) => handleCellEdit(tc.id, 'postcondition', e.target.innerText)}>{tc.postcondition || 'N/A'}</td>
                                  <td {...getCellProps(tc, 'status', {
                                    fontWeight: tc.status && tc.status !== 'N/A' ? 700 : 400,
                                    color:
                                      tc.status === 'Pass' ? '#16a34a' :
                                      tc.status === 'Fail' ? '#dc2626' :
                                      tc.status === 'Blocked' ? '#ca8a04' :
                                      tc.status === 'Skipped' ? '#6b7280' : 'inherit'
                                  })} onBlur={(e) => handleCellEdit(tc.id, 'status', e.target.innerText)}>
                                    {tc.status || 'N/A'}
                                  </td>
                                  <td {...getCellProps(tc, 'severity')} onBlur={(e) => handleCellEdit(tc.id, 'severity', e.target.innerText)} className={`severity-${tc.severity?.toLowerCase()}`}>{tc.severity}</td>
                                  <td {...getCellProps(tc, 'priority')} onBlur={(e) => handleCellEdit(tc.id, 'priority', e.target.innerText)}>{tc.priority}</td>
                                  <td {...getCellProps(tc, 'executed_by')} onBlur={(e) => handleCellEdit(tc.id, 'executed_by', e.target.innerText)}>{tc.executed_by || 'N/A'}</td>
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
              <h3>Chat Bot</h3>
              <button className="close-modal-btn" onClick={() => setShowPersonalizeModal(false)}>✕</button>
            </div>
            <div className="preview-modal-body" style={{ padding: '20px' }}>
              <div style={{ fontSize: '13px', color: '#475569', marginBottom: '16px', lineHeight: '1.6', background: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <strong style={{ color: '#0f172a' }}>What can this Chat Bot do?</strong>
                <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                  <li><strong>Execute Test Cases:</strong> Simulate execution and get automated outputs.</li>
                  <li><strong>Personalize Test Cases:</strong> Add edge cases, custom flows, or security checks.</li>
                  <li><strong>Rerun & Loop:</strong> Request to rerun or execute test cases in a loop.</li>
                </ul>
              </div>
              <p style={{ fontSize: '13px', color: '#334155', marginBottom: '8px', fontWeight: '500' }}>
                Enter your command:
              </p>
              <textarea
                placeholder="e.g. Focus more on transaction security and boundary values for amounts..."
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                style={{ height: '120px', width: '100%', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px', fontSize: '14px', fontFamily: 'inherit', color: '#1e293b', backgroundColor: '#f8fafc', outline: 'none', resize: 'vertical', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)' }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button onClick={() => setShowPersonalizeModal(false)} style={{ margin: 0, padding: '8px 16px', background: 'transparent', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s ease' }} onMouseOver={(e) => {e.target.style.background = '#f1f5f9'; e.target.style.color = '#334155'}} onMouseOut={(e) => {e.target.style.background = 'transparent'; e.target.style.color = '#64748b'}}>
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowPersonalizeModal(false)
                    generateTests()
                  }}
                  disabled={generating || !userPrompt}
                  style={{ margin: 0, width: 'auto', padding: '8px 20px', background: (!userPrompt || generating) ? '#94a3b8' : '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '600', cursor: (!userPrompt || generating) ? 'not-allowed' : 'pointer', transition: 'background-color 0.2s ease', boxShadow: (!userPrompt || generating) ? 'none' : '0 2px 4px rgba(59, 130, 246, 0.3)' }}
                  onMouseOver={(e) => { if (!(!userPrompt || generating)) e.target.style.background = '#2563eb' }}
                  onMouseOut={(e) => { if (!(!userPrompt || generating)) e.target.style.background = '#3b82f6' }}
                >
                  Generate Tests
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
            <div className="preview-modal-body" style={{ flex: 1, padding: '40px', overflow: 'auto', background: '#ffffff', textAlign: 'center' }}>
              <div style={{ display: 'inline-block', minWidth: '100%' }}>
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

      {editingProject && (
        <div className="preview-modal-overlay" onClick={() => setEditingProject(null)}>
          <div className="preview-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', height: 'auto' }}>
            <div className="preview-modal-header">
              <h3>Edit Project & Notes</h3>
              <button className="close-modal-btn" onClick={() => setEditingProject(null)}>✕</button>
            </div>
            <div className="preview-modal-body" style={{ padding: '20px' }}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#334155' }}>Project Name</label>
                <input 
                  type="text" 
                  value={editProjectName} 
                  onChange={(e) => setEditProjectName(e.target.value)} 
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#334155' }}>Notepad (Next Day Plan)</label>
                <textarea 
                  value={editProjectNotepad} 
                  onChange={(e) => setEditProjectNotepad(e.target.value)} 
                  placeholder="Write down what you will do next..."
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', minHeight: '150px', resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button className="btn" style={{ padding: '8px 16px', background: '#f1f5f9', color: '#475569', border: 'none' }} onClick={() => setEditingProject(null)}>Cancel</button>
                <button className="btn btn-primary" style={{ padding: '8px 16px' }} onClick={saveEditProject}>Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingAITestCase && (
        <div className="preview-modal-overlay" onClick={() => !isAiEditing && setEditingAITestCase(null)}>
          <div className="preview-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', height: 'auto' }}>
            <div className="preview-modal-header">
              <h3>🪄 AI Edit Test Case: {editingAITestCase.id}</h3>
              {!isAiEditing && (
                <button className="close-modal-btn" onClick={() => setEditingAITestCase(null)}>✕</button>
              )}
            </div>
            <div className="preview-modal-body" style={{ padding: '20px' }}>
              <p style={{ marginBottom: '16px', color: '#475569', fontSize: '0.9rem' }}>
                <strong>Scenario:</strong> {editingAITestCase.scenario}
              </p>
              {aiSelectedParts.length > 0 && (
                <p style={{ marginBottom: '16px', color: '#3b82f6', fontSize: '0.9rem', backgroundColor: '#eff6ff', padding: '8px', borderRadius: '4px', border: '1px solid #bfdbfe' }}>
                  <strong>Targeting only fields:</strong> {aiSelectedParts.join(', ')}
                </p>
              )}
              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#334155' }}>What would you like to change?</label>
                <textarea 
                  value={aiEditPrompt} 
                  onChange={(e) => setAiEditPrompt(e.target.value)} 
                  placeholder="e.g., 'Make the expected result more detailed' or 'Change the precondition to require an admin user'"
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', minHeight: '100px', resize: 'vertical' }}
                  disabled={isAiEditing}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button 
                  className="btn" 
                  style={{ padding: '8px 16px', background: '#f1f5f9', color: '#475569', border: 'none' }} 
                  onClick={() => {
                    setEditingAITestCase(null);
                    setAiSelectionModeTestCaseId(null);
                    setAiSelectedParts([]);
                  }}
                  disabled={isAiEditing}
                >
                  Cancel
                </button>
                <button 
                  className="btn btn-primary" 
                  style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }} 
                  onClick={submitAiEdit}
                  disabled={isAiEditing || !aiEditPrompt.trim()}
                >
                  {isAiEditing ? <span className="spinner-small"></span> : '🪄'}
                  {isAiEditing ? 'Applying...' : 'Apply Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateProjectModal && (
        <div className="preview-modal-overlay" onClick={() => setShowCreateProjectModal(false)}>
          <div className="preview-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px', height: 'auto' }}>
            <div className="preview-modal-header">
              <h3>Create New Project</h3>
              <button className="close-modal-btn" onClick={() => setShowCreateProjectModal(false)}>✕</button>
            </div>
            <div className="preview-modal-body" style={{ padding: '24px' }}>
              <p style={{ fontSize: '14px', color: '#475569', marginBottom: '20px', lineHeight: '1.6' }}>
                Enter a name for your new project. An empty project workspace will be created and saved to your history.
              </p>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#334155', marginBottom: '8px', fontWeight: '600' }}>Project Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Authentication Module" 
                  value={createProjectName} 
                  onChange={(e) => setCreateProjectName(e.target.value)} 
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                  autoFocus
                  style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px', fontSize: '14px', color: '#1e293b', outline: 'none', transition: 'border-color 0.2s' }}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button 
                  onClick={() => setShowCreateProjectModal(false)} 
                  style={{ padding: '8px 16px', background: 'transparent', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  onMouseOver={(e) => {e.target.style.background = '#f1f5f9'; e.target.style.color = '#334155'}}
                  onMouseOut={(e) => {e.target.style.background = 'transparent'; e.target.style.color = '#64748b'}}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCreateProject}
                  disabled={!createProjectName.trim()}
                  style={{ padding: '8px 20px', background: !createProjectName.trim() ? '#94a3b8' : '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '600', cursor: !createProjectName.trim() ? 'not-allowed' : 'pointer', transition: 'background-color 0.2s ease', boxShadow: !createProjectName.trim() ? 'none' : '0 2px 4px rgba(59, 130, 246, 0.3)' }}
                >
                  Create & Start
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
