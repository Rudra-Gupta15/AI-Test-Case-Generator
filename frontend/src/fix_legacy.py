import re

with open("App.jsx", "r", encoding="utf-8") as f:
    code = f.read()

# 1. Update fetchProjects effect
code = re.sub(
    r"useEffect\(\(\) => \{\s*if \(step === 4\) \{\s*fetchProjects\(\)\s*\}\s*\}, \[step\]\)",
    "useEffect(() => {\n    fetchProjects()\n  }, [])",
    code
)

# 2. Add useAuth, useNavigate to LegacyWorkspaceView
if "useNavigate()" not in code.split("function LegacyWorkspaceView()")[1][:300]:
    code = code.replace("function LegacyWorkspaceView() {", "import { useNavigate } from 'react-router-dom'\n\nfunction LegacyWorkspaceView() {")
    code = code.replace("const [brd, setBrd] = useState(null)", "const navigate = useNavigate();\n  const { currentUser, logout } = useAuth();\n  const [brd, setBrd] = useState(null)")

# 3. Restructure step 1 layout
# We will inject the dark navbar and wrap step 1 in a split layout.
# We replace the app-main-content step-1 wrapper logic.

# The return starts with <div className="app-container">
# And <div className={`app-main-content step-${step}`}>

# Let's write out the modified App.jsx
with open("App.jsx", "w", encoding="utf-8") as f:
    f.write(code)

print("Updated simple parts.")
