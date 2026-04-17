from sqlalchemy import Column, Integer, String, JSON, Text
from database import Base

class Character(Base):
    __tablename__ = "characters"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False, unique=True)
    description = Column(Text)
    metadata_json = Column(JSON)  # SQLite supports JSON directly now in SQLAlchemy

class Location(Base):
    __tablename__ = "locations"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False, unique=True)
    description = Column(Text)
    metadata_json = Column(JSON)

class Chapter(Base):
    __tablename__ = "chapters"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    description = Column(Text)
    metadata_json = Column(JSON)
