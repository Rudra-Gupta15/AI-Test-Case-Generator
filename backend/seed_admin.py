"""
seed_admin.py — Create the first admin account (run once).

Usage:
    python seed_admin.py --login-id admin001 --password YourSecurePassword

The script is safe to re-run: it skips creation if the login_id already exists.
"""
import argparse
import os
import sys
import uuid
import time

# Make sure we can import from app/
sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

DB_PATH = os.path.join(os.path.dirname(__file__), "projects.db")
DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)


def main():
    parser = argparse.ArgumentParser(description="Seed the first admin account")
    parser.add_argument("--login-id", required=True, help="Employee / Login ID for the admin")
    parser.add_argument("--password", required=True, help="Plain-text password (will be hashed)")
    args = parser.parse_args()

    # Import after sys.path is set
    from app.models import Base, User
    from app.auth import hash_password

    # Create tables if they don't exist yet (first-run safety)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.login_id == args.login_id).first()
        if existing:
            print(f"[seed] WARNING: User '{args.login_id}' already exists (role={existing.role}). Skipping.")
            return

        admin = User(
            id=str(uuid.uuid4()),
            login_id=args.login_id,
            password_hash=hash_password(args.password),
            role="admin",
            is_active=True,
            created_at=time.time(),
        )
        db.add(admin)
        db.commit()
        print(f"[seed] DONE. Admin account created:")
        print(f"        Login ID : {args.login_id}")
        print(f"        Role     : admin")
        print(f"        User ID  : {admin.id}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
