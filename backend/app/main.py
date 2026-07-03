import os
import shutil
import time
import uuid
from typing import Optional, List

from fastapi import FastAPI, BackgroundTasks, HTTPException, UploadFile, File, Form, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import JOBS_DIR, UPLOADS_DIR, FIGMA_TOKEN
from app.jobs import create_job, get_job, update_job
from app.pipeline import run_analysis, run_test_generation
from app import doc_parser
from app.database import engine, Base, get_db
from app.models import Project, User, TreeNode
from app.auth import get_current_user, require_admin, hash_password, verify_password, create_access_token

Base.metadata.create_all(bind=engine)

app = FastAPI(title="QA Document Verifier")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs(JOBS_DIR, exist_ok=True)
os.makedirs(UPLOADS_DIR, exist_ok=True)


# ═══════════════════════════════════════════════════════
#  HEALTH
# ═══════════════════════════════════════════════════════

@app.get("/api/health")
async def health():
    return {"status": "ok"}


# ═══════════════════════════════════════════════════════
#  AUTH
# ═══════════════════════════════════════════════════════

class LoginRequest(BaseModel):
    login_id: str
    password: str


@app.post("/api/auth/login")
async def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.login_id == req.login_id).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(401, "Invalid login ID or password")
    if not user.is_active:
        raise HTTPException(403, "Account is deactivated — contact your admin")

    token = create_access_token({"sub": user.id, "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user.id, "login_id": user.login_id, "role": user.role},
    }


# ═══════════════════════════════════════════════════════
#  ADMIN — User Management
# ═══════════════════════════════════════════════════════

class CreateUserRequest(BaseModel):
    login_id: str
    password: str
    role: str = "user"  # "user" or "admin"


@app.post("/api/admin/users")
async def create_user(
    req: CreateUserRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    existing = db.query(User).filter(User.login_id == req.login_id).first()
    if existing:
        raise HTTPException(400, f"Login ID '{req.login_id}' already exists")
    user = User(
        id=str(uuid.uuid4()),
        login_id=req.login_id,
        password_hash=hash_password(req.password),
        role=req.role,
        is_active=True,
        created_at=time.time(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"id": user.id, "login_id": user.login_id, "role": user.role, "is_active": user.is_active}


@app.get("/api/admin/users")
async def list_users(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [
        {"id": u.id, "login_id": u.login_id, "role": u.role, "is_active": u.is_active, "created_at": u.created_at}
        for u in users
    ]


class UpdateUserRequest(BaseModel):
    is_active: Optional[bool] = None
    role: Optional[str] = None
    password: Optional[str] = None


@app.put("/api/admin/users/{user_id}")
async def update_user(
    user_id: str,
    req: UpdateUserRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    if req.is_active is not None:
        user.is_active = req.is_active
    if req.role is not None:
        user.role = req.role
    if req.password is not None:
        user.password_hash = hash_password(req.password)
    db.commit()
    return {"id": user.id, "login_id": user.login_id, "role": user.role, "is_active": user.is_active}


@app.delete("/api/admin/users/{user_id}")
async def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    if user_id == admin.id:
        raise HTTPException(400, "Cannot delete your own account")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    db.delete(user)
    db.commit()
    return {"message": "User deleted"}


# ═══════════════════════════════════════════════════════
#  DOCUMENT PREVIEW (unchanged)
# ═══════════════════════════════════════════════════════

@app.post("/api/preview")
async def preview_document(file: UploadFile = File(...)):
    temp_dir = os.path.join(UPLOADS_DIR, "temp_previews")
    os.makedirs(temp_dir, exist_ok=True)
    temp_path = os.path.join(temp_dir, file.filename)
    try:
        with open(temp_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        text = doc_parser.extract_text(temp_path)
        return {"text": text}
    except Exception as e:
        raise HTTPException(500, f"Failed to parse document: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


# ═══════════════════════════════════════════════════════
#  ANALYZE  (node_id added — backward-compatible)
# ═══════════════════════════════════════════════════════

@app.post("/api/analyze")
async def analyze(
    background_tasks: BackgroundTasks,
    brd: UploadFile | None = File(None),
    fsd: UploadFile | None = File(None),
    srs: UploadFile | None = File(None),
    frd: UploadFile | None = File(None),
    images: list[UploadFile] = File(default=[]),
    figma_url: str | None = Form(None),
    figma_token: str | None = Form(None),
    github_url: str | None = Form(None),
    project_url: str | None = Form(None),
    deep: bool = Form(False),
    node_id: str | None = Form(None),   # ← NEW: when set, output writes to TreeNode.data
):
    job_id = create_job()
    job_dir = os.path.join(UPLOADS_DIR, job_id)
    os.makedirs(job_dir, exist_ok=True)

    brd_path = None
    if brd is not None:
        brd_path = os.path.join(job_dir, f"brd_{brd.filename}")
        with open(brd_path, "wb") as f:
            shutil.copyfileobj(brd.file, f)

    fsd_path = None
    if fsd is not None:
        fsd_path = os.path.join(job_dir, f"fsd_{fsd.filename}")
        with open(fsd_path, "wb") as f:
            shutil.copyfileobj(fsd.file, f)

    image_paths = []
    for img in images:
        img_path = os.path.join(job_dir, f"img_{img.filename}")
        with open(img_path, "wb") as f:
            shutil.copyfileobj(img.file, f)
        image_paths.append(img_path)

    token = figma_token or FIGMA_TOKEN

    background_tasks.add_task(
        run_analysis,
        job_id, brd_path, fsd_path, image_paths,
        figma_url, token, project_url, deep,
        node_id=node_id,
    )
    return {"job_id": job_id}


# ═══════════════════════════════════════════════════════
#  JOB STATUS (unchanged)
# ═══════════════════════════════════════════════════════

@app.get("/api/job/{job_id}")
async def job_status(job_id: str):
    job = get_job(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    return job


# ═══════════════════════════════════════════════════════
#  GENERATE TESTS  (node_id added — backward-compatible)
# ═══════════════════════════════════════════════════════

class GenerateRequest(BaseModel):
    job_id: str
    user_prompt: str = ""
    deep: bool = False
    node_id: Optional[str] = None  # ← NEW


@app.post("/api/generate-tests")
async def generate_tests(req: GenerateRequest, background_tasks: BackgroundTasks):
    job = get_job(req.job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    if not job.get("understanding"):
        raise HTTPException(400, "Run /api/analyze first — no understanding summary found for this job.")

    background_tasks.add_task(
        run_test_generation,
        req.job_id, job["understanding"], req.user_prompt, req.deep,
        node_id=req.node_id,
    )
    return {"job_id": req.job_id}


# ═══════════════════════════════════════════════════════
#  CHATBOT (unchanged)
# ═══════════════════════════════════════════════════════

@app.post("/api/chatbot")
async def handle_chatbot(req: GenerateRequest, background_tasks: BackgroundTasks):
    job = get_job(req.job_id)
    if not job:
        raise HTTPException(404, "Job not found")

    from app.ollama_client import classify_chatbot_intent, simulate_execution

    classification = await classify_chatbot_intent(req.user_prompt, req.deep)
    intent = classification.get("intent", "generate")

    if intent == "execute":
        if not job.get("test_report") or not job["test_report"].get("test_cases"):
            return {"action": "error", "message": "No test cases available to execute."}

        executed_cases = await simulate_execution(job["test_report"]["test_cases"], req.user_prompt, req.deep)

        if executed_cases:
            for ec in executed_cases:
                for tc in job["test_report"]["test_cases"]:
                    if tc["id"] == ec.get("id"):
                        tc["status"] = ec.get("status", "")
                        tc["actual_result"] = ec.get("actual_result", "")
                        tc["executed_by"] = "AI Bot"
            return {"action": "execute", "updated_test_cases": executed_cases}
        return {"action": "execute", "updated_test_cases": []}
    else:
        if not job.get("understanding"):
            raise HTTPException(400, "Run /api/analyze first — no understanding summary found for this job.")
        background_tasks.add_task(
            run_test_generation, req.job_id, job["understanding"], req.user_prompt, req.deep
        )
        return {"action": "generate", "job_id": req.job_id}


# ═══════════════════════════════════════════════════════
#  EDIT TEST CASE (unchanged)
# ═══════════════════════════════════════════════════════

class TestCaseEditRequest(BaseModel):
    test_case: dict
    prompt: str
    deep: bool = False
    selected_fields: Optional[List[str]] = None


@app.post("/api/generate/edit-test-case")
async def edit_test_case_api(req: TestCaseEditRequest):
    from app.ollama_client import edit_single_test_case
    result = await edit_single_test_case(req.test_case, req.prompt, req.deep, req.selected_fields)
    if "error" in result:
        raise HTTPException(500, result["error"])
    return result


# ═══════════════════════════════════════════════════════
#  PROJECTS  (updated — auth-aware, expanded fields)
# ═══════════════════════════════════════════════════════

class CreateProjectRequest(BaseModel):
    name: str
    description: str = ""
    domain: str = ""
    testing_type: str = ""
    methodology: str = ""


class SaveProjectRequest(BaseModel):
    job_id: str


class CreateEmptyProjectRequest(BaseModel):
    name: str


class DraftNode(BaseModel):
    id: str
    parent_id: Optional[str] = None
    node_type: str
    name: str

class CreateProjectWithTreeRequest(BaseModel):
    project: CreateProjectRequest
    nodes: List[DraftNode] = []

@app.post("/api/projects/empty")
async def create_empty_project(
    req: CreateEmptyProjectRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    from app.jobs import JOBS
    project = Project(
        name=req.name,
        product_type=req.name,
        owner_id=current_user.id if current_user else None,
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    JOBS[project.id] = {
        "id": project.id,
        "name": project.name,
        "status": "done",
        "stage": "done",
        "understanding": None,
        "test_report": None,
    }
    return {"id": project.id, "name": project.name, "message": "Empty project created"}


@app.post("/api/projects/create_with_tree")
async def create_project_with_tree(
    req: CreateProjectWithTreeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    import uuid
    # 1. Create project
    project = Project(
        name=req.project.name,
        product_type=req.project.name,
        description=req.project.description,
        domain=req.project.domain,
        testing_type=req.project.testing_type,
        methodology=req.project.methodology,
        owner_id=current_user.id,
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    # 2. Map old temp-IDs to new real UUIDs
    id_map = {}
    for draft_node in req.nodes:
        id_map[draft_node.id] = str(uuid.uuid4())

    # 3. Insert TreeNodes
    for draft_node in req.nodes:
        real_id = id_map[draft_node.id]
        real_parent_id = None
        if draft_node.parent_id:
            real_parent_id = id_map.get(draft_node.parent_id)

        node = TreeNode(
            id=real_id,
            project_id=project.id,
            parent_id=real_parent_id,
            node_type=draft_node.node_type,
            name=draft_node.name,
        )
        db.add(node)
    
    db.commit()

    return {
        "id": project.id,
        "message": "Project and tree created successfully",
    }


@app.post("/api/projects")
async def create_project(
    req: CreateProjectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new project (new-style, with full metadata fields)."""
    project = Project(
        name=req.name,
        product_type=req.name,
        description=req.description,
        domain=req.domain,
        testing_type=req.testing_type,
        methodology=req.methodology,
        owner_id=current_user.id,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return {
        "id": project.id,
        "name": project.name,
        "description": project.description,
        "domain": project.domain,
        "testing_type": project.testing_type,
        "methodology": project.methodology,
        "message": "Project created",
    }


@app.post("/api/projects/save")
async def save_project(req: SaveProjectRequest, db: Session = Depends(get_db)):
    """Legacy: persist a completed analysis job into a project row."""
    job = get_job(req.job_id)
    if not job:
        raise HTTPException(400, "Job not found")

    product_type = (
        job.get("understanding", {}).get("product_type", "Unnamed Project")
        if job.get("understanding")
        else "Unnamed Project"
    )

    existing_project = db.query(Project).filter(Project.id == req.job_id).first()
    if existing_project:
        existing_project.understanding = job.get("understanding")
        existing_project.test_report = job.get("test_report")
        project = existing_project
    else:
        project = Project(
            name=product_type,
            product_type=product_type,
            understanding=job.get("understanding"),
            test_report=job.get("test_report"),
        )
        db.add(project)

    db.commit()
    db.refresh(project)
    return {"id": project.id, "message": "Project saved successfully"}


@app.get("/api/projects")
async def list_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return projects: admin sees all, users see their own + legacy (no owner)."""
    if current_user.role == "admin":
        projects = db.query(Project).order_by(Project.created_at.desc()).all()
    else:
        projects = (
            db.query(Project)
            .filter(
                (Project.owner_id == current_user.id) | (Project.owner_id == None)
            )
            .order_by(Project.created_at.desc())
            .all()
        )

    # Check if project has a tree (new-style) or is legacy
    result = []
    for p in projects:
        has_tree = db.query(TreeNode).filter(TreeNode.project_id == p.id).first() is not None
        result.append({
            "id": p.id,
            "name": p.name,
            "product_type": p.product_type,
            "description": p.description or "",
            "domain": p.domain or "",
            "testing_type": p.testing_type or "",
            "methodology": p.methodology or "",
            "created_at": p.created_at,
            "notepad": p.notepad,
            "total_cases": len(p.test_report.get("test_cases", [])) if p.test_report else 0,
            "has_tree": has_tree,
            "is_legacy": not has_tree and bool(p.test_report),
        })
    return result


@app.get("/api/projects/{project_id}")
async def get_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(404, "Project not found")

    from app.jobs import JOBS
    job_data = {
        "id": project.id,
        "name": project.name,
        "status": "done",
        "stage": "done",
        "notepad": project.notepad,
        "understanding": project.understanding,
        "test_report": project.test_report,
        "description": project.description or "",
        "domain": project.domain or "",
        "testing_type": project.testing_type or "",
        "methodology": project.methodology or "",
    }
    JOBS[project.id] = job_data
    return job_data


class UpdateProjectRequest(BaseModel):
    name: str
    notepad: str = ""
    description: str = ""
    domain: str = ""
    testing_type: str = ""
    methodology: str = ""


@app.put("/api/projects/{project_id}")
async def update_project(
    project_id: str,
    req: UpdateProjectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(404, "Project not found")
    project.name = req.name
    project.notepad = req.notepad
    project.description = req.description
    project.domain = req.domain
    project.testing_type = req.testing_type
    project.methodology = req.methodology
    db.commit()
    return {"message": "Project updated successfully"}


@app.delete("/api/projects/{project_id}")
async def delete_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(404, "Project not found")
    db.delete(project)
    db.commit()
    return {"message": "Project deleted successfully"}


class ImportProjectRequest(BaseModel):
    name: str
    notepad: str | None = ""
    understanding: dict | None = None
    test_report: dict | None = None


@app.post("/api/projects/import")
async def import_project(req: ImportProjectRequest, db: Session = Depends(get_db)):
    project = Project(
        name=req.name,
        product_type=req.name,
        notepad=req.notepad,
        understanding=req.understanding,
        test_report=req.test_report,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return {"id": project.id, "message": "Project imported successfully"}


# ═══════════════════════════════════════════════════════
#  TREE NODES
# ═══════════════════════════════════════════════════════

def _node_to_dict(node: TreeNode) -> dict:
    return {
        "id": node.id,
        "project_id": node.project_id,
        "parent_id": node.parent_id,
        "node_type": node.node_type,
        "name": node.name,
        "order": node.order,
        "data": node.data,
        "created_at": node.created_at,
    }


class CreateNodeRequest(BaseModel):
    project_id: str
    parent_id: Optional[str] = None
    node_type: str = "Module"
    name: str
    order: int = 0


class GenerateTreeRequest(BaseModel):
    prompt: str


@app.post("/api/tree/generate-from-prompt")
async def generate_from_prompt(
    req: GenerateTreeRequest,
    current_user: User = Depends(get_current_user),
):
    from app.ollama_client import generate_tree_structure
    nodes = await generate_tree_structure(req.prompt)
    return {"nodes": nodes}



@app.post("/api/tree/nodes")
async def create_tree_node(
    req: CreateNodeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == req.project_id).first()
    if not project:
        raise HTTPException(404, "Project not found")

    node = TreeNode(
        project_id=req.project_id,
        parent_id=req.parent_id,
        node_type=req.node_type,
        name=req.name,
        order=req.order,
    )
    db.add(node)
    db.commit()
    db.refresh(node)
    return _node_to_dict(node)


class CreateNodesBatchRequest(BaseModel):
    nodes: List[CreateNodeRequest]


@app.post("/api/tree/nodes/batch")
async def create_tree_nodes_batch(
    req: CreateNodesBatchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create multiple nodes in one call (used by AI suggest structure)."""
    created = []
    for n in req.nodes:
        node = TreeNode(
            project_id=n.project_id,
            parent_id=n.parent_id,
            node_type=n.node_type,
            name=n.name,
            order=n.order,
        )
        db.add(node)
        db.flush()  # get the id before commit
        created.append(_node_to_dict(node))
    db.commit()
    return created


@app.get("/api/tree/nodes/{project_id}")
async def get_tree_nodes(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return all nodes for a project as a flat list (frontend builds the tree)."""
    nodes = (
        db.query(TreeNode)
        .filter(TreeNode.project_id == project_id)
        .order_by(TreeNode.order, TreeNode.created_at)
        .all()
    )
    return [_node_to_dict(n) for n in nodes]


class UpdateNodeRequest(BaseModel):
    name: Optional[str] = None
    node_type: Optional[str] = None
    order: Optional[int] = None


@app.put("/api/tree/nodes/{node_id}")
async def update_tree_node(
    node_id: str,
    req: UpdateNodeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    node = db.query(TreeNode).filter(TreeNode.id == node_id).first()
    if not node:
        raise HTTPException(404, "Node not found")
    if req.name is not None:
        node.name = req.name
    if req.node_type is not None:
        node.node_type = req.node_type
    if req.order is not None:
        node.order = req.order
    db.commit()
    return _node_to_dict(node)


@app.delete("/api/tree/nodes/{node_id}")
async def delete_tree_node(
    node_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    node = db.query(TreeNode).filter(TreeNode.id == node_id).first()
    if not node:
        raise HTTPException(404, "Node not found")
    db.delete(node)
    db.commit()
    return {"message": "Node deleted"}


class PatchNodeDataRequest(BaseModel):
    data: dict


@app.patch("/api/tree/nodes/{node_id}/data")
async def patch_node_data(
    node_id: str,
    req: PatchNodeDataRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Write or merge AI output into a node's data field."""
    node = db.query(TreeNode).filter(TreeNode.id == node_id).first()
    if not node:
        raise HTTPException(404, "Node not found")
    existing = node.data or {}
    existing.update(req.data)
    node.data = existing
    db.commit()
    return _node_to_dict(node)


# ── Suggest child structure for a Feature node ────────────────────────────────

SUGGESTED_CHILDREN = {
    "Feature": [
        {"node_type": "TestSuite", "name": "Functional Tests"},
        {"node_type": "TestSuite", "name": "UI Tests"},
        {"node_type": "TestSuite", "name": "Edge Case Tests"},
        {"node_type": "TestSuite", "name": "Security Tests"},
        {"node_type": "TestSuite", "name": "Performance Tests"},
    ],
    "Module": [
        {"node_type": "Feature", "name": "Feature 1"},
        {"node_type": "Feature", "name": "Feature 2"},
    ],
    "TestSuite": [
        {"node_type": "TestCase", "name": "Test Case 1"},
        {"node_type": "TestCase", "name": "Test Case 2"},
    ],
}


@app.post("/api/tree/nodes/{node_id}/suggest-structure")
async def suggest_structure(
    node_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return AI-suggested child node templates for this node.
    The frontend shows these for user confirmation before creating them.
    """
    node = db.query(TreeNode).filter(TreeNode.id == node_id).first()
    if not node:
        raise HTTPException(404, "Node not found")

    suggestions = SUGGESTED_CHILDREN.get(node.node_type, [
        {"node_type": "Custom", "name": "Sub-item 1"},
        {"node_type": "Custom", "name": "Sub-item 2"},
    ])

    return {
        "node_id": node_id,
        "node_name": node.name,
        "node_type": node.node_type,
        "suggestions": suggestions,
    }
