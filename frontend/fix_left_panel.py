import re

with open("src/components/tree/LeftPanel.jsx", "r", encoding="utf-8") as f:
    code = f.read()

# Update the wrapper div and header
wrapper_pattern = r'<div className="tree-left-panel">.*?<h3>Project Details</h3>.*?</div>'
new_wrapper = """<div className="tree-left-panel" style={{ background: '#0f172a', borderRight: '1px solid #1e293b' }}>
      <div className="tree-panel-header" style={{ borderBottom: '1px solid #1e293b', padding: '20px 24px' }}>
        <h3 style={{ color: '#ffffff', fontSize: '14px', letterSpacing: '0.05em' }}>PROJECT DETAILS</h3>
      </div>"""
code = re.sub(wrapper_pattern, new_wrapper, code, flags=re.DOTALL)

# Let's fix the inline styles for inputs using CSS in index.css so it applies correctly, 
# or we can apply it inline here. The easiest way is to add a className modifier to left-panel-body
# Wait, let's just write CSS overrides in index.css for .tree-left-panel .form-field.
with open("src/components/tree/LeftPanel.jsx", "w", encoding="utf-8") as f:
    f.write(code)

print("LeftPanel JSX updated.")
