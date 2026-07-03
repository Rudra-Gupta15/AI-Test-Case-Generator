with open("src/index.css", "r", encoding="utf-8") as f:
    code = f.read()

# Add specific overrides for tree-left-panel form fields
css_overrides = """
.tree-left-panel .form-field label { color: #cbd5e1; }
.tree-left-panel .form-field input, 
.tree-left-panel .form-field textarea, 
.tree-left-panel .form-field select {
  background: #1e293b;
  border: 1px solid #334155;
  color: #f8fafc;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);
}
.tree-left-panel .form-field input:focus, 
.tree-left-panel .form-field textarea:focus, 
.tree-left-panel .form-field select:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
}
.tree-left-panel .left-panel-save-btn {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  border: none;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
  transition: all 0.2s;
}
.tree-left-panel .left-panel-save-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(37, 99, 235, 0.4);
}
"""

code += css_overrides

with open("src/index.css", "w", encoding="utf-8") as f:
    f.write(code)

print("CSS updated.")
