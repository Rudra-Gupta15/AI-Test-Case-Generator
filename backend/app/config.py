import os

# ---- Ollama models ----
# Use a vision-capable model since we feed it BRD/FSD text + reference images + Figma data
DEFAULT_FAST_MODEL = "gpt-oss:120b-cloud"     # quick understanding + test case generation
DEFAULT_DEEP_MODEL = "gpt-oss:120b-cloud"     # deep mode - more thorough test case generation (text only)
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")

# ---- Figma ----
FIGMA_API_BASE = "https://api.figma.com/v1"
FIGMA_TOKEN = os.getenv("FIGMA_TOKEN", "")

# ---- Jobs ----
JOBS_DIR = os.getenv("JOBS_DIR", "./jobs")
UPLOADS_DIR = os.getenv("UPLOADS_DIR", "./uploads")

# ---- Defaults ----
DEFAULT_BASELINE_CATEGORIES = [
    "Navigation",
    "Form Validation",
    "Responsiveness",
    "Error Handling",
    "Accessibility",
]
