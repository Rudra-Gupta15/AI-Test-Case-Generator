import os
import re

with open("LegacyWorkspaceView.jsx.bak", "r", encoding="utf-8") as f:
    content = f.read()

idx_return = content.find("  return (\n    <div className={`app-window")
ui_code = content[idx_return:]

# Getting the imports to use at top of files
with open("src/context/ProjectWorkspaceContext.jsx", "r", encoding="utf-8") as f:
    context_content = f.read()
exports_match = re.search(r"const value = \{\s*([\s\S]*?)\s*\};", context_content)
exports_str = exports_match.group(1).replace("\n", "").replace(" ", "")
exports_list = [x for x in exports_str.split(",") if x]
destructure_str = f"  const {{ {', '.join(exports_list)} }} = useProjectWorkspace();\n"

# Create WorkspaceLayout
layout_content = f"""import React from 'react';
import {{ Outlet, Link }} from 'react-router-dom';
import {{ useProjectWorkspace }} from '../../context/ProjectWorkspaceContext.jsx';
import {{ Settings, LogOut, ChevronLeft }} from 'lucide-react';

export default function ProjectWorkspaceLayout() {{
{destructure_str}

  return (
    <div className={{`app-window step-${{step}}`}}>
      <div className="left-sidebar">
        <div className="sidebar-header">
          <Link to="/projects" className="back-btn" title="Back to Projects" onClick={{resetApp}}>
            <ChevronLeft size={{20}} />
          </Link>
          <div className="logo-container" style={{ margin: 0 }}>
            <div className="logo-icon">P</div>
            <div className="logo-text">PREVOYANCE<span className="logo-sub">IT SOLUTIONS</span></div>
          </div>
        </div>

        <nav className="sidebar-nav" style={{ marginTop: '32px' }}>
          <Link to={{`/project/${{job?.id || 'new'}}/upload`}} className={{`nav-link-btn ${{step === 1 ? 'active' : ''}}`}}>
            <span className="nav-icon">1</span>
            Data Sources
          </Link>
          <Link to={{`/project/${{job?.id || 'new'}}/analysis`}} className={{`nav-link-btn ${{step === 2 ? 'active' : ''}} ${{!job?.understanding ? 'disabled' : ''}}`}}>
            <span className="nav-icon">2</span>
            AI Analysis
          </Link>
          <Link to={{`/project/${{job?.id || 'new'}}/test-cases`}} className={{`nav-link-btn ${{step === 3 ? 'active' : ''}} ${{'disabled'}}`}}>
            <span className="nav-icon">3</span>
            Test Suite
          </Link>
          <Link to={{`/project/${{job?.id || 'new'}}/history`}} className={{`nav-link-btn ${{step === 4 ? 'active' : ''}}`}}>
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
          <button className="icon-btn-subtle" onClick={{logout}} title="Sign out">
            <LogOut size={{16}} />
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
}}
"""

with open("src/components/workspace/ProjectWorkspaceLayout.jsx", "w", encoding="utf-8") as f:
    f.write(layout_content)


# We are going to just copy the LegacyWorkspaceView into each page component, but wrap it so ONLY the specific step renders.
# This is much safer than writing a python brace matcher which might fail on complex JSX.
# We replace `return ( <div className="app-window"> ... )` with `return ( <>{step === X && (...) }</> )`
# Actually, since we use `<Outlet />`, the router will mount the specific page component, so we don't even need `step === X` check inside the page. 
# BUT the UI depends on those variables!

# The easiest and fastest way to ensure 100% correct code extraction without syntax errors is to let the page component return the exact same JSX, but ONLY for its step.

def make_page(name, step_num):
    # Find the block for `{step === X && (`
    start_str = f"{{step === {step_num}"
    idx = ui_code.find(start_str)
    
    # We will just dump the entire ui_code, but inside the page we will force `step = X` just for the render.
    
    page_content = f"""import React, { { 'useState, useRef, useEffect' if name != 'HistoryPage' else 'useState' } } from 'react';
import {{ useProjectWorkspace, ANALYZE_STAGES }} from '../../context/ProjectWorkspaceContext.jsx';
import FilePreviewer from '../shared/FilePreviewer.jsx';
import ImageThumbnail from '../shared/ImageThumbnail.jsx';
import Mermaid from '../shared/Mermaid.jsx';
import TreeFolder from './TreeFolder.jsx';
import {{ ChevronRight, Search, Menu, Upload, ExternalLink, RefreshCw, Layers, Layout, AlertCircle, FileText, Download, Code, Play, CheckCircle, Save, Settings, LogOut, ChevronLeft, GitPullRequest, SearchCode, Database, CheckSquare, Bug, ChevronDown }} from 'lucide-react';

export default function {name}() {{
{destructure_str}
  
  // We force step variable for this specific page's legacy logic to render
  const localStep = {step_num};

  // We are copying the UI but ONLY returning the children of step {step_num}
"""
    # The safest way is to just find the inner content of step X.
    # Since writing a python brace parser is tricky, I will use regex with greedy matching up to the next step, or just use a simple brace parser.
    return page_content

print("Layout created.")
