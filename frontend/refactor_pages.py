import os
import re

with open("LegacyWorkspaceView.jsx.bak", "r", encoding="utf-8") as f:
    content = f.read()

idx_return = content.find("  return (\n")
if idx_return == -1:
    idx_return = content.find("  return (")

ui_code = content[idx_return:]

# We need to construct the pages by importing the context and pulling all those variables out.
# This means at the top of each page component, we do:
# const { ... } = useProjectWorkspace();

# To avoid manually typing 51 variables, we can just extract the exports from the context file.
with open("src/context/ProjectWorkspaceContext.jsx", "r", encoding="utf-8") as f:
    context_content = f.read()
    
exports_match = re.search(r"const value = \{\s*([\s\S]*?)\s*\};", context_content)
exports_str = exports_match.group(1).replace("\n", "").replace(" ", "")
exports_list = [x for x in exports_str.split(",") if x]

# Build the destructuring string
destructure_str = f"  const {{ {', '.join(exports_list)} }} = useProjectWorkspace();\n"

# We can also add some standard imports.
page_imports = """import React, { useState } from 'react';
import { useProjectWorkspace, ANALYZE_STAGES } from '../../context/ProjectWorkspaceContext.jsx';
import FilePreviewer from '../shared/FilePreviewer.jsx';
import ImageThumbnail from '../shared/ImageThumbnail.jsx';
import Mermaid from '../shared/Mermaid.jsx';
import TreeFolder from './TreeFolder.jsx';

"""

# Instead of perfectly parsing the JSX, we can cheat a little bit. We can just copy the entire `ui_code` to each page, 
# and wrap it in the component, but we hardcode the `step` variable so the unused parts don't render!
# Or we can just leave `step` in the context, but that's messy.
# Wait, if we just copy the entire UI code, the file sizes will be huge and not actually split the code visually.
# The user wants distinct pages. So we must extract the specific `step === X` blocks.

# Let's extract step 1
step1_match = re.search(r"\{step === 1 && \(\s*([\s\S]*?)\s*\)\}", ui_code)
# regex is dangerous with nested braces. Let's write a simple brace matcher.

def extract_block(text, start_pattern):
    idx = text.find(start_pattern)
    if idx == -1: return ""
    idx += len(start_pattern)
    brace_count = 1
    end_idx = idx
    for i in range(idx, len(text)):
        if text[i] == '{': brace_count += 1
        elif text[i] == '}': brace_count -= 1
        
        if brace_count == 0:
            end_idx = i
            break
    
    # We found the matching closing brace for the `(...)` or `{...}`. Wait, the pattern is `{step === 1 && (`
    # so we need to match parenthesis, not braces.
    return ""

def extract_parens_block(text, start_pattern):
    idx = text.find(start_pattern)
    if idx == -1: return ""
    idx += len(start_pattern)
    paren_count = 1
    end_idx = idx
    for i in range(idx, len(text)):
        if text[i] == '(': paren_count += 1
        elif text[i] == ')': paren_count -= 1
        
        if paren_count == 0:
            end_idx = i
            break
    return text[idx:end_idx].strip()

step1_ui = extract_parens_block(ui_code, "{step === 1 && (")
step2_ui = extract_parens_block(ui_code, "{step === 2 && job?.understanding && (")
step3_ui = extract_parens_block(ui_code, "{step === 3 && job?.test_report && (")
step4_ui = extract_parens_block(ui_code, "{step === 4 && (")

# But wait, there is a common wrapper: the sidebar, topnav, etc.
# Actually, the user wants a page structure. The sidebar and topnav are part of the page layout.
# We should create a `WorkspaceLayout.jsx` that renders the sidebar, topnav, and an `<Outlet />` for the specific pages.
# Let's check what wraps the steps.
