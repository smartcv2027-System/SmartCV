import os
from dotenv import load_dotenv
load_dotenv()

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from typing import List, Optional, Union

class Settings(BaseSettings):
    PROJECT_NAME: str = "SmartCV"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "smartcv-super-secret-jwt-key-2026-kku")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Database Configuration (supports SQLite, MySQL, and Supabase / PostgreSQL)
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "sqlite:///./smartcv.db"
    )

    # Optional Supabase API credentials (for storage / edge integrations)
    SUPABASE_URL: Optional[str] = os.getenv("SUPABASE_URL", None)
    SUPABASE_KEY: Optional[str] = os.getenv("SUPABASE_KEY", None)

    # Optional discrete database credentials (if not using full DATABASE_URL)
    DB_HOST: Optional[str] = os.getenv("DB_HOST", None)
    DB_PORT: Optional[int] = int(os.getenv("DB_PORT", "0")) if os.getenv("DB_PORT") else None
    DB_USER: Optional[str] = os.getenv("DB_USER", None)
    DB_PASSWORD: Optional[str] = os.getenv("DB_PASSWORD", None)
    DB_NAME: Optional[str] = os.getenv("DB_NAME", None)

    @property
    def SQLALCHEMY_DATABASE_URL(self) -> str:
        """
        Returns normalized SQLAlchemy-compliant connection string:
        - Converts postgres:// -> postgresql:// (required by Supabase & SQLAlchemy 2.0)
        - Converts mysql:// -> mysql+pymysql:// (ensures PyMySQL driver)
        - Auto-assembles discrete DB_* credentials if provided
        """
        url = self.DATABASE_URL.strip()
        
        # Assemble from discrete parameters if DATABASE_URL is default sqlite but DB_HOST is set
        if url.startswith("sqlite") and self.DB_HOST:
            if self.DB_PORT in [3306] or (self.DB_NAME and "mysql" in self.DB_NAME.lower()):
                return f"mysql+pymysql://{self.DB_USER or 'root'}:{self.DB_PASSWORD or ''}@{self.DB_HOST}:{self.DB_PORT or 3306}/{self.DB_NAME or 'smartcv'}?charset=utf8mb4"
            else:
                return f"postgresql://{self.DB_USER or 'postgres'}:{self.DB_PASSWORD or ''}@{self.DB_HOST}:{self.DB_PORT or 5432}/{self.DB_NAME or 'postgres'}"

        # Standard Supabase URLs often start with postgres://
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
            
        # Standard MySQL URLs often lack the +pymysql driver specification
        if url.startswith("mysql://") and not url.startswith("mysql+"):
            url = url.replace("mysql://", "mysql+pymysql://", 1)

        return url

    @property
    def is_sqlite(self) -> bool:
        return self.SQLALCHEMY_DATABASE_URL.startswith("sqlite")

    @property
    def is_mysql(self) -> bool:
        return "mysql" in self.SQLALCHEMY_DATABASE_URL

    @property
    def is_postgres_or_supabase(self) -> bool:
        return "postgres" in self.SQLALCHEMY_DATABASE_URL
    
    # Upload storage
    UPLOAD_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "uploads")
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            v_str = v.strip()
            if not v_str or v_str == "*":
                return ["*"]
            if v_str.startswith("[") and v_str.endswith("]"):
                import json
                try:
                    return json.loads(v_str)
                except Exception:
                    pass
            return [origin.strip() for origin in v_str.split(",") if origin.strip()]
        elif isinstance(v, list):
            return v
        return ["*"]
    
    # Model Weights for Hybrid Scorer
    WEIGHT_SBERT: float = 0.50
    WEIGHT_TFIDF: float = 0.20
    WEIGHT_SKILLS: float = 0.30

    model_config = SettingsConfigDict(case_sensitive=True, extra="allow")

settings = Settings()
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
