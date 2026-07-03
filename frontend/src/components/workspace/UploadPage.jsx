import React, { useState, useRef, useEffect } from 'react';
import { useProjectWorkspace, ANALYZE_STAGES } from '../../context/ProjectWorkspaceContext.jsx';
import FilePreviewer from '../shared/FilePreviewer.jsx';
import ImageThumbnail from '../shared/ImageThumbnail.jsx';
import Mermaid from '../shared/Mermaid.jsx';
import TreeFolder from './TreeFolder.jsx';
import { ChevronRight, Search, Menu, Upload, ExternalLink, RefreshCw, Layers, Layout, AlertCircle, FileText, Download, Code, Play, CheckCircle, Save, Settings, LogOut, ChevronLeft, GitPullRequest, SearchCode, Database, CheckSquare, Bug, ChevronDown } from 'lucide-react';

export default function UploadPage() {
  const { brd, setBrd, fsd, setFsd, images, setImages, figmaUrl, setFigmaUrl, figmaToken, setFigmaToken, showFigmaToken, setShowFigmaToken, srs, setSrs, frd, setFrd, githubUrl, setGithubUrl, projectUrl, setProjectUrl, deep, setDeep, job, setJob, submitting, setSubmitting, userPrompt, setUserPrompt, selectedView, setSelectedView, generating, setGenerating, step, setStep, activeTab, setActiveTab, previewFile, setPreviewFile, docPreviewHtml, setDocPreviewHtml, showPersonalizeModal, setShowPersonalizeModal, showCreateProjectModal, setShowCreateProjectModal, createProjectName, setCreateProjectName, elapsedTime, setElapsedTime, pollRef, handleCellEdit, newCases, getStageProgress, formatTime, mins, secs, reportFilter, setReportFilter, searchQuery, setSearchQuery, expandedCases, setExpandedCases, checkedSteps, setCheckedSteps, caseStatuses, setCaseStatuses, viewFlowChart, setViewFlowChart, selectedTestCases, setSelectedTestCases, projects, setProjects, editingProject, setEditingProject, editProjectName, setEditProjectName, editProjectNotepad, setEditProjectNotepad, editingAITestCase, setEditingAITestCase, aiEditPrompt, setAiEditPrompt, isAiEditing, setIsAiEditing, aiSelectionModeTestCaseId, setAiSelectionModeTestCaseId, aiSelectedParts, setAiSelectedParts, sidebarWidth, setSidebarWidth, handleCellClick, getCellProps, isSelecting, isSelected, startResizing, handleMouseMove, handleMouseUp, fetchProjects, token, response, data, loadProject, pName, deleteProject, shareProject, blob, downloadLink, handleImportProject, file, reader, submitAiEdit, updatedTestCase, saveEditProject, executeSelectedTestCases, selectedIds, passed, saveProject, startAnalysis, formData, res, pollJob, generateTests, executedCases, ec, resetApp, handleCreateProject, stageIndex, showAnalyzeRail, featuresList, flowsList, inconsistenciesList, gapsList, featuresCount, flowsCount, totalIssues, cases, categories, filteredCases, matchesCategory, matchesSearch, totalCount, p0Count, p1Count, p2Count, p3Count, toggleExpand, toggleAll, next, toggleStep, key, copyMarkdown, md, exportDoc, casesBySection, sec, sections, subtitle, htmlContent, downloadDoc, currentUser, logout, navigate } = useProjectWorkspace();


  return (
    <>
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
    </>
  );
}
