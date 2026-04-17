import os
import sqlite3
from typing import Generator
from openai import OpenAI
from dotenv import load_dotenv

# Load API keys from .env file
load_dotenv()

class AIEngine:
    def __init__(self, db_path: str = "database.sqlite"):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        """Initialize characters and locations tables as per the new repository structure."""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS characters (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT,
                    tags TEXT
                )
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS locations (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT,
                    tags TEXT
                )
            """)

    def get_scene_context(self, current_text: str) -> str:
        """
        Queries local SQLite characters and locations tables. 
        If a name from the DB appears in the current_text, it fetches that entity's description.
        """
        context_parts = []
        text_lower = current_text.lower()
        
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                
                # Check characters
                cursor.execute("SELECT name, description FROM characters")
                for row in cursor.fetchall():
                    if row['name'].lower() in text_lower:
                        context_parts.append(f"Character: {row['name']} - {row['description']}")
                
                # Check locations
                cursor.execute("SELECT name, description FROM locations")
                for row in cursor.fetchall():
                    if row['name'].lower() in text_lower:
                        context_parts.append(f"Location: {row['name']} - {row['description']}")
        except Exception as e:
            print(f"Database error during context fetching: {e}")
            
        return "\n".join(context_parts) if context_parts else "None detected."

    def generate_response(self, provider: str, model: str, prompt: str, context: str) -> Generator[str, None, None]:
        """
        Universal Provider Logic: switches between OpenRouter, NVIDIA, and Local (Ollama).
        Constructs a System Message with scene context.
        """
        
        # 1. Configure Provider Settings
        configs = {
            "openrouter": {
                "base_url": "https://openrouter.ai/api/v1",
                "api_key": os.getenv("OPENROUTER_API_KEY"),
            },
            "nvidia": {
                "base_url": "https://integrate.api.nvidia.com/v1",
                "api_key": os.getenv("NVIDIA_API_KEY"),
            },
            "local": {
                "base_url": os.getenv("LOCAL_AI_BASE_URL", "http://localhost:11434/v1"),
                "api_key": "ollama", # placeholder for local
            }
        }
        
        if provider not in configs:
            yield f"Error: Provider '{provider}' is not supported."
            return

        cfg = configs[provider]
        api_key = cfg["api_key"]
        
        if not api_key and provider != "local":
            yield f"Error: API key for {provider} is missing from .env."
            return

        # 2. Setup Client
        client = OpenAI(
            base_url=cfg["base_url"],
            api_key=api_key or "local"
        )

        # 3. Prompt Engineering (System Message construction)
        system_message = (
            f"You are a writing assistant. "
            f"Known characters and locations in this scene: [{context}]. "
            f"Current story flow: [{prompt[:200]}...]"
        )

        try:
            # 4. Streaming Logic
            stream = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_message},
                    {"role": "user", "content": prompt}
                ],
                stream=True
            )

            for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
                    
        except Exception as e:
            yield f"Error during generation: {str(e)}"

# Export a default instance for easier usage
ai_engine = AIEngine()
