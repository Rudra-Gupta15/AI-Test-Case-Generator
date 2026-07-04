import os
import shutil
import time
import uuid
from typing import Optional, List

from fastapi import FastAPI, BackgroundTasks, HTTPException, UploadFile, File, Form, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.config import JOBS_DIR, UPLOADS_DIR, FIGMA_TOKEN
from app.jobs import create_job, get_job, update_job
from app.pipeline import run_analysis, run_test_generation
from app import doc_parser
from app.database import get_db
from app.models import Project, User, TreeNode
from app.auth import get_current_user, require_admin, hash_password, verify_password, create_access_token

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
async def login(req: LoginRequest, db = Depends(get_db)):
    user_dict = await db.users.find_one({"login_id": req.login_id})
    if not user_dict or not verify_password(req.password, user_dict.get("password_hash")):
        raise HTTPException(401, "Invalid login ID or password")
    if not user_dict.get("is_active"):
        raise HTTPException(403, "Account is deactivated — contact your admin")

    token = create_access_token({"sub": user_dict["id"], "role": user_dict.get("role", "user")})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user_dict["id"], "login_id": user_dict["login_id"], "role": user_dict.get("role", "user")},
    }


# ═══════════════════════════════════════════════════════
#  ADMIN — User Management
# ═══════════════════════════════════════════════════════

class CreateUserRequest(BaseModel):
    login_id: str
    password: str
    role: str = "user"


@app.post("/api/admin/users")
async def create_user(
    req: CreateUserRequest,
    db = Depends(get_db),
    _: User = Depends(require_admin),
):
    existing = await db.users.find_one({"login_id": req.login_id})
    if existing:
        raise HTTPException(400, f"Login ID '{req.login_id}' already exists")
    user = User(
        login_id=req.login_id,
        password_hash=hash_password(req.password),
        role=req.role,
        is_active=True,
    )
    user_dict = user.model_dump()
    await db.users.insert_one(user_dict)
    return {"id": user.id, "login_id": user.login_id, "role": user.role, "is_active": user.is_active}


@app.get("/api/admin/users")
async def list_users(db = Depends(get_db), _: User = Depends(require_admin)):
    users_cursor = db.users.find().sort("created_at", -1)
    users = await users_cursor.to_list(length=1000)
    return [
        {"id": u["id"], "login_id": u["login_id"], "role": u.get("role", "user"), "is_active": u.get("is_active", True), "created_at": u.get("created_at")}
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
    db = Depends(get_db),
    _: User = Depends(require_admin),
):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(404, "User not found")
    
    update_data = {}
    if req.is_active is not None:
        update_data["is_active"] = req.is_active
    if req.role is not None:
        update_data["role"] = req.role
    if req.password is not None:
        update_data["password_hash"] = hash_password(req.password)
    
    if update_data:
        await db.users.update_one({"id": user_id}, {"$set": update_data})
        user.update(update_data)
        
    return {"id": user["id"], "login_id": user["login_id"], "role": user.get("role", "user"), "is_active": user.get("is_active", True)}


@app.delete("/api/admin/users/{user_id}")
async def delete_user(
    user_id: str,
    db = Depends(get_db),
    admin: User = Depends(require_admin),
):
    if user_id == admin.id:
        raise HTTPException(400, "Cannot delete your own account")
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "User not found")
    return {"message": "User deleted"}


# ═══════════════════════════════════════════════════════
#  DOCUMENT PREVIEW
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
#  ANALYZE 
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
    node_id: str | None = Form(None),
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

    srs_path = None
    if srs is not None:
        srs_path = os.path.join(job_dir, f"srs_{srs.filename}")
        with open(srs_path, "wb") as f:
            shutil.copyfileobj(srs.file, f)

    frd_path = None
    if frd is not None:
        frd_path = os.path.join(job_dir, f"frd_{frd.filename}")
        with open(frd_path, "wb") as f:
            shutil.copyfileobj(frd.file, f)

    image_paths = []
    for img in images:
        img_path = os.path.join(job_dir, f"img_{img.filename}")
        with open(img_path, "wb") as f:
            shutil.copyfileobj(img.file, f)
        image_paths.append(img_path)

    token = figma_token or FIGMA_TOKEN

    background_tasks.add_task(
        run_analysis,
        job_id, brd_path, fsd_path, srs_path, frd_path, image_paths,
        figma_url, token, project_url, deep,
        node_id=node_id,
    )
    return {"job_id": job_id}


# ═══════════════════════════════════════════════════════
#  JOB STATUS
# ═══════════════════════════════════════════════════════

@app.get("/api/job/{job_id}")
async def job_status(job_id: str):
    job = get_job(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    return job


# ═══════════════════════════════════════════════════════
#  GENERATE TESTS
# ═══════════════════════════════════════════════════════

class GenerateRequest(BaseModel):
    job_id: str
    user_prompt: str = ""
    deep: bool = False
    node_id: Optional[str] = None


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
#  CHATBOT
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
#  EDIT TEST CASE
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
#  PROJECTS
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
    db = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    from app.jobs import JOBS
    project = Project(
        name=req.name,
        product_type=req.name,
        owner_id=current_user.id if current_user else None,
    )
    p_dict = project.model_dump()
    await db.projects.insert_one(p_dict)

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
    db = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = Project(
        name=req.project.name,
        product_type=req.project.name,
        description=req.project.description,
        domain=req.project.domain,
        testing_type=req.project.testing_type,
        methodology=req.project.methodology,
        owner_id=current_user.id,
    )
    p_dict = project.model_dump()
    await db.projects.insert_one(p_dict)

    id_map = {}
    for draft_node in req.nodes:
        id_map[draft_node.id] = str(uuid.uuid4())

    nodes_to_insert = []
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
        nodes_to_insert.append(node.model_dump())
    
    if nodes_to_insert:
        await db.tree_nodes.insert_many(nodes_to_insert)

    return {
        "id": project.id,
        "message": "Project and tree created successfully",
    }


@app.post("/api/projects")
async def create_project(
    req: CreateProjectRequest,
    db = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = Project(
        name=req.name,
        product_type=req.name,
        description=req.description,
        domain=req.domain,
        testing_type=req.testing_type,
        methodology=req.methodology,
        owner_id=current_user.id,
    )
    p_dict = project.model_dump()
    await db.projects.insert_one(p_dict)
    
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
async def save_project(req: SaveProjectRequest, db = Depends(get_db)):
    job = get_job(req.job_id)
    if not job:
        raise HTTPException(400, "Job not found")

    product_type = (
        job.get("understanding", {}).get("product_type", "Unnamed Project")
        if job.get("understanding")
        else "Unnamed Project"
    )

    existing_project = await db.projects.find_one({"id": req.job_id})
    if existing_project:
        await db.projects.update_one(
            {"id": req.job_id},
            {"$set": {
                "understanding": job.get("understanding"),
                "test_report": job.get("test_report")
            }}
        )
        project_id = req.job_id
    else:
        project = Project(
            id=req.job_id,
            name=product_type,
            product_type=product_type,
            understanding=job.get("understanding"),
            test_report=job.get("test_report"),
        )
        p_dict = project.model_dump()
        await db.projects.insert_one(p_dict)
        project_id = project.id

    return {"id": project_id, "message": "Project saved successfully"}


@app.get("/api/projects")
async def list_projects(
    db = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == "admin":
        cursor = db.projects.find().sort("created_at", -1)
    else:
        cursor = db.projects.find({
            "$or": [
                {"owner_id": current_user.id},
                {"owner_id": None}
            ]
        }).sort("created_at", -1)
        
    projects = await cursor.to_list(length=1000)

    result = []
    for p in projects:
        has_tree = await db.tree_nodes.find_one({"project_id": p["id"]}) is not None
        test_report = p.get("test_report")
        result.append({
            "id": p["id"],
            "name": p["name"],
            "product_type": p.get("product_type"),
            "description": p.get("description", ""),
            "domain": p.get("domain", ""),
            "testing_type": p.get("testing_type", ""),
            "methodology": p.get("methodology", ""),
            "created_at": p.get("created_at"),
            "notepad": p.get("notepad", ""),
            "total_cases": len(test_report.get("test_cases", [])) if test_report else 0,
            "has_tree": has_tree,
            "is_legacy": not has_tree and bool(test_report),
        })
    return result


@app.get("/api/projects/{project_id}")
async def get_project(
    project_id: str,
    db = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(404, "Project not found")

    from app.jobs import JOBS
    job_data = {
        "id": project["id"],
        "name": project["name"],
        "status": "done",
        "stage": "done",
        "notepad": project.get("notepad", ""),
        "understanding": project.get("understanding"),
        "test_report": project.get("test_report"),
        "description": project.get("description", ""),
        "domain": project.get("domain", ""),
        "testing_type": project.get("testing_type", ""),
        "methodology": project.get("methodology", ""),
    }
    JOBS[project["id"]] = job_data
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
    db = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.projects.update_one(
        {"id": project_id},
        {"$set": {
            "name": req.name,
            "notepad": req.notepad,
            "description": req.description,
            "domain": req.domain,
            "testing_type": req.testing_type,
            "methodology": req.methodology,
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Project not found")
    return {"message": "Project updated successfully"}


@app.delete("/api/projects/{project_id}")
async def delete_project(
    project_id: str,
    db = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.projects.delete_one({"id": project_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Project not found")
    await db.tree_nodes.delete_many({"project_id": project_id})
    return {"message": "Project deleted successfully"}


class ImportProjectRequest(BaseModel):
    name: str
    notepad: str | None = ""
    understanding: dict | None = None
    test_report: dict | None = None


@app.post("/api/projects/import")
async def import_project(req: ImportProjectRequest, db = Depends(get_db)):
    project = Project(
        name=req.name,
        product_type=req.name,
        notepad=req.notepad or "",
        understanding=req.understanding,
        test_report=req.test_report,
    )
    p_dict = project.model_dump()
    await db.projects.insert_one(p_dict)
    return {"id": project.id, "message": "Project imported successfully"}


# ═══════════════════════════════════════════════════════
#  TREE NODES
# ═══════════════════════════════════════════════════════

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
    db = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = await db.projects.find_one({"id": req.project_id})
    if not project:
        raise HTTPException(404, "Project not found")

    node = TreeNode(
        project_id=req.project_id,
        parent_id=req.parent_id,
        node_type=req.node_type,
        name=req.name,
        order=req.order,
    )
    n_dict = node.model_dump()
    await db.tree_nodes.insert_one(n_dict)
    n_dict.pop("_id", None)
    return n_dict


class CreateNodesBatchRequest(BaseModel):
    nodes: List[CreateNodeRequest]


@app.post("/api/tree/nodes/batch")
async def create_tree_nodes_batch(
    req: CreateNodesBatchRequest,
    db = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    created = []
    nodes_to_insert = []
    for n in req.nodes:
        node = TreeNode(
            project_id=n.project_id,
            parent_id=n.parent_id,
            node_type=n.node_type,
            name=n.name,
            order=n.order,
        )
        n_dict = node.model_dump()
        nodes_to_insert.append(n_dict)
        n_dict_copy = n_dict.copy()
        n_dict_copy.pop("_id", None)
        created.append(n_dict_copy)
        
    if nodes_to_insert:
        await db.tree_nodes.insert_many(nodes_to_insert)
        
    return created


@app.get("/api/tree/nodes/{project_id}")
async def get_tree_nodes(
    project_id: str,
    db = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cursor = db.tree_nodes.find({"project_id": project_id}).sort([("order", 1), ("created_at", 1)])
    nodes = await cursor.to_list(length=10000)
    for n in nodes:
        n.pop("_id", None)
    return nodes


class UpdateNodeRequest(BaseModel):
    name: Optional[str] = None
    node_type: Optional[str] = None
    order: Optional[int] = None


@app.put("/api/tree/nodes/{node_id}")
async def update_tree_node(
    node_id: str,
    req: UpdateNodeRequest,
    db = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    update_data = {}
    if req.name is not None:
        update_data["name"] = req.name
    if req.node_type is not None:
        update_data["node_type"] = req.node_type
    if req.order is not None:
        update_data["order"] = req.order
        
    if update_data:
        result = await db.tree_nodes.update_one({"id": node_id}, {"$set": update_data})
        if result.matched_count == 0:
            raise HTTPException(404, "Node not found")
            
    node = await db.tree_nodes.find_one({"id": node_id})
    if node:
        node.pop("_id", None)
    return node


@app.delete("/api/tree/nodes/{node_id}")
async def delete_tree_node(
    node_id: str,
    db = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.tree_nodes.delete_one({"id": node_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Node not found")
    return {"message": "Node deleted"}


class PatchNodeDataRequest(BaseModel):
    data: dict


@app.patch("/api/tree/nodes/{node_id}/data")
async def patch_node_data(
    node_id: str,
    req: PatchNodeDataRequest,
    db = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    node = await db.tree_nodes.find_one({"id": node_id})
    if not node:
        raise HTTPException(404, "Node not found")
        
    existing = node.get("data") or {}
    existing.update(req.data)
    
    await db.tree_nodes.update_one({"id": node_id}, {"$set": {"data": existing}})
    
    node["data"] = existing
    node.pop("_id", None)
    return node


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
    db = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    node = await db.tree_nodes.find_one({"id": node_id})
    if not node:
        raise HTTPException(404, "Node not found")

    suggestions = SUGGESTED_CHILDREN.get(node.get("node_type"), [
        {"node_type": "Custom", "name": "Sub-item 1"},
        {"node_type": "Custom", "name": "Sub-item 2"},
    ])

    return {
        "node_id": node_id,
        "node_name": node.get("name"),
        "node_type": node.get("node_type"),
        "suggestions": suggestions,
    }
