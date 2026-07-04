import React, { useState, useRef, useEffect } from 'react';
import { useProjectWorkspace, ANALYZE_STAGES } from '../../context/ProjectWorkspaceContext.jsx';
import FilePreviewer from '../shared/FilePreviewer.jsx';
import ImageThumbnail from '../shared/ImageThumbnail.jsx';
import Mermaid from '../shared/Mermaid.jsx';
import TreeFolder from './TreeFolder.jsx';
import { ChevronRight, Search, Menu, Upload, ExternalLink, RefreshCw, Layers, Layout, AlertCircle, FileText, Download, Code, Play, CheckCircle, Save, Settings, LogOut, ChevronLeft, GitPullRequest, SearchCode, Database, CheckSquare, Bug, ChevronDown } from 'lucide-react';

export default function TestCasePage() {
  const { brd, setBrd, fsd, setFsd, images, setImages, figmaUrl, setFigmaUrl, figmaToken, setFigmaToken, showFigmaToken, setShowFigmaToken, srs, setSrs, frd, setFrd, githubUrl, setGithubUrl, projectUrl, setProjectUrl, deep, setDeep, job, setJob, submitting, setSubmitting, userPrompt, setUserPrompt, selectedView, setSelectedView, generating, setGenerating, step, setStep, activeTab, setActiveTab, previewFile, setPreviewFile, docPreviewHtml, setDocPreviewHtml, showPersonalizeModal, setShowPersonalizeModal, showCreateProjectModal, setShowCreateProjectModal, createProjectName, setCreateProjectName, elapsedTime, setElapsedTime, pollRef, handleCellEdit, newCases, getStageProgress, formatTime, mins, secs, reportFilter, setReportFilter, searchQuery, setSearchQuery, expandedCases, setExpandedCases, checkedSteps, setCheckedSteps, caseStatuses, setCaseStatuses, viewFlowChart, setViewFlowChart, selectedTestCases, setSelectedTestCases, projects, setProjects, editingProject, setEditingProject, editProjectName, setEditProjectName, editProjectNotepad, setEditProjectNotepad, editingAITestCase, setEditingAITestCase, aiEditPrompt, setAiEditPrompt, isAiEditing, setIsAiEditing, aiSelectionModeTestCaseId, setAiSelectionModeTestCaseId, aiSelectedParts, setAiSelectedParts, sidebarWidth, setSidebarWidth, handleCellClick, getCellProps, isSelecting, isSelected, startResizing, handleMouseMove, handleMouseUp, fetchProjects, token, response, data, loadProject, pName, deleteProject, shareProject, blob, downloadLink, handleImportProject, file, reader, submitAiEdit, updatedTestCase, saveEditProject, executeSelectedTestCases, selectedIds, passed, saveProject, startAnalysis, formData, res, pollJob, generateTests, executedCases, ec, resetApp, handleCreateProject, stageIndex, showAnalyzeRail, featuresList, flowsList, inconsistenciesList, gapsList, featuresCount, flowsCount, totalIssues, cases, categories, filteredCases, matchesCategory, matchesSearch, totalCount, p0Count, p1Count, p2Count, p3Count, toggleExpand, toggleAll, next, toggleStep, key, copyMarkdown, md, exportDoc, casesBySection, sec, sections, subtitle, htmlContent, downloadDoc, currentUser, logout, navigate } = useProjectWorkspace();


  return (
    <>
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
    </>
  );
}
