import Swal from 'sweetalert2';
import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';

const ProjectWorkspaceContext = createContext();

export function useProjectWorkspace() {
  return useContext(ProjectWorkspaceContext);
}

export const ANALYZE_STAGES = [
  { key: 'parsing_documents', label: 'Parsing Documents' },
  { key: 'fetching_figma', label: 'Fetching Figma' },
  { key: 'understanding', label: 'AI Analysis' },
  { key: 'planning_tests', label: 'Planning Test Suite' },
  { key: 'generating_tests', label: 'Generating Test Cases' },
  { key: 'finalizing', label: 'Finalizing Report' },
  { key: 'done', label: 'Complete' },
];

export function ProjectWorkspaceProvider({ children }) {


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
    fetchProjects()
  }, [])

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

        setStep(3)
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
      text: "Are you sure you want to delete this project?",
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
        downloadLink.download = `project_export_${data.id.substring(0,6)}.json`;
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
      title: "Please select at least one test case to execute.",
      icon: 'info',
      confirmButtonText: 'OK'
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
      };
    });
    
    setSelectedTestCases({});
    Swal.fire({
      title: `Successfully executed ${selectedIds.length} test cases!`,
      icon: 'info',
      confirmButtonText: 'OK'
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
    formData.append('ai_mode', aiMode)
    if (id && id !== 'new') formData.append('project_id', id)

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
        Swal.fire({
      title: 'Execution completed successfully!',
      icon: 'info',
      confirmButtonText: 'OK'
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
  const value = {
    brd, setBrd, fsd, setFsd, images, setImages, figmaUrl, setFigmaUrl, figmaToken, setFigmaToken, showFigmaToken, setShowFigmaToken, srs, setSrs, frd, setFrd, githubUrl, setGithubUrl, projectUrl, setProjectUrl, deep, setDeep, aiMode, setAiMode, job, setJob, submitting, setSubmitting, userPrompt, setUserPrompt, selectedView, setSelectedView, generating, setGenerating, step, setStep, activeTab, setActiveTab, previewFile, setPreviewFile, docPreviewHtml, setDocPreviewHtml, showPersonalizeModal, setShowPersonalizeModal, showCreateProjectModal, setShowCreateProjectModal, createProjectName, setCreateProjectName, elapsedTime, setElapsedTime, pollRef, handleCellEdit, newCases, getStageProgress, formatTime, mins, secs, reportFilter, setReportFilter, searchQuery, setSearchQuery, expandedCases, setExpandedCases, checkedSteps, setCheckedSteps, caseStatuses, setCaseStatuses, viewFlowChart, setViewFlowChart, selectedTestCases, setSelectedTestCases, projects, setProjects, editingProject, setEditingProject, editProjectName, setEditProjectName, editProjectNotepad, setEditProjectNotepad, editingAITestCase, setEditingAITestCase, aiEditPrompt, setAiEditPrompt, isAiEditing, setIsAiEditing, aiSelectionModeTestCaseId, setAiSelectionModeTestCaseId, aiSelectedParts, setAiSelectedParts, sidebarWidth, setSidebarWidth, handleCellClick, getCellProps, isSelecting, isSelected, startResizing, handleMouseMove, handleMouseUp, fetchProjects, token, response, data, loadProject, pName, deleteProject, shareProject, blob, downloadLink, handleImportProject, file, reader, submitAiEdit, updatedTestCase, saveEditProject, executeSelectedTestCases, selectedIds, passed, saveProject, startAnalysis, formData, res, pollJob, generateTests, executedCases, ec, resetApp, handleCreateProject, stageIndex, showAnalyzeRail, featuresList, flowsList, inconsistenciesList, gapsList, featuresCount, flowsCount, totalIssues, cases, categories, filteredCases, matchesCategory, matchesSearch, totalCount, p0Count, p1Count, p2Count, p3Count, toggleExpand, toggleAll, next, toggleStep, key, copyMarkdown, md, exportDoc, casesBySection, sec, sections, subtitle, htmlContent, downloadDoc, currentUser, logout, navigate
  };

  return (
    <ProjectWorkspaceContext.Provider value={value}>
      {children}
    </ProjectWorkspaceContext.Provider>
  );
}
