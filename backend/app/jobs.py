import uuid
import time

JOBS = {}


def create_job():
    job_id = str(uuid.uuid4())
    JOBS[job_id] = {
        "id": job_id,
        "status": "queued",
        "stage": "queued",
        "created_at": time.time(),
        "understanding": None,
        "test_report": None,
        "error": None,
    }
    return job_id


def update_job(job_id, **kwargs):
    if job_id in JOBS:
        JOBS[job_id].update(kwargs)


def get_job(job_id):
    return JOBS.get(job_id)
