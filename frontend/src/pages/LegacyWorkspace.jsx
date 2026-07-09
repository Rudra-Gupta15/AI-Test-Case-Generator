import Swal from 'sweetalert2';
import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import FilePreviewer, { ImageThumbnail } from '../components/common/FilePreviewer.jsx'
import Mermaid from '../components/common/Mermaid.jsx'
import TreeFolder from '../components/legacy/TreeFolder.jsx'
import { ANALYZE_STAGES } from '../utils/constants.js'

export default function LegacyWorkspace() {
  // Input states
  const navigate = useNavigate();
  const { id } = useParams();
  const { currentUser, logout } = useAuth();
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
  const [aiMode, setAiMode] = useState('strict')

  // Job & UI states
  const [job, setJob] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [userPrompt, setUserPrompt] = useState('')
  const [selectedView, setSelectedView] = useState({ type: 'all', id: null })
  const [generating, setGenerating] = useState(false)
  const [step, setStep] = useState(1) // 1 = Upload, 2 = Analysis, 3 = Test Report
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState('features') // Step 2 active tab
  const [featuresPage, setFeaturesPage] = useState(1)
  const [flowsPage, setFlowsPage] = useState(1)
  const [issuesPage, setIssuesPage] = useState(1)
  const itemsPerPage = 5
  const [previewFile, setPreviewFile] = useState(null) // Document preview state
  const [docPreviewHtml, setDocPreviewHtml] = useState(null)
  const [showPersonalizeModal, setShowPersonalizeModal] = useState(false)
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false)
  const [createProjectName, setCreateProjectName] = useState('')
  const [executionPopup, setExecutionPopup] = useState(null)
  const [historyPage, setHistoryPage] = useState(1)
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


  const renderPagination = (currentPage, totalItems, setPage, customItemsPerPage = itemsPerPage) => {
    const totalPages = Math.ceil(totalItems / customItemsPerPage)
    if (totalPages <= 1) return null
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '24px' }}>
        <button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: currentPage === 1 ? '#93c5fd' : '#3b82f6', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', color: '#ffffff', fontWeight: '500' }}
        >
          Previous
        </button>
        <span style={{ fontSize: '14px', color: '#64748b' }}>Page {currentPage} of {totalPages}</span>
        <button
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
          style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: currentPage === totalPages ? '#93c5fd' : '#3b82f6', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', color: '#ffffff', fontWeight: '500' }}
        >
          Next
        </button>
      </div>
    )
  }

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

  const [showLoadingModal, setShowLoadingModal] = useState(true)

  // Reset modal visibility when a new submission starts
  useEffect(() => {
    if (submitting) {
      setShowLoadingModal(true);
    }
  }, [submitting]);

  // Step 3 (Report) states
  const [reportFilter, setReportFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedCases, setExpandedCases] = useState({})
  const [checkedSteps, setCheckedSteps] = useState({})
  const [caseStatuses, setCaseStatuses] = useState({})
  const [viewFlowChart, setViewFlowChart] = useState(null)
  const [graphZoom, setGraphZoom] = useState(1)
  const [selectedTestCases, setSelectedTestCases] = useState({})

  const [isEditingTreeRoot, setIsEditingTreeRoot] = useState(false)
  const [editTreeRootName, setEditTreeRootName] = useState("")
  const [isTreeEditMode, setIsTreeEditMode] = useState(false)


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
        outline: isSelected ? '2px solid #3b82f6' : 'none',
        outlineOffset: '-2px',
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
      const token = localStorage.getItem('token');
      const response = await fetch('/api/projects', {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      })
      if (response.ok) {
        const data = await response.json()
        setProjects(data)
      }
    } catch (err) {
      console.error("Failed to fetch projects", err)
    }
  }

  useEffect(() => {
    fetchProjects().then(() => {
      if (id && id !== 'new') {
        loadProject(id)
      }
    })
  }, [id])

  const loadProject = async (id) => {
    try {
      const response = await fetch(`/api/projects/${id}`)
      if (response.ok) {
        const data = await response.json()
        const pName = projects.find(p => p.id === id)?.name || data.name || "Loaded Project";
        setJob({ ...data, name: pName, id })

        try {
          const filesResponse = await fetch(`/api/projects/${id}/files`);
          if (filesResponse.ok) {
            const filesData = await filesResponse.json();
            if (filesData.brd) setBrd(filesData.brd); else setBrd(null);
            if (filesData.fsd) setFsd(filesData.fsd); else setFsd(null);
            if (filesData.srs) setSrs(filesData.srs); else setSrs(null);
            if (filesData.frd) setFrd(filesData.frd); else setFrd(null);
            if (filesData.images) setImages(filesData.images); else setImages([]);
          }
        } catch (e) {
          console.error("Failed to load project files", e);
        }

        if (data.github_url) setGithubUrl(data.github_url);
        if (data.project_url) setProjectUrl(data.project_url);
        if (data.figma_url) setFigmaUrl(data.figma_url);

        setStep(1)
      } else {
        Swal.fire({
      title: "Failed to load project",
      icon: 'info',
      confirmButtonText: 'OK'
    })
      }
    } catch (err) {
      Swal.fire({
      title: "Error loading project: " + err.message,
      icon: 'info',
      confirmButtonText: 'OK'
    })
    }
  }

  const deleteProject = async (id) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "Are you sure you want to delete this project? This cannot be undone.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes'
    });
    if (!result.isConfirmed) return;
    try {
      const response = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      if (response.ok) {
        fetchProjects();
      } else {
        Swal.fire({
      title: "Failed to delete project",
      icon: 'info',
      confirmButtonText: 'OK'
    });
      }
    } catch (err) {
      Swal.fire({
      title: "Error deleting project: " + err.message,
      icon: 'info',
      confirmButtonText: 'OK'
    });
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
        downloadLink.download = `project_export_${data.id.substring(0, 6)}.json`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      } else {
        Swal.fire({
      title: 'Failed to fetch project for sharing',
      icon: 'info',
      confirmButtonText: 'OK'
    })
      }
    } catch (err) {
      Swal.fire({
      title: 'Error sharing project: ' + err.message,
      icon: 'info',
      confirmButtonText: 'OK'
    })
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
            Swal.fire({
      title: 'Project imported successfully!',
      icon: 'info',
      confirmButtonText: 'OK'
    });
            fetchProjects();
          } else {
            Swal.fire({
      title: 'Failed to import project',
      icon: 'info',
      confirmButtonText: 'OK'
    });
          }
        } catch (err) {
          Swal.fire({
      title: 'Error parsing or importing JSON: ' + err.message,
      icon: 'info',
      confirmButtonText: 'OK'
    });
        }
      };
      reader.readAsText(file);
    } catch (err) {
      Swal.fire({
      title: 'Failed to read file',
      icon: 'info',
      confirmButtonText: 'OK'
    });
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
          ai_mode: aiMode,
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
        Swal.fire({
      title: 'Failed to edit test case: ' + (updatedTestCase.error || 'Unknown error'),
      icon: 'info',
      confirmButtonText: 'OK'
    });
      }
    } catch (err) {
      Swal.fire({
      title: 'Error editing test case: ' + err.message,
      icon: 'info',
      confirmButtonText: 'OK'
    });
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
        Swal.fire({
      title: "Failed to update project",
      icon: 'info',
      confirmButtonText: 'OK'
    });
      }
    } catch (err) {
      Swal.fire({
      title: "Error updating project: " + err.message,
      icon: 'info',
      confirmButtonText: 'OK'
    });
    }
  };

  const executeSelectedTestCases = () => {
    const selectedIds = Object.keys(selectedTestCases).filter(id => selectedTestCases[id]);
    if (selectedIds.length === 0) {
      Swal.fire({
      title: "Warning",
      text: "Please select at least one test case to execute.",
      icon: "warning",
      confirmButtonText: "OK",
      confirmButtonColor: "#10b981"
    });
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
      }
    });

    setSelectedTestCases({});
    Swal.fire({
      title: "Success",
      text: `Successfully executed ${selectedIds.length} test case(s)!`,
      icon: "success",
      confirmButtonText: "OK",
      confirmButtonColor: "#10b981"
    });
  };

  const executeSingleTestCase = (tcId) => {
    setJob((prev) => {
      if (!prev?.test_report?.test_cases) return prev;
      const newCases = prev.test_report.test_cases.map(tc => {
        if (tc.id === tcId) {
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
      }
    });
    Swal.fire({
      title: "Success",
      text: "Successfully executed 1 test case!",
      icon: "success",
      confirmButtonText: "OK",
      confirmButtonColor: "#10b981"
    });
  };

  const saveProject = async () => {
    if (!job?.test_report) return
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/projects/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ job_id: job.id }),
      })
      if (response.ok) {
        Swal.fire({
      title: "Project saved successfully!",
      icon: 'info',
      confirmButtonText: 'OK'
    })
        fetchProjects()
      } else {
        Swal.fire({
      title: "Failed to save project.",
      icon: 'info',
      confirmButtonText: 'OK'
    })
      }
    } catch (err) {
      Swal.fire({
      title: "Error saving project: " + err.message,
      icon: 'info',
      confirmButtonText: 'OK'
    })
    }
  }


  const handleRemoveFile = (fileName, setter) => {
    Swal.fire({
      title: "Remove File?",
      text: `Are you sure you want to remove ${fileName}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#cbd5e1",
      confirmButtonText: "Remove",
      cancelButtonText: "Cancel"
    }).then((result) => {
      if (result.isConfirmed) {
        setter(null);
      }
    });
  };

  const handleRemoveImage = (index) => {
    Swal.fire({
      title: "Remove Image?",
      text: "Are you sure you want to remove this image?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#cbd5e1",
      confirmButtonText: "Remove",
      cancelButtonText: "Cancel"
    }).then((result) => {
      if (result.isConfirmed) {
        setImages(prev => prev.filter((_, i) => i !== index));
      }
    });
  };

  const startAnalysis = async () => {
    setSubmitting(true)
    setJob(null)

    const formData = new FormData()
    if (brd instanceof File) formData.append('brd', brd)
    if (fsd instanceof File) formData.append('fsd', fsd)
    if (srs instanceof File) formData.append('srs', srs)
    if (frd instanceof File) formData.append('frd', frd)
    if (figmaUrl) formData.append('figma_url', figmaUrl)
    if (figmaToken) formData.append('figma_token', figmaToken)
    if (githubUrl) formData.append('github_url', githubUrl)
    if (projectUrl) formData.append('project_url', projectUrl)
    formData.append('deep', deep)
    formData.append('ai_mode', aiMode)
    if (id && id !== 'new') formData.append('project_id', id)
    // Only append real File objects — skip metadata objects from loadProject
    images.forEach((img) => { if (img instanceof File) formData.append('images', img) })

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
      try {
        const res = await fetch(`/api/job/${jobId}`)
        if (!res.ok) {
          clearInterval(pollRef.current)
          setSubmitting(false)
          setGenerating(false)
          return
        }
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
      } catch (e) {
        clearInterval(pollRef.current)
        setSubmitting(false)
        setGenerating(false)
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
        Swal.fire({
      title: "Success",
      text: "Execution completed successfully!",
      icon: "success",
      confirmButtonText: "OK",
      confirmButtonColor: "#10b981"
    });
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
        Swal.fire({
      title: "Failed to create project",
      icon: 'info',
      confirmButtonText: 'OK'
    });
      }
    } catch (e) {
      Swal.fire({
      title: "Error: " + e.message,
      icon: 'info',
      confirmButtonText: 'OK'
    });
    }
  };

  // Helper calculations
  const stageIndex = job ? ANALYZE_STAGES.findIndex((s) => s.key === job.stage) : -1
  const showAnalyzeRail = submitting && job && !job.understanding

  // Step 2 counts
  const featuresList = Array.isArray(job?.understanding?.features) ? job.understanding.features : []
  const flowsList = Array.isArray(job?.understanding?.flows) ? job.understanding.flows : []
  const inconsistenciesList = Array.isArray(job?.understanding?.inconsistencies) ? job.understanding.inconsistencies : []
  const gapsList = Array.isArray(job?.understanding?.gaps) ? job.understanding.gaps : []

  const featuresCount = featuresList.length
  const flowsCount = flowsList.length
  const totalIssues = inconsistenciesList.length + gapsList.length

  // Step 3 calculations
  const cases = Array.isArray(job?.test_report?.test_cases) ? job.test_report.test_cases : []
  const categories = ['All', ...new Set(cases.map((c) => c.category))]
  const filteredCases = cases.filter((tc) => {
    const matchesCategory = reportFilter === 'All' || tc.category === reportFilter
    const matchesSearch =
      (tc.scenario && tc.scenario.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (tc.description && tc.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (tc.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      tc.steps?.some((s) => (s || '').toLowerCase().includes(searchQuery.toLowerCase())) ||
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
${Array.isArray(tc.steps) ? tc.steps.map((s) => `${s}`).join('\n') : (tc.steps || 'N/A')}

**Test Data:** \`${tc.test_data || 'None'}\`
**Expected Result:** ${tc.expected_result}
**Postcondition:** ${tc.postcondition || 'None'}`

    navigator.clipboard.writeText(md)
    Swal.fire({
      title: `Copied ${tc.id} to clipboard as Markdown!`,
      icon: 'info',
      confirmButtonText: 'OK'
    })
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
                <td>${Array.isArray(tc.steps) ? tc.steps.join('<br/>') : (tc.steps || 'N/A')}</td>
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
      {step === 3 && !sidebarCollapsed && (
        <div className="app-sidebar" style={{ width: sidebarWidth, flexBasis: sidebarWidth, paddingTop: '16px' }}>
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
            <div style={{ padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', width: '100%', marginBottom: '24px' }}>
              <img src="/Logo.png" alt="Prevoyance IT Solutions" style={{ width: '100%', maxWidth: '160px', height: 'auto', objectFit: 'contain' }} />
            </div>
          )}

          {/* Step-Specific Sidebar Content */}

          <div className="sidebar-middle" style={{ marginTop: step === 3 ? 0 : undefined }}>
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
                  const cases = Array.isArray(job.test_report?.test_cases) ? job.test_report.test_cases : []
                  cases.forEach((tc) => {
                    const sec = tc.section || 'General'
                    if (!treeData[sec]) treeData[sec] = []
                    treeData[sec].push(tc)
                  })

                  return (
                    <div className="test-explorer-tree">
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
                        <button
                          onClick={() => {
                            setIsTreeEditMode(!isTreeEditMode);
                            if (isTreeEditMode) setIsEditingTreeRoot(false);
                          }}
                          style={{
                            background: isTreeEditMode ? '#10b981' : 'transparent',
                            color: isTreeEditMode ? 'white' : '#94a3b8',
                            border: isTreeEditMode ? 'none' : '1px solid #3f3f46',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <i className={`fa-solid ${isTreeEditMode ? 'fa-check' : 'fa-pen-to-square'}`}></i>
                          {isTreeEditMode ? 'Done Editing' : 'Edit Mode'}
                        </button>
                      </div>
                      <div className="tree-root" onClick={() => { if (!isTreeEditMode) setSelectedView({ type: 'all', id: null }) }} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                          <span className="tree-icon">📁</span>
                          {isTreeEditMode && (
                            <input
                              type="checkbox"
                              checked={isEditingTreeRoot}
                              onChange={(e) => {
                                e.stopPropagation();
                                setIsEditingTreeRoot(e.target.checked);
                                if (e.target.checked) setEditTreeRootName(job.understanding?.product_type || "Test Project");
                              }}
                              style={{ marginRight: '4px' }}
                            />
                          )}
                          {isTreeEditMode && isEditingTreeRoot ? (
                            <input
                              type="text"
                              value={editTreeRootName}
                              onChange={(e) => setEditTreeRootName(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              onBlur={() => {
                                if (editTreeRootName.trim()) {
                                  setJob(prev => ({ ...prev, understanding: { ...prev.understanding, product_type: editTreeRootName } }))
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.stopPropagation()
                                  if (editTreeRootName.trim()) {
                                    setJob(prev => ({ ...prev, understanding: { ...prev.understanding, product_type: editTreeRootName } }))
                                  }
                                }
                              }}
                              autoFocus
                              style={{ flex: 1, background: '#1e293b', border: '1px solid #3b82f6', borderRadius: '4px', color: 'white', padding: '2px 6px', fontSize: '13px', outline: 'none', minWidth: 0 }}
                            />
                          ) : (
                            <span className="tree-label" style={{ flex: 1, whiteSpace: 'normal', wordBreak: 'break-word', overflow: 'hidden', textOverflow: 'ellipsis' }}>{job.understanding?.product_type || "Test Project"}</span>
                          )}
                        </div>
                      </div>
                      <div className="tree-children">
                        {Object.keys(treeData).map((sec, idx) => (
                          <TreeFolder
                            key={idx}
                            section={sec}
                            testCases={treeData[sec]}
                            selectedView={selectedView}
                            isTreeEditMode={isTreeEditMode}
                            onSelect={(type, id) => setSelectedView({ type, id })}
                            onRenameSection={(oldName, newName) => {
                              setJob(prev => {
                                if (!prev?.test_report?.test_cases) return prev;
                                const newCases = prev.test_report.test_cases.map(tc => {
                                  if ((tc.section || 'General') === oldName) {
                                    return { ...tc, section: newName };
                                  }
                                  return tc;
                                })
                                return { ...prev, test_report: { ...prev.test_report, test_cases: newCases } }
                              })
                              if (selectedView?.type === 'section' && selectedView?.id === oldName) {
                                setSelectedView({ type: 'section', id: newName })
                              }
                            }}
                            onRenameTestCase={(tcId, newName) => {
                              setJob(prev => {
                                if (!prev?.test_report?.test_cases) return prev;
                                const newCases = prev.test_report.test_cases.map(tc => {
                                  if (tc.id === tcId) {
                                    return { ...tc, scenario: newName };
                                  }
                                  return tc;
                                })
                                return { ...prev, test_report: { ...prev.test_report, test_cases: newCases } }
                              })
                            }}
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
                    <circle cx="150" cy="50" r="4" fill="#60a5fa" className="float-anim" style={{ animationDelay: '0s' }} />
                    <circle cx="40" cy="130" r="3" fill="#a78bfa" className="float-anim" style={{ animationDelay: '1s' }} />
                    <circle cx="140" cy="160" r="5" fill="#818cf8" className="float-anim" style={{ animationDelay: '2s' }} />
                  </svg>
                </div>

                <h2 style={{ fontSize: '20px', fontWeight: 'bold', background: 'linear-gradient(to right, #93c5fd, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '12px', textAlign: 'center' }}>
                  Project Archives
                </h2>
                <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.6', textAlign: 'center', marginBottom: '40px', padding: '0 10px' }}>
                  Access your past test suites. Pick up exactly where you left off.
                </p>

                <div style={{ width: '100%', padding: '0 10px' }}>
                  <h3 style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#3b82f6', marginBottom: '16px', borderBottom: '1px solid #334155', paddingBottom: '8px' }}>
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
                          <div style={{ color: '#3b82f6', fontSize: '11px', marginTop: '4px' }}>{p.total_cases} tests</div>
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
      )}

      <div className={`app-main-content step-${step}`}>

        {/* Floating Capsule Navbar */}
        <div className="floating-navbar-container">
          <div className="floating-navbar" style={{ padding: '16px 24px' }}>
            <div className="nav-brand" style={{ gap: '10px', alignItems: 'center', display: 'flex' }}>
              {step === 3 && (
                <button
                  onClick={() => setSidebarCollapsed(prev => !prev)}
                  title={sidebarCollapsed ? "Show Folder Tree" : "Hide Folder Tree"}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '8px',
                    borderRadius: '50%',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#ffffff'; }}
                  onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}
                >
                  <i className={`fa-solid ${sidebarCollapsed ? 'fa-circle-chevron-right' : 'fa-circle-chevron-left'}`} style={{ fontSize: '22px' }}></i>
                </button>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer' }} onClick={() => navigate('/projects')}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src="/Logo.png" alt="Logo" style={{ height: '44px', width: 'auto', objectFit: 'contain', borderRadius: '4px' }} />
                </div>
                <span className="nav-brand-name" style={{ background: 'linear-gradient(to right, #ffffff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: '800', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>AI QA REVIEWER</span>
              </div>
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
                    setShowLoadingModal(true)
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
            <button className="nav-email-btn" onClick={() => navigate("/project/new/legacy")}>
              {/* <button className="nav-email-btn" onClick={() => setShowCreateProjectModal(true)}> */}

              Create Project
            </button>
          </div>
        </div>

        {/* Step 1: Upload Main Content */}
        {step === 1 && (
          <div className="main-step-container">
            <div className="main-step-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2>1. Upload Specifications</h2>
                <p>Provide your product documents and design references below. You can analyze using any single document or design reference.</p>
              </div>
              {job?.name && (
                <div className="active-workspace-nav-pill" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', marginTop: '4px', cursor: 'pointer' }}>
                  <div style={{ position: 'relative', width: '8px', height: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <div className="pulse-ring" style={{ width: '18px', height: '18px' }}></div>
                    <div className="active-project-dot" style={{ width: '8px', height: '8px', background: '#10b981' }}></div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
                    <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#10b981', fontWeight: '800' }}>Active Workspace</span>
                    <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '700', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.name}</span>
                  </div>
                  <span style={{ fontSize: '14px', color: '#3b82f6', fontWeight: '600', marginLeft: '8px' }}>›</span>
                </div>
              )}
            </div>

              <div className="upload-inputs-container new-sleek-design">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '32px', alignItems: 'stretch', width: '100%' }}>
                  {/* COLUMN 1: PROJECT DOCUMENTS */}
                  <div className="sleek-column" style={{ display: 'flex', flexDirection: 'column', gap: '24px', flex: '1 1 300px', width: '100%', minWidth: 0, background: 'transparent', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', boxSizing: 'border-box', alignSelf: 'stretch', minHeight: '100%' }}>
                    {/* SECTION 1: PROJECT DOCUMENTS */}
                    <div className="sleek-section">
                      <div className="sleek-section-header">
                        <h3><span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', border: '1.5px solid #f59e0b', color: '#f59e0b', background: '#fffbeb', fontSize: '16px', flexShrink: 0 }}>📁</span> Project Documents</h3>
                        <p>Upload any requirements or spec documents (Optional)</p>
                      </div>
                      <div className="sleek-upload-list">

                        {/* BRD */}
                        <div className={`sleek-list-item ${brd ? 'has-file' : ''}`} style={{ padding: '16px 20px', border: brd ? '1px solid #10b981' : '1px solid #e2e8f0', background: brd ? '#f0fdf4' : '#fff', borderRadius: '12px', marginBottom: '12px', display: 'flex', flexDirection: brd ? 'column' : 'row', alignItems: brd ? 'stretch' : 'center', justifyContent: 'space-between', gap: brd ? '12px' : '0' }}>
                          <div className="sleek-item-left" style={{ display: 'flex', alignItems: 'center', minWidth: 'max-content', marginRight: brd ? '0' : '16px' }}>
                            <span style={{ color: '#f59e0b', fontSize: '18px', marginRight: '8px', display: 'flex', alignItems: 'center' }}>📁</span>
                            <span className="sleek-item-label" style={{ fontWeight: '600', whiteSpace: 'nowrap' }}>BRD (Business Requirements)</span>
                          </div>
                          <div className="sleek-item-right" style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: brd ? 'none' : 1, width: brd ? '100%' : 'auto', minWidth: 0, justifyContent: brd ? 'stretch' : 'flex-end' }}>
                            {brd ? (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: '#fff', border: '1px solid #a7f3d0', padding: '10px 14px', borderRadius: '10px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', overflow: 'hidden', flex: 1, marginRight: '16px' }}>
                                  <i className="fa-solid fa-file-lines" style={{ color: '#10b981', marginRight: '10px', fontSize: '16px' }}></i>
                                  <span className="sleek-filename" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#047857', fontWeight: '500', fontSize: '14px' }} title={brd.name}>{brd.name}</span>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                                  <button type="button" className="sleek-icon-btn" style={{ border: '1px solid #000', background: '#ecfdf5', color: '#059669', borderRadius: '8px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={() => setPreviewFile(brd)} title="Preview"><i className="fa-solid fa-eye"></i></button>
                                  <button type="button" className="sleek-icon-btn danger" style={{ border: '1px solid #000', background: '#fef2f2', color: '#dc2626', borderRadius: '8px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={() => handleRemoveFile(brd.name, setBrd)} title="Remove"><i className="fa-solid fa-trash-can"></i></button>
                                </div>
                              </div>
                            ) : (
                              <label className="sleek-upload-btn" style={{ borderColor: '#3b82f6', color: '#ffffff', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', height: '40px', padding: '0 16px', borderRadius: '8px', cursor: 'pointer', border: '1px solid #3b82f6', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                <span style={{ fontSize: '16px', marginBottom: '2px' }}>↑</span> <span style={{ fontWeight: '600' }}>Upload</span>
                                <input type="file" accept=".pdf,.docx,.doc,.txt,.md" onChange={(e) => setBrd(e.target.files[0])} className="hidden-file-input" />
                              </label>
                            )}
                          </div>
                        </div>

                        {/* FSD */}
                        <div className={`sleek-list-item ${fsd ? 'has-file' : ''}`} style={{ padding: '16px 20px', border: fsd ? '1px solid #10b981' : '1px solid #e2e8f0', background: fsd ? '#f0fdf4' : '#fff', borderRadius: '12px', marginBottom: '12px', display: 'flex', flexDirection: fsd ? 'column' : 'row', alignItems: fsd ? 'stretch' : 'center', justifyContent: 'space-between', gap: fsd ? '12px' : '0' }}>
                          <div className="sleek-item-left" style={{ display: 'flex', alignItems: 'center', minWidth: 'max-content', marginRight: fsd ? '0' : '16px' }}>
                            <span style={{ color: '#f59e0b', fontSize: '18px', marginRight: '8px', display: 'flex', alignItems: 'center' }}>📁</span>
                            <span className="sleek-item-label" style={{ fontWeight: '600', whiteSpace: 'nowrap' }}>FSD (Functional Specs)</span>
                          </div>
                          <div className="sleek-item-right" style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: fsd ? 'none' : 1, width: fsd ? '100%' : 'auto', minWidth: 0, justifyContent: fsd ? 'stretch' : 'flex-end' }}>
                            {fsd ? (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: '#fff', border: '1px solid #a7f3d0', padding: '10px 14px', borderRadius: '10px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', overflow: 'hidden', flex: 1, marginRight: '16px' }}>
                                  <i className="fa-solid fa-file-lines" style={{ color: '#10b981', marginRight: '10px', fontSize: '16px' }}></i>
                                  <span className="sleek-filename" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#047857', fontWeight: '500', fontSize: '14px' }} title={fsd.name}>{fsd.name}</span>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                                  <button type="button" className="sleek-icon-btn" style={{ border: '1px solid #000', background: '#ecfdf5', color: '#059669', borderRadius: '8px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={() => setPreviewFile(fsd)} title="Preview"><i className="fa-solid fa-eye"></i></button>
                                  <button type="button" className="sleek-icon-btn danger" style={{ border: '1px solid #000', background: '#fef2f2', color: '#dc2626', borderRadius: '8px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={() => handleRemoveFile(fsd.name, setFsd)} title="Remove"><i className="fa-solid fa-trash-can"></i></button>
                                </div>
                              </div>
                            ) : (
                              <label className="sleek-upload-btn" style={{ borderColor: '#3b82f6', color: '#ffffff', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', height: '40px', padding: '0 16px', borderRadius: '8px', cursor: 'pointer', border: '1px solid #3b82f6', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                <span style={{ fontSize: '16px', marginBottom: '2px' }}>↑</span> <span style={{ fontWeight: '600' }}>Upload</span>
                                <input type="file" accept=".pdf,.docx,.doc,.txt,.md" onChange={(e) => setFsd(e.target.files[0])} className="hidden-file-input" />
                              </label>
                            )}
                          </div>
                        </div>

                        {/* SRS */}
                        <div className={`sleek-list-item ${srs ? 'has-file' : ''}`} style={{ padding: '16px 20px', border: srs ? '1px solid #10b981' : '1px solid #e2e8f0', background: srs ? '#f0fdf4' : '#fff', borderRadius: '12px', marginBottom: '12px', display: 'flex', flexDirection: srs ? 'column' : 'row', alignItems: srs ? 'stretch' : 'center', justifyContent: 'space-between', gap: srs ? '12px' : '0' }}>
                          <div className="sleek-item-left" style={{ display: 'flex', alignItems: 'center', minWidth: 'max-content', marginRight: srs ? '0' : '16px' }}>
                            <span style={{ color: '#f59e0b', fontSize: '18px', marginRight: '8px', display: 'flex', alignItems: 'center' }}>📁</span>
                            <span className="sleek-item-label" style={{ fontWeight: '600', whiteSpace: 'nowrap' }}>SRS (Software Requirements)</span>
                          </div>
                          <div className="sleek-item-right" style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: srs ? 'none' : 1, width: srs ? '100%' : 'auto', minWidth: 0, justifyContent: srs ? 'stretch' : 'flex-end' }}>
                            {srs ? (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: '#fff', border: '1px solid #a7f3d0', padding: '10px 14px', borderRadius: '10px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', overflow: 'hidden', flex: 1, marginRight: '16px' }}>
                                  <i className="fa-solid fa-file-lines" style={{ color: '#10b981', marginRight: '10px', fontSize: '16px' }}></i>
                                  <span className="sleek-filename" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#047857', fontWeight: '500', fontSize: '14px' }} title={srs.name}>{srs.name}</span>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                                  <button type="button" className="sleek-icon-btn" style={{ border: '1px solid #000', background: '#ecfdf5', color: '#059669', borderRadius: '8px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={() => setPreviewFile(srs)} title="Preview"><i className="fa-solid fa-eye"></i></button>
                                  <button type="button" className="sleek-icon-btn danger" style={{ border: '1px solid #000', background: '#fef2f2', color: '#dc2626', borderRadius: '8px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={() => handleRemoveFile(srs.name, setSrs)} title="Remove"><i className="fa-solid fa-trash-can"></i></button>
                                </div>
                              </div>
                            ) : (
                              <label className="sleek-upload-btn" style={{ borderColor: '#3b82f6', color: '#ffffff', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', height: '40px', padding: '0 16px', borderRadius: '8px', cursor: 'pointer', border: '1px solid #3b82f6', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                <span style={{ fontSize: '16px', marginBottom: '2px' }}>↑</span> <span style={{ fontWeight: '600' }}>Upload</span>
                                <input type="file" accept=".pdf,.docx,.doc,.txt,.md" onChange={(e) => setSrs(e.target.files[0])} className="hidden-file-input" />
                              </label>
                            )}
                          </div>
                        </div>

                        {/* FRD */}
                        <div className={`sleek-list-item ${frd ? 'has-file' : ''}`} style={{ padding: '16px 20px', border: frd ? '1px solid #10b981' : '1px solid #e2e8f0', background: frd ? '#f0fdf4' : '#fff', borderRadius: '12px', marginBottom: '12px', display: 'flex', flexDirection: frd ? 'column' : 'row', alignItems: frd ? 'stretch' : 'center', justifyContent: 'space-between', gap: frd ? '12px' : '0' }}>
                          <div className="sleek-item-left" style={{ display: 'flex', alignItems: 'center', minWidth: 'max-content', marginRight: frd ? '0' : '16px' }}>
                            <span style={{ color: '#f59e0b', fontSize: '18px', marginRight: '8px', display: 'flex', alignItems: 'center' }}>📁</span>
                            <span className="sleek-item-label" style={{ fontWeight: '600', whiteSpace: 'nowrap' }}>FRD (Functional Requirements)</span>
                          </div>
                          <div className="sleek-item-right" style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: frd ? 'none' : 1, width: frd ? '100%' : 'auto', minWidth: 0, justifyContent: frd ? 'stretch' : 'flex-end' }}>
                            {frd ? (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: '#fff', border: '1px solid #a7f3d0', padding: '10px 14px', borderRadius: '10px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', overflow: 'hidden', flex: 1, marginRight: '16px' }}>
                                  <i className="fa-solid fa-file-lines" style={{ color: '#10b981', marginRight: '10px', fontSize: '16px' }}></i>
                                  <span className="sleek-filename" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#047857', fontWeight: '500', fontSize: '14px' }} title={frd.name}>{frd.name}</span>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                                  <button type="button" className="sleek-icon-btn" style={{ border: '1px solid #000', background: '#ecfdf5', color: '#059669', borderRadius: '8px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={() => setPreviewFile(frd)} title="Preview"><i className="fa-solid fa-eye"></i></button>
                                  <button type="button" className="sleek-icon-btn danger" style={{ border: '1px solid #000', background: '#fef2f2', color: '#dc2626', borderRadius: '8px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={() => handleRemoveFile(frd.name, setFrd)} title="Remove"><i className="fa-solid fa-trash-can"></i></button>
                                </div>
                              </div>
                            ) : (
                              <label className="sleek-upload-btn" style={{ borderColor: '#3b82f6', color: '#ffffff', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', height: '40px', padding: '0 16px', borderRadius: '8px', cursor: 'pointer', border: '1px solid #3b82f6', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                <span style={{ fontSize: '16px', marginBottom: '2px' }}>↑</span> <span style={{ fontWeight: '600' }}>Upload</span>
                                <input type="file" accept=".pdf,.docx,.doc,.txt,.md" onChange={(e) => setFrd(e.target.files[0])} className="hidden-file-input" />
                              </label>
                            )}
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>

                  {/* COLUMN 2: DESIGN & UI REFERENCES */}
                  <div className="sleek-column" style={{ display: 'flex', flexDirection: 'column', gap: '24px', flex: '1 1 300px', width: '100%', minWidth: 0, background: 'transparent', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', boxSizing: 'border-box', alignSelf: 'stretch', minHeight: '100%' }}>
                    {/* SECTION 2: DESIGN & UI */}
                    <div className="sleek-section">
                      <div className="sleek-section-header">
                        <h3><span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', border: '1.5px solid #ec4899', color: '#ec4899', background: '#fdf2f8', fontSize: '16px', flexShrink: 0 }}><i className="fa-solid fa-palette"></i></span> Design & UI References</h3>
                        <p>Upload mockup images or link your Figma designs (Optional)</p>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
                        <div className="sleek-list-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: images.length > 0 ? '16px' : '0', padding: '16px 20px' }}>
                          <span className="sleek-item-label" style={{ fontWeight: '600' }}>Reference Mockups (Images)</span>
                          <label className="sleek-upload-btn" style={{ borderColor: '#3b82f6', color: '#ffffff', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', height: '40px', padding: '0 16px', borderRadius: '8px', cursor: 'pointer', border: '1px solid #3b82f6', whiteSpace: 'nowrap' }}>
                            <span style={{ fontSize: '16px', marginBottom: '2px' }}>↑</span> <span style={{ fontWeight: '600' }}>{images.length > 0 ? 'Add More' : 'Upload Images'}</span>
                            <input type="file" multiple accept="image/*" onChange={(e) => setImages([...images, ...Array.from(e.target.files)])} className="hidden-file-input" />
                          </label>
                        </div>
                        {images.length > 0 && (
                          <div className="sleek-images-gallery">
                            {images.map((img, index) => (
                              <div key={index} className="sleek-image-thumb">
                                <button type="button" className="sleek-remove-img" onClick={() => handleRemoveImage(index)}>✕</button>
                                <ImageThumbnail file={img} />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="sleek-inputs-row" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div className="sleek-input-group">
                          <label style={{ fontSize: '13.5px', fontWeight: '700', color: '#1e293b', marginBottom: '10px', display: 'block' }}>Figma File URL</label>
                          <div className="sleek-input-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <span style={{ position: 'absolute', left: '16px', color: '#F24E1E', fontSize: '16px', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}><i className="fa-brands fa-figma"></i></span>
                            <input type="text" autoComplete="off" value={figmaUrl} onChange={(e) => setFigmaUrl(e.target.value)} style={{ width: '100%', height: '52px', padding: '0 16px 0 44px', borderRadius: '8px', border: 'none', background: 'transparent', outline: 'none', boxSizing: 'border-box', fontSize: '14px' }} placeholder="https://www.figma.com/file/..." />
                          </div>
                        </div>
                        <div className="sleek-input-group">
                          <label style={{ fontSize: '13.5px', fontWeight: '700', color: '#1e293b', marginBottom: '10px', display: 'block' }}>Figma API Token</label>
                          <div className="sleek-input-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <span style={{ position: 'absolute', left: '16px', color: '#eab308', fontSize: '16px', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}><i className="fa-solid fa-key"></i></span>
                            <input type={showFigmaToken ? "text" : "password"} autoComplete="new-password" value={figmaToken} onChange={(e) => setFigmaToken(e.target.value)} style={{ width: '100%', height: '52px', padding: '0 48px 0 44px', borderRadius: '8px', border: 'none', background: 'transparent', outline: 'none', boxSizing: 'border-box', fontSize: '14px' }} placeholder="Enter your Figma API token" />
                            <button type="button" className="sleek-icon-btn" style={{ position: 'absolute', right: '12px', border: 'none', background: 'transparent', width: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', cursor: 'pointer' }} onClick={() => setShowFigmaToken(!showFigmaToken)} title={showFigmaToken ? "Hide Token" : "Show Token"}>
                              {showFigmaToken ? '🙈' : '👁️'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* COLUMN 3: EXTERNAL LINKS & SUBMIT ACTIONS */}
                  <div className="sleek-column" style={{ display: 'flex', flexDirection: 'column', gap: '24px', flex: '1 1 300px', width: '100%', minWidth: 0, background: 'transparent', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', boxSizing: 'border-box', alignSelf: 'stretch', minHeight: '100%' }}>
                    {/* SECTION 3: EXTERNAL LINKS */}
                    <div className="sleek-section">
                      <div className="sleek-section-header">
                        <h3><span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', border: '1.5px solid #1e293b', color: '#1e293b', background: '#f1f5f9', fontSize: '16px', flexShrink: 0 }}><i className="fa-solid fa-code"></i></span> Code & Environment</h3>
                        <p>Link your repository and deployed application (Optional)</p>
                      </div>
                      <div className="sleek-inputs-row" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div className="sleek-input-group">
                          <label style={{ fontSize: '13.5px', fontWeight: '700', color: '#1e293b', marginBottom: '10px', display: 'block' }}>GitHub Repository URL</label>
                          <div className="sleek-input-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <span style={{ position: 'absolute', left: '16px', color: '#3b82f6', fontSize: '18px', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                              <i className="fa-brands fa-github"></i>
                            </span>
                            <input type="text" value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} style={{ width: '100%', height: '52px', padding: '0 16px 0 44px', borderRadius: '8px', border: 'none', background: 'transparent', outline: 'none', boxSizing: 'border-box', fontSize: '14px' }} placeholder="https://github.com/username/repo" />
                          </div>
                        </div>
                        <div className="sleek-input-group">
                          <label style={{ fontSize: '13.5px', fontWeight: '700', color: '#1e293b', marginBottom: '10px', display: 'block' }}>Deployed Project URL</label>
                          <div className="sleek-input-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <span style={{ position: 'absolute', left: '16px', color: '#14b8a6', fontSize: '16px', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}><i className="fa-solid fa-globe"></i></span>
                            <input type="text" value={projectUrl} onChange={(e) => setProjectUrl(e.target.value)} style={{ width: '100%', height: '52px', padding: '0 16px 0 44px', borderRadius: '8px', border: 'none', background: 'transparent', outline: 'none', boxSizing: 'border-box', fontSize: '14px' }} placeholder="https://your-deployed-app.com" />
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

                {/* SUBMIT ACTIONS SECTION CARD */}
                <div className="sleek-section" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 24px 20px 24px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'center', alignItems: 'flex-start', width: 'fit-content', maxWidth: '900px', alignSelf: 'center', margin: '-8px auto 0' }}>
                  <div className="toggle-row sleek-toggle" style={{ margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '10px' }}>
                    <input type="checkbox" id="deep" checked={deep} onChange={(e) => setDeep(e.target.checked)} style={{ width: '16px', height: '16px', margin: 0, cursor: 'pointer' }} />
                    <label htmlFor="deep" style={{ fontWeight: '600', color: '#475569', fontSize: '13.5px', cursor: 'pointer', lineHeight: '1.4' }}>Deep mode (gpt-oss:120b — slower, extremely thorough)</label>
                  </div>
                  <div style={{ width: '100%', marginBottom: '4px' }}>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
                      <select id="aiMode" value={aiMode} onChange={(e) => setAiMode(e.target.value)} style={{ width: '100%', height: '44px', padding: '0 40px 0 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '14.5px', color: '#334155', fontWeight: '400', outline: 'none', cursor: 'pointer', appearance: 'none', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }} onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)' }} onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)' }}>
                        <option value="strict">Strict Mode</option>
                        <option value="creative">Creative Mode</option>
                      </select>
                      <span style={{ position: 'absolute', right: '14px', color: '#475569', fontSize: '12px', pointerEvents: 'none' }}><i className="fa-solid fa-chevron-down"></i></span>
                    </div>
                  </div>
                  <button
                    className="sleek-submit-btn"
                    onClick={startAnalysis}
                    disabled={submitting || (!brd && !fsd && !srs && !frd && images.length === 0 && !figmaUrl && !githubUrl && !projectUrl)}
                    style={{ width: '100%', margin: 0, padding: '12px 32px', fontSize: '15px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', borderRadius: '8px', background: '#3b82f6', color: '#ffffff', border: 'none', opacity: (submitting || (!brd && !fsd && !srs && !frd && images.length === 0 && !figmaUrl && !githubUrl && !projectUrl)) ? 0.6 : 1, cursor: (submitting || (!brd && !fsd && !srs && !frd && images.length === 0 && !figmaUrl && !githubUrl && !projectUrl)) ? 'not-allowed' : 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}
                  >
                    {submitting ? 'Analyzing & Generating...' : 'Analyze Documents ➔'}
                  </button>
                </div>

                {job?.status === 'error' && <div className="error-banner" style={{ marginTop: 24 }}>{job.error}</div>}
              </div>
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
                  className={`tab-btn-monochrome tab-features ${activeTab === 'features' ? 'active' : ''}`}
                  onClick={() => setActiveTab('features')}
                >
                  <i className="fa-solid fa-list-check"></i> Features <span className="tab-count-monochrome">{featuresCount}</span>
                </button>
                <button
                  className={`tab-btn-monochrome tab-flows ${activeTab === 'flows' ? 'active' : ''}`}
                  onClick={() => setActiveTab('flows')}
                >
                  <i className="fa-solid fa-diagram-project"></i> User Flows <span className="tab-count-monochrome">{flowsCount}</span>
                </button>
                <button
                  className={`tab-btn-monochrome tab-issues ${activeTab === 'issues' ? 'active' : ''}`}
                  onClick={() => setActiveTab('issues')}
                >
                  <i className="fa-solid fa-triangle-exclamation"></i> Issues & Gaps <span className="tab-count-monochrome">{totalIssues}</span>
                </button>
              </div>

              <div className="tab-content-monochrome">
                {activeTab === 'features' && (
                  <div className="features-tab">
                    {featuresCount === 0 ? (
                      <div className="empty-state-monochrome">No features identified.</div>
                    ) : (
                      <>
                        <div className="features-grid-monochrome">
                          {featuresList.slice((featuresPage - 1) * itemsPerPage, featuresPage * itemsPerPage).map((f, i) => (
                            <div key={i} className="feature-card-monochrome">
                              <div className="feature-card-content-monochrome">
                                <div className="feature-card-header-monochrome">
                                  <span className={`source-badge-monochrome ${(f.source || '').toLowerCase()}`}>{f.source || 'Website'}</span>
                                  <h4>{f.name}</h4>
                                </div>
                                <p>{f.description}</p>
                              </div>
                              <div className="feature-card-arrow-monochrome">
                                <i className="fa-solid fa-check"></i>
                              </div>
                            </div>
                          ))}
                        </div>
                        {renderPagination(featuresPage, featuresList.length, setFeaturesPage)}
                      </>
                    )}
                  </div>
                )}

                {activeTab === 'flows' && (
                  <div className="flows-tab">
                    {flowsCount === 0 ? (
                      <div className="empty-state-monochrome">No user flows identified.</div>
                    ) : (
                      <>
                        <div className="flows-list-monochrome">
                          {flowsList.slice((flowsPage - 1) * 3, flowsPage * 3).map((f, i) => {
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

                            let chart = '%%{init: {"flowchart": {"nodeSpacing": 10, "rankSpacing": 20}, "themeVariables": {"fontSize": "11px"}}}%%\ngraph TD\n'

                            // Define classDefs for colors like the 1st image
                            chart += `  classDef startEnd fill:#fef08a,stroke:#d97706,stroke-width:1px,color:#000;\n`
                            chart += `  classDef process fill:#e5e7eb,stroke:#9ca3af,stroke-width:1px,color:#000;\n`
                            chart += `  classDef io fill:#bfdbfe,stroke:#3b82f6,stroke-width:1px,color:#000;\n`
                            chart += `  classDef decision fill:#fecdd3,stroke:#e11d48,stroke-width:1px,color:#000;\n`

                            allSteps.forEach((step, idx) => {
                              const cleanStep = step.replace(/"/g, '\\"')
                              const lower = cleanStep.toLowerCase()

                              let shapeLeft = '['
                              let shapeRight = ']'
                              let className = 'process'

                              if (idx === 0 || idx === allSteps.length - 1 || lower.includes('start') || lower.includes('end')) {
                                shapeLeft = '(['
                                shapeRight = '])'
                                className = 'startEnd'
                              } else if (lower.includes('if ') || lower.includes('?') || lower.includes('check ') || lower.includes('validate') || lower.includes('verify') || lower.includes('condition')) {
                                shapeLeft = '{'
                                shapeRight = '}'
                                className = 'decision'
                              } else if (lower.includes('enter') || lower.includes('input') || lower.includes('receive') || lower.includes('send') || lower.includes('show') || lower.includes('display')) {
                                shapeLeft = '[/'
                                shapeRight = '/]'
                                className = 'io'
                              }

                              chart += `  step${idx}${shapeLeft}"${cleanStep}"${shapeRight}:::${className}\n`

                              if (idx < allSteps.length - 1) {
                                // Add basic yes/no edge logic if step seems like a decision
                                let edge = '-->'
                                if (className === 'decision') {
                                  if (allSteps[idx + 1].toLowerCase().includes('yes') || allSteps[idx + 1].toLowerCase().includes('valid')) {
                                    edge = '-->|Yes|'
                                  } else if (allSteps[idx + 1].toLowerCase().includes('no ') || allSteps[idx + 1].toLowerCase().includes('invalid')) {
                                    edge = '-->|No|'
                                  } else {
                                    edge = '-->|Yes/Next|'
                                  }
                                }
                                chart += `  step${idx} ${edge} step${idx + 1}\n`
                              }
                            })

                            return (
                              <div key={i} className="flow-card-monochrome">
                                <div className="flow-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', gap: '16px' }}>
                                  <h5 style={{ margin: 0, flex: 1, wordBreak: 'break-word' }}>{f.name}</h5>
                                  <button className="personalize-btn-monochrome" onClick={() => setViewFlowChart(chart)} style={{ padding: '6px 14px', fontSize: '12px', margin: 0, height: 'auto', backgroundColor: '#3b82f6', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: '500', cursor: 'pointer', flexShrink: 0 }}>View Full Graph</button>
                                </div>
                                <div className="flow-steps-visual-monochrome" style={{ background: '#ffffff', padding: '24px 16px', overflow: 'hidden', maxHeight: '400px', display: 'flex', justifyContent: 'center' }}>
                                  <Mermaid chart={chart} />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                        {renderPagination(flowsPage, flowsList.length, setFlowsPage, 3)}
                      </>
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
                        {(() => {
                          const allIssues = [
                            ...inconsistenciesList.map(iss => ({ ...iss, _type: 'inconsistency' })),
                            ...gapsList.map(gap => ({ ...gap, _type: 'gap' }))
                          ];
                          const paginatedIssues = allIssues.slice((issuesPage - 1) * itemsPerPage, issuesPage * itemsPerPage);
                          return (
                            <>
                              {paginatedIssues.map((iss, i) => {
                                if (iss._type === 'inconsistency') {
                                  return (
                                    <div key={i} className={`issue-card-monochrome ${iss.severity ? iss.severity.toLowerCase() : ''}`}>
                                      <div className="issue-card-content-monochrome">
                                        <div className="issue-card-header-monochrome">
                                          <span className={`severity-badge-monochrome ${iss.severity ? iss.severity.toLowerCase() : ''}`}>{iss.severity || 'Normal'}</span>
                                          <h5>{iss.issue}</h5>
                                        </div>
                                        <p>{iss.detail}</p>
                                      </div>
                                      <div className="issue-card-icon-monochrome">
                                        <i className="fa-solid fa-exclamation"></i>
                                      </div>
                                    </div>
                                  );
                                } else {
                                  return (
                                    <div key={i} className={`issue-card-monochrome gap`}>
                                      <div className="issue-card-content-monochrome">
                                        <div className="issue-card-header-monochrome">
                                          <span className={`severity-badge-monochrome gap`}>GAP</span>
                                          <h5>{iss.item}</h5>
                                        </div>
                                        <p>{iss.detail}</p>
                                      </div>
                                      <div className="issue-card-icon-monochrome">
                                        <i className="fa-solid fa-exclamation"></i>
                                      </div>
                                    </div>
                                  );
                                }
                              })}
                              {renderPagination(issuesPage, allIssues.length, setIssuesPage)}
                            </>
                          )
                        })()}
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
                {projects.slice((historyPage - 1) * itemsPerPage, historyPage * itemsPerPage).map(p => (
                  <div key={p.id} className="history-card-sleek" style={{ padding: '16px 20px', background: '#fffef6', borderRadius: '8px', border: '1px solid #fef08a', borderLeft: '4px solid #f59e0b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }} onClick={() => loadProject(p.id)} onMouseOver={e => { e.currentTarget.style.borderColor = '#f59e0b'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)'; }} onMouseOut={e => { e.currentTarget.style.borderColor = '#fef08a'; e.currentTarget.style.borderLeftColor = '#f59e0b'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ background: '#fef3c7', color: '#d97706', fontSize: '12px', fontWeight: '700', padding: '4px 8px', borderRadius: '4px', letterSpacing: '0.5px' }}>
                          PROJ
                        </span>
                        <h3 style={{ margin: '0', fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>{p.name || 'Unnamed Project'}</h3>
                      </div>
                      <p style={{ margin: '0', fontSize: '14px', color: '#475569', paddingLeft: '56px' }}>
                        Created: {new Date(p.created_at * 1000).toLocaleString()} | {p.total_cases} Test Cases
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button style={{ padding: '6px 18px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); shareProject(p.id); }}>Share</button>
                      <button style={{ padding: '6px 18px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setEditingProject(p); setEditProjectName(p.name || ''); setEditProjectNotepad(p.notepad || ''); }}>Edit</button>
                      <button style={{ padding: '6px 18px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); loadProject(p.id); }}>Open</button>
                      <button style={{ padding: '6px 18px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); deleteProject(p.id); }}>Delete</button>
                    </div>
                  </div>
                ))}

                {projects.length > itemsPerPage && (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '24px', paddingBottom: '16px' }}>
                    <button
                      className="btn"
                      style={{ padding: '8px 16px', background: historyPage === 1 ? '#e2e8f0' : '#3b82f6', color: historyPage === 1 ? '#94a3b8' : 'white', border: 'none', borderRadius: '6px', cursor: historyPage === 1 ? 'not-allowed' : 'pointer' }}
                      disabled={historyPage === 1}
                      onClick={() => setHistoryPage(p => p - 1)}
                    >
                      Previous
                    </button>
                    <span style={{ fontSize: '14px', color: '#64748b' }}>
                      Page {historyPage} of {Math.ceil(projects.length / itemsPerPage)}
                    </span>
                    <button
                      className="btn"
                      style={{ padding: '8px 16px', background: historyPage >= Math.ceil(projects.length / itemsPerPage) ? '#e2e8f0' : '#3b82f6', color: historyPage >= Math.ceil(projects.length / itemsPerPage) ? '#94a3b8' : 'white', border: 'none', borderRadius: '6px', cursor: historyPage >= Math.ceil(projects.length / itemsPerPage) ? 'not-allowed' : 'pointer' }}
                      disabled={historyPage >= Math.ceil(projects.length / itemsPerPage)}
                      onClick={() => setHistoryPage(p => p + 1)}
                    >
                      Next
                    </button>
                  </div>
                )}
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
              <div className="header-metrics-row" style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', justifyContent: 'flex-end' }}>
                <div style={{ background: '#0f172a', border: 'none', borderRadius: '6px', padding: '6px 12px', display: 'flex', gap: '8px', alignItems: 'center', fontSize: '14px', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)' }}>
                  <span style={{ color: 'rgba(255,255,255,0.8)' }}>Total</span>
                  <strong style={{ color: 'white' }}>{totalCount}</strong>
                </div>
                <div style={{ background: '#dc2626', border: 'none', borderRadius: '6px', padding: '6px 12px', display: 'flex', gap: '8px', alignItems: 'center', fontSize: '14px', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)' }}>
                  <span style={{ color: 'rgba(255,255,255,0.8)' }}>P0</span>
                  <strong style={{ color: 'white' }}>{p0Count}</strong>
                </div>
                <div style={{ background: '#ea580c', border: 'none', borderRadius: '6px', padding: '6px 12px', display: 'flex', gap: '8px', alignItems: 'center', fontSize: '14px', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)' }}>
                  <span style={{ color: 'rgba(255,255,255,0.8)' }}>P1</span>
                  <strong style={{ color: 'white' }}>{p1Count}</strong>
                </div>
                <div style={{ background: '#16a34a', border: 'none', borderRadius: '6px', padding: '6px 12px', display: 'flex', gap: '8px', alignItems: 'center', fontSize: '14px', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)' }}>
                  <span style={{ color: 'rgba(255,255,255,0.8)' }}>P2</span>
                  <strong style={{ color: 'white' }}>{p2Count}</strong>
                </div>
                <div style={{ background: '#2563eb', border: 'none', borderRadius: '6px', padding: '6px 12px', display: 'flex', gap: '8px', alignItems: 'center', fontSize: '14px', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)' }}>
                  <span style={{ color: 'rgba(255,255,255,0.8)' }}>P3</span>
                  <strong style={{ color: 'white' }}>{p3Count}</strong>
                </div>

                {/* Execute and Save buttons moved to the filter bar below */}
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
                <div className="filter-bar-monochrome" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: '#ffffff', borderRadius: '9999px', border: '1px solid black', padding: '6px 20px', boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)' }}>
                    <input
                      type="text"
                      placeholder="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ flex: 1, border: 'none', outline: 'none', fontSize: '14px', color: '#475569', background: 'transparent' }}
                    />
                    <i className="fa-solid fa-magnifying-glass" style={{ color: '#06b6d4', fontSize: '16px', marginLeft: '12px' }}></i>
                  </div>
                  <button
                    onClick={() => {
                      const allSelected = cases.every(tc => selectedTestCases[tc.id]);
                      const newSelection = { ...selectedTestCases };
                      cases.forEach(tc => {
                        newSelection[tc.id] = !allSelected;
                      });
                      setSelectedTestCases(newSelection);
                    }}
                    style={{ background: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: '6px', height: '32px', padding: '0 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', margin: 0, boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)', boxSizing: 'border-box' }}
                  >
                    <input
                      type="checkbox"
                      checked={cases.length > 0 && cases.every(tc => selectedTestCases[tc.id])}
                      readOnly
                      style={{ margin: 0 }}
                    />
                    {cases.length > 0 && cases.every(tc => selectedTestCases[tc.id]) ? 'Deselect All' : 'Select All'}
                  </button>
                  <button onClick={executeSelectedTestCases} style={{ background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', height: '32px', padding: '0 12px', fontSize: '13px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', margin: 0, boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)', boxSizing: 'border-box' }}>
                    ▶ Execute
                  </button>
                  <button onClick={saveProject} style={{ background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', height: '32px', padding: '0 12px', fontSize: '13px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', margin: 0, boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)', boxSizing: 'border-box' }}>
                    💾 Save
                  </button>
                  <button onClick={exportDoc} style={{ background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '6px', height: '32px', padding: '0 12px', fontSize: '13px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', margin: 0, boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)', boxSizing: 'border-box' }}>
                    📄 View Doc
                  </button>
                  <button onClick={() => setShowPersonalizeModal(true)} style={{ background: '#0f172a', color: 'white', border: 'none', borderRadius: '6px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', margin: 0, boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)', boxSizing: 'border-box' }} title="Chat Bot">
                    <i className="fa-solid fa-robot"></i>
                  </button>
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
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', justifyContent: 'center' }}>
                                        <button
                                          className="btn btn-secondary"
                                          title="AI Edit"
                                          style={{ padding: '4px', fontSize: '1.2rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
                                          onClick={() => {
                                            setAiSelectionModeTestCaseId(tc.id);
                                            setAiSelectedParts([]);
                                          }}
                                        >
                                          🪄
                                        </button>
                                        <button
                                          className="btn btn-secondary"
                                          title="Execute"
                                          style={{ padding: '4px', fontSize: '1.2rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
                                          onClick={() => executeSingleTestCase(tc.id)}
                                        >
                                          ▶
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                  <td {...getCellProps(tc, 'id', { whiteSpace: 'nowrap', fontWeight: 600 })} onBlur={(e) => handleCellEdit(tc.id, 'id', e.target.innerText)}>{tc.id}</td>
                                  <td {...getCellProps(tc, 'category')} onBlur={(e) => handleCellEdit(tc.id, 'category', e.target.innerText)}>{typeof tc.category === 'object' ? JSON.stringify(tc.category) : tc.category}</td>
                                  <td {...getCellProps(tc, 'scenario')} onBlur={(e) => handleCellEdit(tc.id, 'scenario', e.target.innerText)}>{typeof tc.scenario === 'object' ? JSON.stringify(tc.scenario) : tc.scenario}</td>
                                  <td {...getCellProps(tc, 'description')} onBlur={(e) => handleCellEdit(tc.id, 'description', e.target.innerText)}>{typeof tc.description === 'object' ? JSON.stringify(tc.description) : tc.description}</td>
                                  <td {...getCellProps(tc, 'precondition')} onBlur={(e) => handleCellEdit(tc.id, 'precondition', e.target.innerText)}>{(typeof tc.precondition === 'object' ? JSON.stringify(tc.precondition) : tc.precondition) || 'N/A'}</td>
                                  <td {...getCellProps(tc, 'steps', { whiteSpace: 'pre-wrap' })} onBlur={(e) => {
                                    const text = e.target.innerText.trim();
                                    handleCellEdit(tc.id, 'steps', text ? text.split('\n') : [])
                                  }}>
                                    {Array.isArray(tc.steps) ? tc.steps.join('\n') : (typeof tc.steps === 'object' ? JSON.stringify(tc.steps) : (tc.steps || 'N/A'))}
                                  </td>
                                  <td {...getCellProps(tc, 'test_data')} onBlur={(e) => handleCellEdit(tc.id, 'test_data', e.target.innerText)}>{(typeof tc.test_data === 'object' ? JSON.stringify(tc.test_data) : tc.test_data) || 'N/A'}</td>
                                  <td {...getCellProps(tc, 'expected_result')} onBlur={(e) => handleCellEdit(tc.id, 'expected_result', e.target.innerText)}>{(typeof tc.expected_result === 'object' ? JSON.stringify(tc.expected_result) : tc.expected_result) || 'N/A'}</td>
                                  <td {...getCellProps(tc, 'actual_result')} onBlur={(e) => handleCellEdit(tc.id, 'actual_result', e.target.innerText)}>{(typeof tc.actual_result === 'object' ? JSON.stringify(tc.actual_result) : tc.actual_result) || 'N/A'}</td>
                                  <td {...getCellProps(tc, 'postcondition')} onBlur={(e) => handleCellEdit(tc.id, 'postcondition', e.target.innerText)}>{(typeof tc.postcondition === 'object' ? JSON.stringify(tc.postcondition) : tc.postcondition) || 'N/A'}</td>
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
                <button onClick={() => setShowPersonalizeModal(false)} style={{ margin: 0, padding: '8px 16px', background: 'transparent', color: '#3b82f6', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s ease' }} onMouseOver={(e) => { e.target.style.background = '#f1f5f9'; e.target.style.color = '#334155' }} onMouseOut={(e) => { e.target.style.background = 'transparent'; e.target.style.color = '#64748b' }}>
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
        <div className="preview-modal-overlay" onClick={() => { setViewFlowChart(null); setGraphZoom(1); }}>
          <div className="preview-modal-content" onClick={(e) => e.stopPropagation()} style={{ width: '80vw', height: '80vh', maxWidth: '1000px', display: 'flex', flexDirection: 'column' }}>
            <div className="preview-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>User Flow Diagram</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button className="personalize-btn-monochrome" onClick={() => setGraphZoom(z => Math.max(0.4, z - 0.2))} style={{ padding: '2px 10px', fontSize: '16px', fontWeight: 'bold', borderRadius: '4px', border: '1px solid #e4e4e7', background: '#f4f4f5', cursor: 'pointer' }}>-</button>
                <span style={{ fontSize: '13px', fontWeight: 'bold', minWidth: '40px', textAlign: 'center' }}>{Math.round(graphZoom * 100)}%</span>
                <button className="personalize-btn-monochrome" onClick={() => setGraphZoom(z => Math.min(3, z + 0.2))} style={{ padding: '2px 10px', fontSize: '16px', fontWeight: 'bold', borderRadius: '4px', border: '1px solid #e4e4e7', background: '#f4f4f5', cursor: 'pointer' }}>+</button>
                <button className="close-modal-btn" onClick={() => { setViewFlowChart(null); setGraphZoom(1); }} style={{ marginLeft: '12px' }}>✕</button>
              </div>
            </div>
            <div className="preview-modal-body" style={{ flex: 1, padding: '40px', overflow: 'auto', background: '#ffffff', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
              <div style={{ transform: `scale(${graphZoom})`, transformOrigin: 'top center', transition: 'transform 0.2s', display: 'flex', justifyContent: 'center', minWidth: '100%' }} className="full-graph-mermaid-wrapper">
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
                  style={{ padding: '8px 16px', background: 'transparent', color: '#3b82f6', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  onMouseOver={(e) => { e.target.style.background = '#f1f5f9'; e.target.style.color = '#334155' }}
                  onMouseOut={(e) => { e.target.style.background = 'transparent'; e.target.style.color = '#64748b' }}
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

      {executionPopup && (
        <div className="preview-modal-overlay" onClick={() => setExecutionPopup(null)}>
          <div className="preview-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px', height: 'auto', textAlign: 'center' }}>
            <div className="preview-modal-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
              <h3 style={{ color: executionPopup.error ? '#ef4444' : '#10b981', margin: '0 auto', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {executionPopup.error ? <i className="fa-solid fa-triangle-exclamation"></i> : <i className="fa-solid fa-circle-check"></i>}
                {executionPopup.error ? 'Warning' : 'Success'}
              </h3>
              <button className="close-modal-btn" onClick={() => setExecutionPopup(null)} style={{ position: 'absolute', right: '16px', top: '16px' }}>✕</button>
            </div>
            <div className="preview-modal-body" style={{ padding: '24px 20px 32px 20px' }}>
              <p style={{ fontSize: '15px', color: '#475569', margin: '0 0 24px 0', lineHeight: '1.5' }}>{executionPopup.message}</p>
              <button className="btn btn-primary" style={{ padding: '10px 24px', width: '100%', maxWidth: '200px', borderRadius: '8px', fontSize: '15px', fontWeight: '500' }} onClick={() => setExecutionPopup(null)}>OK</button>
            </div>
          </div>
        </div>
      )}
      {/* Inline Analyzing Modal — sits on top while keeping upload page visible behind */}
      {submitting && showLoadingModal && (() => {
        const currentStageLabel = ANALYZE_STAGES.find(s => s.key === job?.stage)?.label || 'Preparing...';
        const { percent, est } = getStageProgress(job?.stage);
        return (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <div style={{
              background: '#fff', borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
              padding: '36px 32px', width: '440px', maxWidth: '90vw', textAlign: 'center'
            }}>
              <h2 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: '700', color: '#0f172a' }}>Analyzing &amp; Generating</h2>
              <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 24px', lineHeight: '1.5' }}>Please wait while the AI parses your specifications and builds the test suite.</p>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px', marginBottom: '20px', textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontWeight: '600', color: '#1e293b', fontSize: '14px' }}>{currentStageLabel}</span>
                  <span style={{ fontWeight: '700', color: '#3b82f6', fontSize: '14px' }}>{percent}%</span>
                </div>
                <div style={{ width: '100%', background: '#e2e8f0', height: '6px', borderRadius: '3px', overflow: 'hidden', marginBottom: '12px' }}>
                  <div style={{ width: `${percent}%`, height: '100%', background: '#3b82f6', transition: 'width 0.5s ease', borderRadius: '3px' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b' }}>
                  <span>Elapsed: <strong>{formatTime(elapsedTime)}</strong></span>
                  <span>{est}</span>
                </div>
              </div>

              {/* Spinner */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  border: '3px solid #e2e8f0', borderTopColor: '#3b82f6',
                  animation: 'spin 0.9s linear infinite'
                }} />
              </div>

              <button
                onClick={() => setShowLoadingModal(false)}
                style={{
                  padding: '10px 24px', background: '#f1f5f9', border: '1px solid #cbd5e1',
                  borderRadius: '8px', fontSize: '13.5px', fontWeight: '600', color: '#475569',
                  cursor: 'pointer', transition: 'all 0.2s'
                }}
                onMouseOver={e => { e.target.style.background = '#e2e8f0'; }}
                onMouseOut={e => { e.target.style.background = '#f1f5f9'; }}
              >
                Minimize to Background
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  )
}
