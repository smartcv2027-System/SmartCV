"""
SmartCV — MySQL / XAMPP Database Migration & Seeding Script
King Khalid University — College of Computer Science

This script:
1. Connects to MySQL (XAMPP default: root without password on localhost:3306)
2. Creates the 'smartcv' database if it doesn't already exist (utf8mb4)
3. Generates all 14 physical tables using SQLAlchemy 2.0 ORM
4. Seeds all 14 tables with authentic sample data (candidates, jobs, skills, matches, feedback, audit logs)
5. Verifies and prints a summary of all 14 tables with their row counts for phpMyAdmin capture
"""

import sys
import os
import pymysql

# Add backend directory to sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from dotenv import load_dotenv
load_dotenv(os.path.join(backend_dir, ".env"))

def get_mysql_connection_params():
    """Extract MySQL connection parameters, with sensible XAMPP defaults."""
    env_db_url = os.getenv("DATABASE_URL", "")
    
    host = os.getenv("DB_HOST", "localhost")
    port = int(os.getenv("DB_PORT", "3306"))
    user = os.getenv("DB_USER", "root")
    password = os.getenv("DB_PASSWORD", "")
    db_name = os.getenv("DB_NAME", "smartcv")
    
    if "mysql" in env_db_url:
        import urllib.parse
        parsed = urllib.parse.urlparse(env_db_url.replace("mysql+pymysql://", "http://").replace("mysql://", "http://"))
        host = parsed.hostname or host
        port = parsed.port or port
        user = parsed.username or user
        password = parsed.password or password
        if parsed.path and len(parsed.path) > 1:
            db_name = parsed.path.lstrip("/")
            if "?" in db_name:
                db_name = db_name.split("?")[0]
                
    return host, port, user, password, db_name

def test_and_connect(host, port, user, password):
    """Attempt connecting to MySQL server directly, trying blank password fallback if needed."""
    try:
        conn = pymysql.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            charset="utf8mb4",
            connect_timeout=5
        )
        return conn, password
    except pymysql.MySQLError as e:
        # If password was provided and failed, try blank password (common for default XAMPP)
        if password:
            try:
                conn = pymysql.connect(
                    host=host,
                    port=port,
                    user=user,
                    password="",
                    charset="utf8mb4",
                    connect_timeout=5
                )
                print("[INFO] Connected to XAMPP MySQL using blank password.")
                return conn, ""
            except pymysql.MySQLError:
                pass
        raise e

def run_migration():
    host, port, user, password, db_name = get_mysql_connection_params()
    print("=" * 70)
    print(" SmartCV: MySQL (XAMPP) Migration & Table Generator")
    print("=" * 70)
    print(f"Target Host: {host}:{port}")
    print(f"Target User: {user}")
    print(f"Target Database: {db_name}")
    print("-" * 70)
    
    # Step 1: Connect to MySQL server and ensure Database exists
    print("[1/5] Connecting to MySQL server...")
    try:
        conn, effective_password = test_and_connect(host, port, user, password)
        print(f" Successfully connected to MySQL at {host}:{port}")
    except Exception as e:
        print(f"\n[ERROR] Could not connect to MySQL server at {host}:{port}!")
        print(f"Details: {e}")
        print("\nPlease ensure:")
        print("  1. XAMPP Control Panel is open.")
        print("  2. The 'MySQL' service is started (green indicator in XAMPP).")
        print("  3. MySQL is listening on port 3306.")
        sys.exit(1)
        
    try:
        with conn.cursor() as cursor:
            print(f"[2/5] Creating database '{db_name}' if not exists (utf8mb4)...")
            cursor.execute(
                f"CREATE DATABASE IF NOT EXISTS `{db_name}` "
                f"CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
            )
            conn.commit()
            print(f" Database '{db_name}' is ready.")
    finally:
        conn.close()

    # Step 2: Construct and update the SQLAlchemy database URL
    encoded_pw = urllib_quote(effective_password) if effective_password else ""
    mysql_db_url = f"mysql+pymysql://{user}:{encoded_pw}@{host}:{port}/{db_name}?charset=utf8mb4"
    os.environ["DATABASE_URL"] = mysql_db_url

    # Step 3: Initialize SQLAlchemy with MySQL
    print("[3/5] Applying SQLAlchemy metadata to generate all 14 tables in MySQL...")
    from sqlalchemy import create_engine, inspect, text
    from app.db.database import Base
    import app.models.models  # register all models

    engine = create_engine(
        mysql_db_url,
        pool_size=10,
        max_overflow=20,
        pool_recycle=3600,
        pool_pre_ping=True,
        echo=False
    )

    Base.metadata.create_all(bind=engine)
    inspector = inspect(engine)
    created_tables = inspector.get_table_names()
    print(f" Created {len(created_tables)} physical tables in '{db_name}'.")

    # Step 4: Seed initial data for all tables
    print("[4/5] Seeding database with authentic academic profiles, jobs, and AI matches...")
    # Monkey-patch the database engine in app.db.database for the seed run
    import app.db.database as db_module
    from sqlalchemy.orm import sessionmaker
    db_module.engine = engine
    db_module.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    from app.seed import seed_database
    seed_database(force_reseed=True)
    print(" Seeding completed successfully.")

    # Step 5: Update .env file to persist MySQL connection for future runs
    env_file = os.path.join(backend_dir, ".env")
    update_env_database_url(env_file, mysql_db_url)
    print(f" Updated {env_file} with active MySQL DATABASE_URL.")

    # Step 6: Print Table Verification Summary for Chapter 6 Screenshots
    print("\n" + "=" * 70)
    print(" 14 PHYSICAL TABLES VERIFIED IN MYSQL (phpMyAdmin)")
    print("=" * 70)
    expected_tables = [
        ("Figure 6.1.1", "users"),
        ("Figure 6.1.2", "candidate_profiles"),
        ("Figure 6.1.3", "uploaded_files"),
        ("Figure 6.1.4", "resumes"),
        ("Figure 6.1.5", "jobs"),
        ("Figure 6.1.6", "skills"),
        ("Figure 6.1.7", "candidate_skills"),
        ("Figure 6.1.8", "job_skills"),
        ("Figure 6.1.9", "match_results"),
        ("Figure 6.1.10", "matched_skills"),
        ("Figure 6.1.11", "missing_skills"),
        ("Figure 6.1.12", "explanation_summaries"),
        ("Figure 6.1.13", "applicant_feedback"),
        ("Figure 6.1.14", "audit_logs"),
    ]

    with engine.connect() as conn:
        for fig_no, tbl_name in expected_tables:
            if tbl_name in created_tables:
                res = conn.execute(text(f"SELECT COUNT(*) FROM `{tbl_name}`"))
                row_count = res.scalar()
                col_count = len(inspector.get_columns(tbl_name))
                print(f"  {fig_no} | Table: {tbl_name:<22} | Columns: {col_count:2d} | Rows: {row_count:3d}  [READY]")
            else:
                print(f"  {fig_no} | Table: {tbl_name:<22} | MISSING!")

    print("=" * 70)
    print("\n Migration & Seeding Complete!")
    print("You can now open phpMyAdmin at http://localhost/phpmyadmin")
    print(f"Navigate to database '{db_name}' to take screenshots for Chapter 6.\n")

def urllib_quote(s):
    import urllib.parse
    return urllib.parse.quote_plus(s)

def update_env_database_url(env_path, new_url):
    """Updates or uncomments the DATABASE_URL in .env to use MySQL."""
    if not os.path.exists(env_path):
        return
    
    with open(env_path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    new_lines = []
    database_url_updated = False
    
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("DATABASE_URL=") and not database_url_updated:
            new_lines.append(f'DATABASE_URL="{new_url}"\n')
            database_url_updated = True
        elif stripped.startswith("# DATABASE_URL=") and "mysql" in stripped and not database_url_updated:
            new_lines.append(f'DATABASE_URL="{new_url}"\n')
            database_url_updated = True
        else:
            new_lines.append(line)

    if not database_url_updated:
        new_lines.insert(0, f'DATABASE_URL="{new_url}"\n')

    with open(env_path, "w", encoding="utf-8") as f:
        f.writelines(new_lines)

if __name__ == "__main__":
    run_migration()
