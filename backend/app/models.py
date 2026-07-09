import time
import uuid
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field

def generate_id():
    return str(uuid.uuid4())

class User(BaseModel):
    id: str = Field(default_factory=generate_id)
    login_id: str
    password_hash: str
    role: str = "user"
    is_active: bool = True
    created_at: float = Field(default_factory=time.time)

class Project(BaseModel):
    id: str = Field(default_factory=generate_id)
    name: str
    product_type: str = ""
    description: str = ""
    domain: str = ""
    testing_type: str = ""
    methodology: str = ""
    created_at: float = Field(default_factory=time.time)
    notepad: str = ""
    understanding: Optional[Dict[str, Any]] = None
    test_report: Optional[Dict[str, Any]] = None
    owner_id: Optional[str] = None
    github_url: Optional[str] = None
    project_url: Optional[str] = None
    site_username: Optional[str] = None
    site_password: Optional[str] = None

class TreeNode(BaseModel):
    id: str = Field(default_factory=generate_id)
    project_id: str
    parent_id: Optional[str] = None
    node_type: str = "Module"
    name: str
    order: int = 0
    data: Optional[Dict[str, Any]] = None
    created_at: float = Field(default_factory=time.time)
