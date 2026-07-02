import sqlite3
import sys
import os

try:
    # Use absolute path to be sure
    db_path = os.path.join(os.path.dirname(__file__), 'projects.db')
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    c.execute('ALTER TABLE projects ADD COLUMN notepad TEXT DEFAULT ""')
    conn.commit()
    print('Database migration successful.')
except sqlite3.OperationalError as e:
    print(f'Migration issue (maybe already applied?): {e}')
finally:
    conn.close()
