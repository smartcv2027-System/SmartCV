from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from app.core.config import settings

def _build_engine():
    database_url = settings.SQLALCHEMY_DATABASE_URL

    if not settings.is_sqlite:
        try:
            test_kwargs = {
                "echo": False,
                "pool_pre_ping": True,
            }
            if settings.is_mysql:
                test_kwargs["pool_size"] = 10
                test_kwargs["max_overflow"] = 20
                test_kwargs["pool_recycle"] = 3600
                test_kwargs["connect_args"] = {"connect_timeout": 2}
            elif settings.is_postgres_or_supabase:
                test_kwargs["pool_size"] = 10
                test_kwargs["max_overflow"] = 20
                test_kwargs["connect_args"] = {"connect_timeout": 3}

            candidate_engine = create_engine(database_url, **test_kwargs)
            with candidate_engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            print(f"[DB] Connected to primary database ({'MySQL' if settings.is_mysql else 'PostgreSQL'}).")
            return candidate_engine, False
        except Exception as exc:
            fallback_url = "sqlite:///./smartcv.db"
            print(f"[DB WARNING] Primary database unreachable ({exc.__class__.__name__}). Falling back to SQLite ({fallback_url}).")
            database_url = fallback_url

    sqlite_engine = create_engine(
        database_url,
        echo=False,
        connect_args={"check_same_thread": False},
    )

    @event.listens_for(sqlite_engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    return sqlite_engine, True

engine, using_sqlite = _build_engine()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass

def ensure_schema():
    Base.metadata.create_all(bind=engine)
    try:
        from sqlalchemy import inspect, text
        inspector = inspect(engine)
        if "match_results" in inspector.get_table_names():
            columns = [c["name"] for c in inspector.get_columns("match_results")]
            if "application_id" not in columns:
                with engine.begin() as conn:
                    conn.execute(text("ALTER TABLE match_results ADD COLUMN application_id INT NULL"))
                    print("[INFO] Added application_id column to match_results table.")
    except Exception as e:
        print(f"[WARNING] ensure_schema migration check error: {e}")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
