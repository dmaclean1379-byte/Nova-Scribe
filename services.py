import os
import sqlite3
import json
from typing import Generator, List, Dict, Optional
from openai import OpenAI
from dotenv import load_dotenv

# Load API keys from .env file
load_dotenv()

class AIService:
    def __init__(self, db_path: str = "database.sqlite"):
        self.db_path = db_path

    def fetch_lore_context(self, text: str) -> str:
        """
        Scans the user's current writing for names found in the characters or locations tables.
        Returns a formatted string of their descriptions.
        """
        found_lore = []
        text_lower = text.lower()
        
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                
                # Check for characters
                cursor.execute("SELECT name, description FROM characters")
                for char in cursor.fetchall():
                    if char['name'].lower() in text_lower:
                        found_lore.append(f"Character: {char['name']} - {char['description']}")

                # Check for locations
                cursor.execute("SELECT name, description FROM locations")
                for loc in cursor.fetchall():
                    if loc['name'].lower() in text_lower:
                        found_lore.append(f"Location: {loc['name']} - {loc['description']}")
                        
        except Exception as e:
            print(f"Lore Context Fetch Error: {e}")
            
        return "\n".join(found_lore) if found_lore else "No specific characters or locations detected."

    def get_client(self, provider: str) -> OpenAI:
        """
        Universal Client Factory: configured for OpenRouter, NVIDIA, and Ollama.
        """
        providers = {
            "openrouter": {
                "base_url": "https://openrouter.ai/api/v1",
                "api_key": os.getenv("OPENROUTER_API_KEY")
            },
            "nvidia": {
                "base_url": "https://integrate.api.nvidia.com/v1",
                "api_key": os.getenv("NVIDIA_API_KEY")
            },
            "ollama": {
                "base_url": os.getenv("LOCAL_AI_BASE_URL", "http://localhost:11434/v1"),
                "api_key": "ollama" # dummy key for local
            }
        }
        
        # Compatibility for 'local' flag used in other services
        if provider == "local":
            provider = "ollama"

        if provider not in providers:
            raise ValueError(f"Unsupported provider: {provider}")

        cfg = providers[provider]
        return OpenAI(
            base_url=cfg["base_url"],
            api_key=cfg["api_key"] or "local"
        )

    async def stream_completion(self, provider: str, model: str, messages: List[Dict], lore: str) -> Generator[str, None, None]:
        """
        Core generation logic: Injects lore into system message and streams tokens.
        """
        try:
            client = self.get_client(provider)
            
            # Inject Lore into the system message (find existing or create new)
            system_msg_index = next((i for i, m in enumerate(messages) if m['role'] == 'system'), None)
            
            lore_injection = f"\n\n[LORE CONTEXT]\n{lore}"
            
            if system_msg_index is not None:
                messages[system_msg_index]['content'] += lore_injection
            else:
                messages.insert(0, {
                    "role": "system", 
                    "content": f"You are a helpful writing assistant for Nova-Scribe.{lore_injection}"
                })

            completion = client.chat.completions.create(
                model=model,
                messages=messages,
                stream=True,
                temperature=0.7
            )

            for chunk in completion:
                if chunk.choices and chunk.choices[0].delta.content:
                    token = chunk.choices[0].delta.content
                    yield f"data: {json.dumps({'token': token})}\n\n"
                    
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
        
        yield "data: [DONE]\n\n"

ai_service = AIService()
