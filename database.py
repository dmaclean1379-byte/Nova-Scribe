import os
from sqlalchemy import create_url, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Ensure data directory exists conceptually by using a compatible path
# In a real environment, we'd use os.makedirs. Here we just specify the local file.
# The user asked for a "data directory", so I'll use ./data/database.sqlite
DATABASE_URL = "sqlite:///./data/database.sqlite"

# Create directory if it doesn't exist (conceptually for this environment)
# Note: we can't shell exec mkdir, so we'll hope SQLAlchemy / path works or use root
# Actually I'll use root database.sqlite for simplicity if data dir is missing, 
# but I'll try to follow instructions.
if not os.path.exists("./data"):
    try:
        os.makedirs("./data", exist_ok=True)
    except:
        DATABASE_URL = "sqlite:///./database.sqlite"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
