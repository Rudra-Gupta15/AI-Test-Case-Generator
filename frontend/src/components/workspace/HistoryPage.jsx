import React, { useState, useRef, useEffect } from 'react';
import { useProjectWorkspace, ANALYZE_STAGES } from '../../context/ProjectWorkspaceContext.jsx';
import FilePreviewer from '../shared/FilePreviewer.jsx';
import ImageThumbnail from '../shared/ImageThumbnail.jsx';
import Mermaid from '../shared/Mermaid.jsx';
import TreeFolder from './TreeFolder.jsx';
import { ChevronRight, Search, Menu, Upload, ExternalLink, RefreshCw, Layers, Layout, AlertCircle, FileText, Download, Code, Play, CheckCircle, Save, Settings, LogOut, ChevronLeft, GitPullRequest, SearchCode, Database, CheckSquare, Bug, ChevronDown } from 'lucide-react';

export default function HistoryPage() {
  const { brd, setBrd, fsd, setFsd, images, setImages, figmaUrl, setFigmaUrl, figmaToken, setFigmaToken, showFigmaToken, setShowFigmaToken, srs, setSrs, frd, setFrd, githubUrl, setGithubUrl, projectUrl, setProjectUrl, deep, setDeep, job, setJob, submitting, setSubmitting, userPrompt, setUserPrompt, selectedView, setSelectedView, generating, setGenerating, step, setStep, activeTab, setActiveTab, previewFile, setPreviewFile, docPreviewHtml, setDocPreviewHtml, showPersonalizeModal, setShowPersonalizeModal, showCreateProjectModal, setShowCreateProjectModal, createProjectName, setCreateProjectName, elapsedTime, setElapsedTime, pollRef, handleCellEdit, newCases, getStageProgress, formatTime, mins, secs, reportFilter, setReportFilter, searchQuery, setSearchQuery, expandedCases, setExpandedCases, checkedSteps, setCheckedSteps, caseStatuses, setCaseStatuses, viewFlowChart, setViewFlowChart, selectedTestCases, setSelectedTestCases, projects, setProjects, editingProject, setEditingProject, editProjectName, setEditProjectName, editProjectNotepad, setEditProjectNotepad, editingAITestCase, setEditingAITestCase, aiEditPrompt, setAiEditPrompt, isAiEditing, setIsAiEditing, aiSelectionModeTestCaseId, setAiSelectionModeTestCaseId, aiSelectedParts, setAiSelectedParts, sidebarWidth, setSidebarWidth, handleCellClick, getCellProps, isSelecting, isSelected, startResizing, handleMouseMove, handleMouseUp, fetchProjects, token, response, data, loadProject, pName, deleteProject, shareProject, blob, downloadLink, handleImportProject, file, reader, submitAiEdit, updatedTestCase, saveEditProject, executeSelectedTestCases, selectedIds, passed, saveProject, startAnalysis, formData, res, pollJob, generateTests, executedCases, ec, resetApp, handleCreateProject, stageIndex, showAnalyzeRail, featuresList, flowsList, inconsistenciesList, gapsList, featuresCount, flowsCount, totalIssues, cases, categories, filteredCases, matchesCategory, matchesSearch, totalCount, p0Count, p1Count, p2Count, p3Count, toggleExpand, toggleAll, next, toggleStep, key, copyMarkdown, md, exportDoc, casesBySection, sec, sections, subtitle, htmlContent, downloadDoc, currentUser, logout, navigate } = useProjectWorkspace();


  return (
    <>
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
    </>
  );
}
