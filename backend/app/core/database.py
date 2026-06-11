from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

# Supabase requires SSL — append if not already in the URL
db_url = settings.DATABASE_URL
if "sslmode" not in db_url:
    db_url += "?sslmode=require"

engine = create_engine(db_url) #cable to supabase
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine) #creates db sessions
Base = declarative_base() #parent class all models inherit from


def get_db():
    """Provide a database session per request, then close it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
