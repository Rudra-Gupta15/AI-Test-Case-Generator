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

    # Re-fetch the updated user to return fresh data
    updated_user = await db.users.find_one({"id": user_id})
    return {
        "id": updated_user["id"],
        "login_id": updated_user["login_id"],
        "role": updated_user.get("role", "user"),
        "is_active": updated_user.get("is_active", True),
    }


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
def preview_document(file: UploadFile = File(...)):
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
    other_doc: UploadFile | None = File(None),
    other_doc_type: str | None = Form(None),
    images: list[UploadFile] = File(default=[]),
    figma_url: str | None = Form(None),
    figma_token: str | None = Form(None),
    github_url: str | None = Form(None),
    project_url: str | None = Form(None),
    site_username: str | None = Form(None),
    site_password: str | None = Form(None),
    deep: bool = Form(False),
    node_id: str | None = Form(None),
    project_id: str | None = Form(None),
    ai_mode: str = Form("strict"),
):
    job_id = create_job(project_id, ai_mode=ai_mode)
    # Store metadata in the job so it can be saved later
    from app.jobs import update_job
    update_job(job_id, github_url=github_url, project_url=project_url,
               site_username=site_username, site_password=site_password)
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

    other_doc_path = None
    if other_doc is not None:
        import base64
        dtype = other_doc_type or "Other"
        enc_type = base64.b64encode(dtype.encode('utf-8')).decode('utf-8')
        other_doc_path = os.path.join(job_dir, f"other_type_{enc_type}_{other_doc.filename}")
        with open(other_doc_path, "wb") as f:
            shutil.copyfileobj(other_doc.file, f)

    image_paths = []
    for img in images:
        img_path = os.path.join(job_dir, f"img_{img.filename}")
        with open(img_path, "wb") as f:
            shutil.copyfileobj(img.file, f)
        image_paths.append(img_path)

    token = figma_token or FIGMA_TOKEN

    background_tasks.add_task(
        run_analysis,
        job_id, brd_path, fsd_path, other_doc_path, other_doc_type, image_paths,
        figma_url, token, project_url, deep,
        node_id=node_id,
        ai_mode=ai_mode,
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
        job_ai_mode = job.get("ai_mode", "strict")
        background_tasks.add_task(
            run_test_generation, req.job_id, job["understanding"], req.user_prompt, req.deep,
            ai_mode=job_ai_mode,
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
    ai_mode: str = "strict"


@app.post("/api/generate/edit-test-case")
async def edit_test_case_api(req: TestCaseEditRequest):
    from app.ollama_client import edit_single_test_case
    result = await edit_single_test_case(req.test_case, req.prompt, req.deep, req.selected_fields, req.ai_mode)
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
    understanding: Optional[dict] = None
    test_report: Optional[dict] = None
    github_url: Optional[str] = None
    project_url: Optional[str] = None
    site_username: Optional[str] = None
    site_password: Optional[str] = None


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
    p_dict["parent_id"] = project.id
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
    p_dict["parent_id"] = project.id
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
    p_dict["parent_id"] = project.id
    await db.projects.insert_one(p_dict)
    
    return {
        "id": project.id,
        "parent_id": p_dict["parent_id"],
        "name": project.name,
        "description": project.description,
        "domain": project.domain,
        "testing_type": project.testing_type,
        "methodology": project.methodology,
        "message": "Project created",
    }


@app.post("/api/projects/{project_id}/duplicate")
async def duplicate_project(
    project_id: str,
    db = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    parent_id = project.get("parent_id", project_id)
    version_count = await db.projects.count_documents({"parent_id": parent_id})
    root_has_parent_id = await db.projects.count_documents({"id": parent_id, "parent_id": parent_id})
    
    if root_has_parent_id == 0:
        # The root project was created before the parent_id feature, so it isn't counted in version_count
        version_count += 1
        
    new_version_num = version_count + 1
    
    import re
    base_name = re.sub(r' - Version \d+$', '', project.get("name", "Project"))
    new_name = f"{base_name} - Version {new_version_num}"
    
    new_id = str(uuid.uuid4())
    
    # Copy files
    old_dir = os.path.join(UPLOADS_DIR, project_id)
    new_dir = os.path.join(UPLOADS_DIR, new_id)
    if os.path.exists(old_dir):
        shutil.copytree(old_dir, new_dir)
        
    # Duplicate tree nodes
    nodes = await db.tree_nodes.find({"project_id": project_id}).to_list(None)
    node_id_mapping = {}
    
    for n in nodes:
        old_node_id = n["id"]
        new_node_id = str(uuid.uuid4())
        node_id_mapping[old_node_id] = new_node_id
        
    new_nodes = []
    for n in nodes:
        n_copy = dict(n)
        del n_copy["_id"]
        n_copy["id"] = node_id_mapping[n["id"]]
        n_copy["project_id"] = new_id
        if n_copy.get("parent_id") and n_copy["parent_id"] in node_id_mapping:
            n_copy["parent_id"] = node_id_mapping[n_copy["parent_id"]]
        new_nodes.append(n_copy)
        
    if new_nodes:
        await db.tree_nodes.insert_many(new_nodes)
        
    # Copy project record
    p_copy = dict(project)
    del p_copy["_id"]
    p_copy["id"] = new_id
    p_copy["parent_id"] = parent_id
    p_copy["name"] = new_name
    p_copy["created_at"] = time.time()
    
    await db.projects.insert_one(p_copy)
    
    # PyMongo mutates p_copy to add _id back in, so we must remove it before returning
    if "_id" in p_copy:
        del p_copy["_id"]
        
    return p_copy


@app.post("/api/projects/save")
async def save_project(req: SaveProjectRequest, db = Depends(get_db)):
    job = get_job(req.job_id)

    understanding = req.understanding
    if not understanding and job:
        understanding = job.get("understanding")
        
    test_report = req.test_report
    if not test_report and job:
        test_report = job.get("test_report")

    product_type = "Unnamed Project"
    if understanding and isinstance(understanding, dict):
        product_type = understanding.get("product_type", "Unnamed Project")

    # Pull URL/credentials from job if not in request
    github_url = req.github_url or (job.get("github_url") if job else None)
    project_url = req.project_url or (job.get("project_url") if job else None)
    site_username = req.site_username or (job.get("site_username") if job else None)
    site_password = req.site_password or (job.get("site_password") if job else None)

    existing_project = await db.projects.find_one({"id": req.job_id})
    if existing_project:
        await db.projects.update_one(
            {"id": req.job_id},
            {"$set": {
                "understanding": understanding,
                "test_report": test_report,
                "github_url": github_url,
                "project_url": project_url,
                "site_username": site_username,
                "site_password": site_password,
            }}
        )
        project_id = req.job_id
    else:
        project = Project(
            id=req.job_id,
            name=product_type,
            product_type=product_type,
            understanding=understanding,
            test_report=test_report,
            github_url=github_url,
            project_url=project_url,
            site_username=site_username,
            site_password=site_password,
        )
        p_dict = project.model_dump()
        await db.projects.insert_one(p_dict)
        project_id = project.id

    if job:
        from app.jobs import update_job
        update_job(req.job_id, understanding=understanding, test_report=test_report)

    return {"id": project_id, "message": "Project saved successfully"}


@app.get("/api/projects")
async def list_projects(
    db = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    import asyncio
    for attempt in range(3):
        try:
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
                    "parent_id": p.get("parent_id"),
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
        except Exception as e:
            if attempt < 2:
                await asyncio.sleep(0.5)
                continue
            raise HTTPException(status_code=503, detail=f"Database temporarily unavailable: {str(e)}")

@app.get("/api/projects/{project_id}/stats")
async def get_project_stats(
    project_id: str,
    db = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    uploaded_files_count = 0
    job_dir = os.path.join(UPLOADS_DIR, project_id)
    if os.path.exists(job_dir):
        uploaded_files_count = len([f for f in os.listdir(job_dir) if os.path.isfile(os.path.join(job_dir, f))])
    
    if project.get("project_url"):
        uploaded_files_count += 1
    if project.get("github_url"):
        uploaded_files_count += 1


    tree_nodes = await db.tree_nodes.find({"project_id": project_id}).to_list(length=10000)

    analysis_count = sum(1 for n in tree_nodes if n.get("node_type") in ["Feature", "Module", "TestSuite"])
    test_cases_count = sum(1 for n in tree_nodes if n.get("node_type") == "TestCase")
    
    # Support both old status mapping and standard pass/fail
    executed_count = 0
    for n in tree_nodes:
        if n.get("node_type") == "TestCase":
            status = n.get("data", {}).get("status", "")
            if status.lower() in ["pass", "fail", "blocked", "passed", "failed"]:
                executed_count += 1

    # Fallback to legacy project data if tree_nodes is empty
    if not tree_nodes:
        if project.get("understanding"):
            analysis_count = len(project.get("understanding", {}).get("features", []))
        if project.get("test_report"):
            test_cases = project.get("test_report", {}).get("test_cases", [])
            test_cases_count = len(test_cases)
            executed_count = sum(1 for tc in test_cases if tc.get("status", "").lower() in ["pass", "fail", "blocked", "passed", "failed"])

    return {
        "file_uploaded": uploaded_files_count,
        "analysis": analysis_count,
        "tc_generated": test_cases_count,
        "executed": executed_count
    }


from fastapi.responses import FileResponse

@app.get("/api/projects/{project_id}/files")
async def get_project_files(
    project_id: str,
    db = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    job_dir = os.path.join(UPLOADS_DIR, project_id)
    files = {}
    if os.path.exists(job_dir):
        for f in os.listdir(job_dir):
            if os.path.isfile(os.path.join(job_dir, f)):
                if f.startswith("brd_"): files["brd"] = {"name": f, "isExisting": True, "url": f"/api/projects/{project_id}/files/{f}"}
                elif f.startswith("fsd_"): files["fsd"] = {"name": f, "isExisting": True, "url": f"/api/projects/{project_id}/files/{f}"}
                elif f.startswith("srs_"): files["srs"] = {"name": f, "isExisting": True, "url": f"/api/projects/{project_id}/files/{f}"}
                elif f.startswith("frd_"): files["frd"] = {"name": f, "isExisting": True, "url": f"/api/projects/{project_id}/files/{f}"}
                elif f.startswith("other_type_"):
                    import base64
                    parts = f.split("_", 3)
                    doc_type = "Other"
                    real_name = f
                    if len(parts) >= 4:
                        try:
                            doc_type = base64.b64decode(parts[2]).decode('utf-8')
                            real_name = parts[3]
                        except:
                            pass
                    files["other_doc"] = {"name": real_name, "type": doc_type, "isExisting": True, "url": f"/api/projects/{project_id}/files/{f}"}
                elif f.startswith("other_"): 
                    files["other_doc"] = {"name": f.replace("other_", "", 1), "type": "Other", "isExisting": True, "url": f"/api/projects/{project_id}/files/{f}"}
                elif f.startswith("img_"): 
                    if "images" not in files: files["images"] = []
                    files["images"].append({"name": f, "isExisting": True, "url": f"/api/projects/{project_id}/files/{f}"})
    return files

@app.get("/api/projects/{project_id}/files/{filename}")
async def get_project_file(
    project_id: str,
    filename: str,
    db = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    file_path = os.path.join(UPLOADS_DIR, project_id, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
        
    return FileResponse(file_path)

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
        "github_url": project.get("github_url", ""),
        "project_url": project.get("project_url", ""),
        "site_username": project.get("site_username", ""),
        "site_password": project.get("site_password", ""),
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

from app.live_executor import (
    execute_test_case_live,
    create_execution_slot,
    get_execution_slot,
    remove_execution_slot,
    submit_human_input,
)
import asyncio as _asyncio

# ═══════════════════════════════════════════════════════
#  LIVE TEST EXECUTION (Human-in-the-Loop)
# ═══════════════════════════════════════════════════════

class ExecuteTestCaseRequest(BaseModel):
    test_case: dict
    target_url: str
    execution_id: str
    site_username: str | None = None
    site_password: str | None = None

class ResumeExecutionRequest(BaseModel):
    input_data: dict  # e.g. {"otp": "123456"} or {} (for captcha/profile where user acts in browser)


@app.post("/api/execute_test_case")
async def api_execute_test_case(
    req: ExecuteTestCaseRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
):
    """
    Start a live test execution. The test runs asynchronously in a background task.
    The frontend should poll /api/execution_status/{execution_id} to track progress.
    When status is 'waiting_for_human', show the HITL modal and POST to /api/execution_resume/{execution_id}.
    """
    # Register the execution slot BEFORE launching the background task
    create_execution_slot(req.execution_id)

    async def _run():
        try:
            updated_test_case, logs = await execute_test_case_live(
                req.test_case,
                req.target_url,
                req.execution_id,
                req.site_username,
                req.site_password
            )
            slot = get_execution_slot(req.execution_id)
            if slot:
                slot["result"] = updated_test_case
                slot["logs"] = logs
                slot["status"] = "done"
        except Exception as e:
            slot = get_execution_slot(req.execution_id)
            if slot:
                slot["status"] = "error"
                slot["error"] = str(e)

    background_tasks.add_task(_run)

    return {"success": True, "execution_id": req.execution_id, "status": "running"}


@app.get("/api/execution_status/{execution_id}")
async def api_execution_status(
    execution_id: str,
    current_user: User = Depends(get_current_user),
):
    """
    Poll this endpoint to get the current state of a live test execution.

    Returns:
        status: "running" | "waiting_for_human" | "done" | "error"
        hitl_info: (only when waiting_for_human) describes what the user needs to provide
        result: (only when done) the final test case with pass/fail status
        logs: running log of execution steps
    """
    slot = get_execution_slot(execution_id)
    if not slot:
        raise HTTPException(status_code=404, detail=f"Execution '{execution_id}' not found.")

    response = {
        "execution_id": execution_id,
        "status": slot.get("status", "running"),
        "logs": slot.get("logs", []),
    }

    if slot.get("status") == "waiting_for_human":
        response["hitl_info"] = slot.get("hitl_info")

    if slot.get("status") == "done":
        response["result"] = slot.get("result")
        # Clean up slot after client reads the result
        remove_execution_slot(execution_id)

    if slot.get("status") == "error":
        response["error"] = slot.get("error")
        remove_execution_slot(execution_id)

    return response


@app.post("/api/execution_resume/{execution_id}")
async def api_execution_resume(
    execution_id: str,
    req: ResumeExecutionRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Resume a paused execution after the human has provided the required input.
    The input_data dict maps field keys to values (e.g. {"otp": "123456"}).
    For steps where the user acts directly in the browser (e.g. CAPTCHA, profile selection),
    pass an empty dict: {}.
    """
    slot = get_execution_slot(execution_id)
    if not slot:
        raise HTTPException(status_code=404, detail=f"Execution '{execution_id}' not found.")
    if slot.get("status") != "waiting_for_human":
        raise HTTPException(status_code=400, detail="Execution is not currently waiting for human input.")

    submit_human_input(execution_id, req.input_data)
    return {"success": True, "message": "Execution resumed."}

