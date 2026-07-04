"""
seed_admin.py — Create the first admin account (run once).

Usage:
    python seed_admin.py --login-id admin001 --password YourSecurePassword

The script is safe to re-run: it skips creation if the login_id already exists.
"""
import argparse
import os
import sys
import asyncio

# Make sure we can import from app/
sys.path.insert(0, os.path.dirname(__file__))

async def async_main():
    parser = argparse.ArgumentParser(description="Seed the first admin account")
    parser.add_argument("--login-id", required=True, help="Employee / Login ID for the admin")
    parser.add_argument("--password", required=True, help="Plain-text password (will be hashed)")
    args = parser.parse_args()

    # Import after sys.path is set
    from app.models import User
    from app.auth import hash_password
    from app.database import database

    existing = await database.users.find_one({"login_id": args.login_id})
    if existing:
        print(f"[seed] WARNING: User '{args.login_id}' already exists (role={existing.get('role', 'user')}). Skipping.")
        return

    admin = User(
        login_id=args.login_id,
        password_hash=hash_password(args.password),
        role="admin",
        is_active=True,
    )
    admin_dict = admin.model_dump()
    await database.users.insert_one(admin_dict)
    
    print(f"[seed] DONE. Admin account created:")
    print(f"        Login ID : {args.login_id}")
    print(f"        Role     : admin")
    print(f"        User ID  : {admin.id}")


def main():
    asyncio.run(async_main())

if __name__ == "__main__":
    main()
