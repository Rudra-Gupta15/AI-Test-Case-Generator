"""
migrate_db_v2.py — Safe migration: adds new tables and new columns to existing DB.
Run once:  python migrate_db_v2.py

Safe to re-run: uses IF NOT EXISTS / column existence checks.
Existing projects.db data is fully preserved.
"""
import sqlite3
import os
import sys

DB_PATH = os.path.join(os.path.dirname(__file__), "projects.db")


def column_exists(cursor, table: str, column: str) -> bool:
    cursor.execute(f"PRAGMA table_info({table})")
    cols = [row[1] for row in cursor.fetchall()]
    return column in cols


def table_exists(cursor, table: str) -> bool:
    cursor.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table,)
    )
    return cursor.fetchone() is not None


def run():
    if not os.path.exists(DB_PATH):
        print(f"[migrate] DB not found at {DB_PATH} — will be created fresh on first app start.")
        sys.exit(0)

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # ── 1. Create users table ──────────────────────────────────────────────────
    if not table_exists(cur, "users"):
        print("[migrate] Creating 'users' table...")
        cur.execute("""
            CREATE TABLE users (
                id          TEXT PRIMARY KEY,
                login_id    TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role        TEXT DEFAULT 'user',
                is_active   INTEGER DEFAULT 1,
                created_at  REAL
            )
        """)
        print("[migrate] [OK] users table created")
    else:
        print("[migrate] [OK] users table already exists")

    # ── 2. Add new columns to projects ────────────────────────────────────────
    project_new_cols = {
        "description": "TEXT DEFAULT ''",
        "domain": "TEXT DEFAULT ''",
        "testing_type": "TEXT DEFAULT ''",
        "methodology": "TEXT DEFAULT ''",
        "owner_id": "TEXT REFERENCES users(id)",
    }
    for col, col_def in project_new_cols.items():
        if not column_exists(cur, "projects", col):
            print(f"[migrate] Adding column projects.{col}...")
            cur.execute(f"ALTER TABLE projects ADD COLUMN {col} {col_def}")
            print(f"[migrate] [OK] projects.{col} added")
        else:
            print(f"[migrate] [OK] projects.{col} already exists")

    # ── 3. Create tree_nodes table ────────────────────────────────────────────
    if not table_exists(cur, "tree_nodes"):
        print("[migrate] Creating 'tree_nodes' table...")
        cur.execute("""
            CREATE TABLE tree_nodes (
                id          TEXT PRIMARY KEY,
                project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                parent_id   TEXT REFERENCES tree_nodes(id) ON DELETE CASCADE,
                node_type   TEXT DEFAULT 'Module',
                name        TEXT NOT NULL,
                "order"     INTEGER DEFAULT 0,
                data        TEXT,
                created_at  REAL
            )
        """)
        cur.execute("CREATE INDEX IF NOT EXISTS ix_tree_nodes_project_id ON tree_nodes(project_id)")
        print("[migrate] [OK] tree_nodes table created")
    else:
        print("[migrate] [OK] tree_nodes table already exists")

    conn.commit()
    conn.close()
    print("\n[migrate] DONE. Migration complete. Existing data preserved.")


if __name__ == "__main__":
    run()
