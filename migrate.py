"""Run the workflow run SQL migration against the configured DATABASE_URL."""
import os
import subprocess
import sys

try:
    import psycopg2
except ImportError:
    print("psycopg2 not installed. Installing psycopg2-binary...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "--user", "psycopg2-binary", "-q"])
    import psycopg2


def read_database_url() -> str:
    db_url = os.environ.get("DATABASE_URL", "")
    if db_url:
        return db_url

    env_path = os.path.join(os.path.dirname(__file__), ".env")
    if not os.path.exists(env_path):
        return ""

    with open(env_path, "r", encoding="utf-8") as env_file:
        for line in env_file:
            line = line.strip()
            if line.startswith("DATABASE_URL"):
                return line.split("=", 1)[1].strip().strip("'\"")
    return ""


db_url = read_database_url()
if not db_url:
    print("ERROR: DATABASE_URL not found")
    sys.exit(1)

sql_path = os.path.join(os.path.dirname(__file__), "scripts", "migrate-workflow-runs.sql")
with open(sql_path, "r", encoding="utf-8") as f:
    migration_sql = f.read()

conn = psycopg2.connect(db_url)
conn.autocommit = True

try:
    with conn.cursor() as cur:
        cur.execute(migration_sql)
    print("workflow run tables migration complete.")
except Exception as e:
    print(f"Migration error: {e}")
    sys.exit(1)
finally:
    conn.close()
