from fastapi import FastAPI, Depends, HTTPException, Body, Query
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import get_db, engine, Base
import models
from services import AIService
import uvicorn

# Create Database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Nova-Scribe API")

# Sidecar Logic: Handles CORS for the Electron frontend (usually localhost:3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. AI Generation Endpoint
@app.post("/v1/ai/generate")
async def generate_ai(
    provider: str = Body(...),
    model: str = Body(...),
    prompt: str = Body(...),
    db: Session = Depends(get_db)
):
    """Streams an AI response and injects lore automatically."""
    return StreamingResponse(
        AIService.generate_stream(provider, model, prompt, db),
        media_type="text/event-stream"
    )

# 2. Lore Scanning Engine
@app.get("/v1/lore/scan")
async def scan_lore(text: str = Query(...), db: Session = Depends(get_db)):
    """Scans specific entities according to the lore-lookup engine requirements."""
    detected = AIService.scan_lore(text, db)
    return {"detected": detected}

# 3. Standard CRUD: Characters
@app.get("/v1/characters")
async def get_all_characters(db: Session = Depends(get_db)):
    return db.query(models.Character).all()

@app.get("/v1/characters/{char_id}")
async def get_character(char_id: int, db: Session = Depends(get_db)):
    char = db.query(models.Character).filter(models.Character.id == char_id).first()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found")
    return char

@app.post("/v1/characters")
async def create_character(
    name: str = Body(...),
    description: str = Body(None),
    metadata: dict = Body(None),
    db: Session = Depends(get_db)
):
    char = models.Character(name=name, description=description, metadata_json=metadata)
    try:
        db.add(char)
        db.commit()
        db.refresh(char)
        return char
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@app.put("/v1/characters/{char_id}")
async def update_character(
    char_id: int,
    name: str = Body(None),
    description: str = Body(None),
    metadata: dict = Body(None),
    db: Session = Depends(get_db)
):
    char = db.query(models.Character).filter(models.Character.id == char_id).first()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found")
    if name is not None: char.name = name
    if description is not None: char.description = description
    if metadata is not None: char.metadata_json = metadata
    db.commit()
    db.refresh(char)
    return char

@app.delete("/v1/characters/{char_id}")
async def delete_character(char_id: int, db: Session = Depends(get_db)):
    char = db.query(models.Character).filter(models.Character.id == char_id).first()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found")
    db.delete(char)
    db.commit()
    return {"message": "Character deleted"}

# 4. Standard CRUD: Locations
@app.get("/v1/locations")
async def get_all_locations(db: Session = Depends(get_db)):
    return db.query(models.Location).all()

@app.get("/v1/locations/{loc_id}")
async def get_location(loc_id: int, db: Session = Depends(get_db)):
    loc = db.query(models.Location).filter(models.Location.id == loc_id).first()
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    return loc

@app.post("/v1/locations")
async def create_location(
    name: str = Body(...),
    description: str = Body(None),
    metadata: dict = Body(None),
    db: Session = Depends(get_db)
):
    loc = models.Location(name=name, description=description, metadata_json=metadata)
    try:
        db.add(loc)
        db.commit()
        db.refresh(loc)
        return loc
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@app.put("/v1/locations/{loc_id}")
async def update_location(
    loc_id: int,
    name: str = Body(None),
    description: str = Body(None),
    metadata: dict = Body(None),
    db: Session = Depends(get_db)
):
    loc = db.query(models.Location).filter(models.Location.id == loc_id).first()
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    if name is not None: loc.name = name
    if description is not None: loc.description = description
    if metadata is not None: loc.metadata_json = metadata
    db.commit()
    db.refresh(loc)
    return loc

@app.delete("/v1/locations/{loc_id}")
async def delete_location(loc_id: int, db: Session = Depends(get_db)):
    loc = db.query(models.Location).filter(models.Location.id == loc_id).first()
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    db.delete(loc)
    db.commit()
    return {"message": "Location deleted"}

# 5. Standard CRUD: Chapters
@app.get("/v1/chapters")
async def get_all_chapters(db: Session = Depends(get_db)):
    return db.query(models.Chapter).all()

@app.get("/v1/chapters/{chapter_id}")
async def get_chapter(chapter_id: int, db: Session = Depends(get_db)):
    chapter = db.query(models.Chapter).filter(models.Chapter.id == chapter_id).first()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    return chapter

@app.post("/v1/chapters")
async def create_chapter(
    name: str = Body(...),
    description: str = Body(None),
    metadata: dict = Body(None),
    db: Session = Depends(get_db)
):
    chapter = models.Chapter(name=name, description=description, metadata_json=metadata)
    try:
        db.add(chapter)
        db.commit()
        db.refresh(chapter)
        return chapter
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@app.put("/v1/chapters/{chapter_id}")
async def update_chapter(
    chapter_id: int,
    name: str = Body(None),
    description: str = Body(None),
    metadata: dict = Body(None),
    db: Session = Depends(get_db)
):
    chapter = db.query(models.Chapter).filter(models.Chapter.id == chapter_id).first()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    if name is not None: chapter.name = name
    if description is not None: chapter.description = description
    if metadata is not None: chapter.metadata_json = metadata
    db.commit()
    db.refresh(chapter)
    return chapter

@app.delete("/v1/chapters/{chapter_id}")
async def delete_chapter(chapter_id: int, db: Session = Depends(get_db)):
    chapter = db.query(models.Chapter).filter(models.Chapter.id == chapter_id).first()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    db.delete(chapter)
    db.commit()
    return {"message": "Chapter deleted"}

# Sidecar Logic: Ensure the server stays alive
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
