import os
import re

with open("LegacyWorkspaceView.jsx.bak", "r", encoding="utf-8") as f:
    content = f.read()

idx_return = content.find("  return (\n    <div className={`app-window")
if idx_return == -1:
    print("Could not find main return")
    exit(1)

logic_match = re.search(r"export default function LegacyWorkspaceView\(\) \{([\s\S]*?)(\s+)return \(\n    <div className=\{`app-window", content)
logic = logic_match.group(1)

exports = []
for line in logic.split('\n'):
    match_state = re.match(r"^\s*const\s+\[(.*?),.*\]\s*=\s*useState", line)
    if match_state:
        var_name = match_state.group(1).strip()
        set_name = var_name[0].upper() + var_name[1:]
        exports.append(var_name)
        exports.append(f"set{set_name}")
    
    match_func = re.match(r"^\s*const\s+([a-zA-Z0-9_]+)\s*=", line)
    if match_func:
        name = match_func.group(1).strip()
        if name not in ['navigate', 'currentUser', 'logout'] and name not in exports:
            exports.append(name)
            
    match_ref = re.match(r"^\s*const\s+([a-zA-Z0-9_]+)\s*=\s*useRef", line)
    if match_ref:
        name = match_ref.group(1).strip()
        if name not in exports:
            exports.append(name)

# Exclude some things that aren't variables
exports = [e for e in exports if e not in ['stageIndex', 'showAnalyzeRail', 'featuresList', 'flowsList', 'inconsistenciesList', 'gapsList', 'featuresCount', 'flowsCount', 'totalIssues', 'cases', 'categories', 'filteredCases', 'totalCount', 'p0Count', 'p1Count', 'p2Count', 'p3Count']]

if 'job' not in exports: exports.append('job')
if 'setJob' not in exports: exports.append('setJob')
if 'step' not in exports: exports.append('step')
if 'setStep' not in exports: exports.append('setStep')

context_code = """import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
"""
context_code += logic
context_code += f"""
  const value = {{
    {', '.join(exports)},
    currentUser,
    logout,
    navigate
  }};

  return (
    <ProjectWorkspaceContext.Provider value={{value}}>
      {{children}}
    </ProjectWorkspaceContext.Provider>
  );
}}
"""

with open("src/context/ProjectWorkspaceContext.jsx", "w", encoding="utf-8") as f:
    f.write(context_code)

print("Context created successfully. Number of exports:", len(exports))
