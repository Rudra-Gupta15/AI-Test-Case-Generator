with open("src/index.css", "r", encoding="utf-8") as f:
    code = f.read()

css_overrides = """
/* Refined Tree UI Overrides */
.tree-panel-header {
  padding: 16px 20px;
  background: #ffffff;
}
.tree-panel-header h3 {
  font-size: 14px;
  letter-spacing: 0.05em;
  color: #0f172a;
}
.tree-right-panel .tree-panel-header {
  background: #f8fafc;
}
.tree-root-node {
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}
.tree-item-row {
  border-radius: 8px;
  padding: 6px 8px;
}
.tree-item-row:hover {
  background: #f1f5f9;
}
.tree-item-row.selected {
  background: #e0e7ff;
  border-left: 3px solid #6366f1;
}
.tree-node-badge--project { background: #ede9fe; color: #7c3aed; border: 1px solid #ddd6fe; }
.tree-node-badge--module { background: #e0f2fe; color: #0284c7; border: 1px solid #bae6fd; }
.tree-node-badge--feature { background: #dcfce7; color: #16a34a; border: 1px solid #bbf7d0; }
.tree-node-badge--requirement { background: #fef9c3; color: #ca8a04; border: 1px solid #fef08a; }

.tree-builder-panels {
  gap: 1px;
  background: #e2e8f0;
}
.tree-left-panel, .tree-middle-panel, .tree-right-panel {
  border: none;
}
"""

code += css_overrides

with open("src/index.css", "w", encoding="utf-8") as f:
    f.write(code)

print("Tree CSS refined.")
