import time
import uuid
from sqlalchemy import Column, String, Float, JSON, Boolean, Integer, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    login_id = Column(String, unique=True, index=True, nullable=False)  # employee/login ID
    password_hash = Column(String, nullable=False)
    role = Column(String, default="user")  # "admin" or "user"
    is_active = Column(Boolean, default=True)
    created_at = Column(Float, default=time.time)

    projects = relationship("Project", back_populates="owner", lazy="select")


class Project(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, index=True)
    product_type = Column(String)            # legacy field kept as-is
    description = Column(Text, default="")
    domain = Column(String, default="")
    testing_type = Column(String, default="")    # e.g. Functional, Regression
    methodology = Column(String, default="")     # e.g. Agile, Waterfall
    created_at = Column(Float, default=time.time)
    notepad = Column(String, default="")
    understanding = Column(JSON, nullable=True)  # legacy: project-level understanding
    test_report = Column(JSON, nullable=True)    # legacy: project-level test report
    owner_id = Column(String, ForeignKey("users.id"), nullable=True)  # nullable = legacy projects

    owner = relationship("User", back_populates="projects")
    tree_nodes = relationship(
        "TreeNode",
        back_populates="project",
        cascade="all, delete-orphan",
        lazy="select",
    )


class TreeNode(Base):
    """
    Adjacency-list tree node.
    The frontend receives all nodes as a flat list and builds the tree in JS —
    so we don't need SQLAlchemy to traverse the hierarchy server-side.
    The self-referential FK is kept as a plain Column with no ORM relationship
    to avoid SQLAlchemy ambiguity errors.
    """
    __tablename__ = "tree_nodes"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String, ForeignKey("projects.id"), nullable=False, index=True)
    parent_id = Column(String, nullable=True)  # NOT a FK in ORM — managed by app logic
    node_type = Column(String, default="Module")
    # Allowed: Module | Feature | Requirement | TestSuite | Release | Custom | TestCase | Scenario | Defect
    name = Column(String, nullable=False)
    order = Column(Integer, default=0)
    data = Column(JSON, nullable=True)       # AI output scoped to this node
    created_at = Column(Float, default=time.time)

    project = relationship("Project", back_populates="tree_nodes")
