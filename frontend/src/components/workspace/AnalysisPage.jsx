import React, { useState, useRef, useEffect } from 'react';
import { useProjectWorkspace, ANALYZE_STAGES } from '../../context/ProjectWorkspaceContext.jsx';
import FilePreviewer from '../shared/FilePreviewer.jsx';
import ImageThumbnail from '../shared/ImageThumbnail.jsx';
import Mermaid from '../shared/Mermaid.jsx';
import TreeFolder from './TreeFolder.jsx';
import { ChevronRight, Search, Menu, Upload, ExternalLink, RefreshCw, Layers, Layout, AlertCircle, FileText, Download, Code, Play, CheckCircle, Save, Settings, LogOut, ChevronLeft, GitPullRequest, SearchCode, Database, CheckSquare, Bug, ChevronDown } from 'lucide-react';

export default function AnalysisPage() {
  const { brd, setBrd, fsd, setFsd, images, setImages, figmaUrl, setFigmaUrl, figmaToken, setFigmaToken, showFigmaToken, setShowFigmaToken, srs, setSrs, frd, setFrd, githubUrl, setGithubUrl, projectUrl, setProjectUrl, deep, setDeep, job, setJob, submitting, setSubmitting, userPrompt, setUserPrompt, selectedView, setSelectedView, generating, setGenerating, step, setStep, activeTab, setActiveTab, previewFile, setPreviewFile, docPreviewHtml, setDocPreviewHtml, showPersonalizeModal, setShowPersonalizeModal, showCreateProjectModal, setShowCreateProjectModal, createProjectName, setCreateProjectName, elapsedTime, setElapsedTime, pollRef, handleCellEdit, newCases, getStageProgress, formatTime, mins, secs, reportFilter, setReportFilter, searchQuery, setSearchQuery, expandedCases, setExpandedCases, checkedSteps, setCheckedSteps, caseStatuses, setCaseStatuses, viewFlowChart, setViewFlowChart, selectedTestCases, setSelectedTestCases, projects, setProjects, editingProject, setEditingProject, editProjectName, setEditProjectName, editProjectNotepad, setEditProjectNotepad, editingAITestCase, setEditingAITestCase, aiEditPrompt, setAiEditPrompt, isAiEditing, setIsAiEditing, aiSelectionModeTestCaseId, setAiSelectionModeTestCaseId, aiSelectedParts, setAiSelectedParts, sidebarWidth, setSidebarWidth, handleCellClick, getCellProps, isSelecting, isSelected, startResizing, handleMouseMove, handleMouseUp, fetchProjects, token, response, data, loadProject, pName, deleteProject, shareProject, blob, downloadLink, handleImportProject, file, reader, submitAiEdit, updatedTestCase, saveEditProject, executeSelectedTestCases, selectedIds, passed, saveProject, startAnalysis, formData, res, pollJob, generateTests, executedCases, ec, resetApp, handleCreateProject, stageIndex, showAnalyzeRail, featuresList, flowsList, inconsistenciesList, gapsList, featuresCount, flowsCount, totalIssues, cases, categories, filteredCases, matchesCategory, matchesSearch, totalCount, p0Count, p1Count, p2Count, p3Count, toggleExpand, toggleAll, next, toggleStep, key, copyMarkdown, md, exportDoc, casesBySection, sec, sections, subtitle, htmlContent, downloadDoc, currentUser, logout, navigate } = useProjectWorkspace();


  return (
    <>
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
    </>
  );
}
