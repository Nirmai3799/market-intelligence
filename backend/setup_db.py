"""Run this once to create all database tables in Supabase."""
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

from app.core.database import Base, engine
from app.models import user, portfolio, alert, watchlist  # registers all models

print("Connecting to database...")
print("Creating tables...")

Base.metadata.create_all(bind=engine)

print("  users table     - OK")
print("  holdings table  - OK")
print("  alerts table    - OK")
print("  watchlist table - OK")
print("")
print("Database is ready.")
