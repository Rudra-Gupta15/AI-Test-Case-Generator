import os
import shutil
from fastapi import FastAPI, BackgroundTasks, HTTPException, UploadFile, File, Form, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import JOBS_DIR, UPLOADS_DIR, FIGMA_TOKEN
from app.jobs import create_job, get_job, update_job
from app.pipeline import run_analysis, run_test_generation
from app import doc_parser
from app.database import engine, Base, get_db
from app.models import Project

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


@app.get("/api/health")
async def health():
    return {"status": "ok"}


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
        run_analysis, job_id, brd_path, fsd_path, image_paths, figma_url, token, deep
    )
    return {"job_id": job_id}


@app.get("/api/job/{job_id}")
async def job_status(job_id: str):
    job = get_job(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    return job


class GenerateRequest(BaseModel):
    job_id: str
    user_prompt: str = ""
    deep: bool = False


@app.post("/api/generate-tests")
async def generate_tests(req: GenerateRequest, background_tasks: BackgroundTasks):
    job = get_job(req.job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    if not job.get("understanding"):
        raise HTTPException(400, "Run /api/analyze first — no understanding summary found for this job.")

    background_tasks.add_task(
        run_test_generation, req.job_id, job["understanding"], req.user_prompt, req.deep
    )
    return {"job_id": req.job_id}


class SaveProjectRequest(BaseModel):
    job_id: str

@app.post("/api/projects")
async def save_project(req: SaveProjectRequest, db: Session = Depends(get_db)):
    job = get_job(req.job_id)
    if not job or not job.get("test_report"):
        raise HTTPException(400, "Job not found or not completed")
    
    product_type = job.get("understanding", {}).get("product_type", "Unnamed Project")
    
    project = Project(
        name=product_type,
        product_type=product_type,
        understanding=job.get("understanding"),
        test_report=job.get("test_report")
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return {"id": project.id, "message": "Project saved successfully"}

@app.get("/api/projects")
async def list_projects(db: Session = Depends(get_db)):
    projects = db.query(Project).order_by(Project.created_at.desc()).all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "product_type": p.product_type,
            "created_at": p.created_at,
            "notepad": p.notepad,
            "total_cases": len(p.test_report.get("test_cases", [])) if p.test_report else 0
        }
        for p in projects
    ]

@app.get("/api/projects/{project_id}")
async def get_project(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(404, "Project not found")
    
    return {
        "id": project.id,
        "status": "done",
        "stage": "done",
        "notepad": project.notepad,
        "understanding": project.understanding,
        "test_report": project.test_report
    }

class UpdateProjectRequest(BaseModel):
    name: str
    notepad: str

@app.put("/api/projects/{project_id}")
async def update_project(project_id: str, req: UpdateProjectRequest, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(404, "Project not found")
    project.name = req.name
    project.notepad = req.notepad
    db.commit()
    return {"message": "Project updated successfully"}

@app.delete("/api/projects/{project_id}")
async def delete_project(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(404, "Project not found")
    db.delete(project)
    db.commit()
    return {"message": "Project deleted successfully"}
