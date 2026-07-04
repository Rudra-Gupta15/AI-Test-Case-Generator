import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useProjectWorkspace } from '../../context/ProjectWorkspaceContext.jsx';
import { Settings, LogOut, ChevronLeft } from 'lucide-react';

export default function ProjectWorkspaceLayout() {
  const { brd, setBrd, fsd, setFsd, images, setImages, figmaUrl, setFigmaUrl, figmaToken, setFigmaToken, showFigmaToken, setShowFigmaToken, srs, setSrs, frd, setFrd, githubUrl, setGithubUrl, projectUrl, setProjectUrl, deep, setDeep, job, setJob, submitting, setSubmitting, userPrompt, setUserPrompt, selectedView, setSelectedView, generating, setGenerating, step, setStep, activeTab, setActiveTab, previewFile, setPreviewFile, docPreviewHtml, setDocPreviewHtml, showPersonalizeModal, setShowPersonalizeModal, showCreateProjectModal, setShowCreateProjectModal, createProjectName, setCreateProjectName, elapsedTime, setElapsedTime, pollRef, handleCellEdit, newCases, getStageProgress, formatTime, mins, secs, reportFilter, setReportFilter, searchQuery, setSearchQuery, expandedCases, setExpandedCases, checkedSteps, setCheckedSteps, caseStatuses, setCaseStatuses, viewFlowChart, setViewFlowChart, selectedTestCases, setSelectedTestCases, projects, setProjects, editingProject, setEditingProject, editProjectName, setEditProjectName, editProjectNotepad, setEditProjectNotepad, editingAITestCase, setEditingAITestCase, aiEditPrompt, setAiEditPrompt, isAiEditing, setIsAiEditing, aiSelectionModeTestCaseId, setAiSelectionModeTestCaseId, aiSelectedParts, setAiSelectedParts, sidebarWidth, setSidebarWidth, handleCellClick, getCellProps, isSelecting, isSelected, startResizing, handleMouseMove, handleMouseUp, fetchProjects, token, response, data, loadProject, pName, deleteProject, shareProject, blob, downloadLink, handleImportProject, file, reader, submitAiEdit, updatedTestCase, saveEditProject, executeSelectedTestCases, selectedIds, passed, saveProject, startAnalysis, formData, res, pollJob, generateTests, executedCases, ec, resetApp, handleCreateProject, stageIndex, showAnalyzeRail, featuresList, flowsList, inconsistenciesList, gapsList, featuresCount, flowsCount, totalIssues, cases, categories, filteredCases, matchesCategory, matchesSearch, totalCount, p0Count, p1Count, p2Count, p3Count, toggleExpand, toggleAll, next, toggleStep, key, copyMarkdown, md, exportDoc, casesBySection, sec, sections, subtitle, htmlContent, downloadDoc, currentUser, logout, navigate } = useProjectWorkspace();


  return (
    <div className={`app-window step-${step}`}>
      <div className="left-sidebar">
        <div className="sidebar-header">
          <Link to="/projects" className="back-btn" title="Back to Projects" onClick={resetApp}>
            <ChevronLeft size={20} />
          </Link>
          <div className="logo-container" style={{ margin: 0 }}>
            <div className="logo-icon">P</div>
            <div className="logo-text">PREVOYANCE<span className="logo-sub">IT SOLUTIONS</span></div>
          </div>
        </div>

        <nav className="sidebar-nav" style={{ marginTop: '32px' }}>
          <Link to={`/project/${job?.id || 'new'}/upload`} className={`nav-link-btn ${step === 1 ? 'active' : ''}`}>
            <span className="nav-icon">1</span>
            Data Sources
          </Link>
          <Link to={`/project/${job?.id || 'new'}/analysis`} className={`nav-link-btn ${step === 2 ? 'active' : ''} ${!job?.understanding ? 'disabled' : ''}`}>
            <span className="nav-icon">2</span>
            AI Analysis
          </Link>
          <Link to={`/project/${job?.id || 'new'}/test-cases`} className={`nav-link-btn ${step === 3 ? 'active' : ''} ${'disabled'}`}>
            <span className="nav-icon">3</span>
            Test Suite
          </Link>
          <Link to={`/project/${job?.id || 'new'}/history`} className={`nav-link-btn ${step === 4 ? 'active' : ''}`}>
            <span className="nav-icon">4</span>
            History
          </Link>
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="avatar">U</div>
            <div className="user-info">
              <span className="user-name">User</span>
              <span className="user-role">QA Engineer</span>
            </div>
          </div>
          <button className="icon-btn-subtle" onClick={logout} title="Sign out">
            <LogOut size={16} />
          </button>
        </div>
      </div>

      <div className="app-main-content">
        <div style={{ padding: step === 3 ? '0' : '24px 0 0 0', marginTop: step === 3 ? '-16px' : '0', height: '100%' }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
