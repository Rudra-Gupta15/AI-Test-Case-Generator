import time
import uuid
from sqlalchemy import Column, String, Float, JSON
from app.database import Base

class Project(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, index=True)
    product_type = Column(String)
    created_at = Column(Float, default=time.time)
    notepad = Column(String, default="")
    understanding = Column(JSON, nullable=True)
    test_report = Column(JSON, nullable=True)
