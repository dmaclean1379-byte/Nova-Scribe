import os
import json
from typing import List, Optional
from openai import OpenAI
from sqlalchemy.orm import Session
from models import Character, Location
from dotenv import load_dotenv

load_dotenv()

# Universal AI Base URLs
PROVIDERS = {
    "openrouter": {
        "base_url": "https://openrouter.ai/api/v1",
        "api_key_env": "OPENROUTER_API_KEY"
    },
    "nvidia": {
        "base_url": "https://integrate.api.nvidia.com/v1",
        "api_key_env": "NVIDIA_API_KEY"
    },
    "ollama": {
        "base_url": os.getenv("LOCAL_AI_BASE_URL", "http://localhost:11434/v1"),
        "api_key": "ollama"  # placeholder for local
    }
}

class AIService:
    @staticmethod
    def scan_lore(text: str, db: Session) -> List[str]:
        """Scans characters and locations tables for names appearing in the text."""
        lore_found = []
        text_lower = text.lower()
        
        # Pull everything from DB (in production, we'd use more sophisticated search or caching)
        characters = db.query(Character).all()
        locations = db.query(Location).all()
        
        for char in characters:
            if char.name.lower() in text_lower:
                lore_found.append(f"Character: {char.name} - {char.description}")
        
        for loc in locations:
            if loc.name.lower() in text_lower:
                lore_found.append(f"Location: {loc.name} - {loc.description}")
                
        return lore_found

    @staticmethod
    async def generate_stream(provider: str, model: str, prompt: str, db: Session):
        """Unified stream generator for multiple AI providers with lore injection."""
        
        # 1. Pull Lore Context
        lore_entries = AIService.scan_lore(prompt, db)
        lore_context = "\n".join(lore_entries) if lore_entries else "None detected."
        
        # 2. Configure Client
        if provider not in PROVIDERS:
            yield f"data: {json.dumps({'error': f'Unsupported provider: {provider}'})}\n\n"
            return
            
        config = PROVIDERS[provider]
        api_key = config.get("api_key") or os.getenv(config.get("api_key_env", ""))
        
        if not api_key and provider != "ollama":
            yield f"data: {json.dumps({'error': f'Missing API key for {provider}'})}\n\n"
            return
            
        client = OpenAI(
            base_url=config["base_url"],
            api_key=api_key or "local"
        )
        
        # 3. Prompt Engineering
        system_prompt = (
            f"You are a writing assistant. "
            f"Known characters and locations in this scene: [{lore_context}]. "
            f"Current story flow: [{prompt[:200]}...]"
        )
        
        try:
            # 4. Stream response
            stream = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                stream=True
            )
            
            for chunk in stream:
                token = chunk.choices[0].delta.content if chunk.choices else ""
                if token:
                    yield f"data: {json.dumps({'token': token})}\n\n"
                    
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
        
        yield "data: [DONE]\n\n"
