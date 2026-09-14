from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from app.core.config import settings

database_url = settings.SQLALCHEMY_DATABASE_URL

connect_args = {}
engine_kwargs = {
    "echo": False,
}

if settings.is_sqlite:
    connect_args["check_same_thread"] = False
    engine_kwargs["connect_args"] = connect_args
elif settings.is_mysql:
    # MySQL production pooling (recycles connections before MySQL 8-hour timeout)
    engine_kwargs["pool_size"] = 10
    engine_kwargs["max_overflow"] = 20
    engine_kwargs["pool_recycle"] = 3600
    engine_kwargs["pool_pre_ping"] = True
elif settings.is_postgres_or_supabase:
    # Supabase / PostgreSQL connection pooling (handles PgBouncer & direct connections)
    engine_kwargs["pool_size"] = 10
    engine_kwargs["max_overflow"] = 20
    engine_kwargs["pool_pre_ping"] = True

engine = create_engine(database_url, **engine_kwargs)

if settings.is_sqlite:
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
