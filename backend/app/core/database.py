from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

if not settings.DATABASE_URL:
    raise RuntimeError(
        "\n\n  DATABASE_URL is not set.\n"
        "  Copy .env.example → .env and fill in your Supabase connection string.\n"
    )

db_url = settings.DATABASE_URL

# SQLAlchemy 2.x requires "postgresql://" — Supabase sometimes gives "postgres://"
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

# Supabase requires SSL
if "sslmode" not in db_url:
    db_url += "?sslmode=require"

engine = create_engine(db_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine) #creates db sessions
Base = declarative_base() #parent class all models inherit from


def get_db():
    """Provide a database session per request, then close it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
