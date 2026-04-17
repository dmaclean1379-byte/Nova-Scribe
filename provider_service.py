import os
import sqlite3
from typing import Generator
from openai import OpenAI
import requests

class AIProviderService:
    def __init__(self, db_path: str = "database.sqlite"):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS bible_entries (
                    id TEXT PRIMARY KEY,
                    story_id TEXT,
                    name TEXT,
                    type TEXT,
                    description TEXT
                )
            """)

    def get_client(self, provider_name: str) -> OpenAI:
        providers = {
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
                "api_key": "ollama",
            }
        }

        if provider_name not in providers:
            raise ValueError(f"Provider {provider_name} not supported.")

        config = providers[provider_name]
        
        if not config["api_key"] and provider_name != "local":
            raise ValueError(f"API Key for {provider_name} is missing.")

        return OpenAI(
            base_url=config["base_url"],
            api_key=config["api_key"] or "local"
        )

    def get_relevant_context(self, story_id: str, current_text: str) -> str:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(
                "SELECT name, type, description FROM bible_entries WHERE story_id = ?", 
                (story_id,)
            )
            entries = cursor.fetchall()

        relevant = []
        text_lower = current_text.lower()
        for name, type_label, desc in entries:
            if name.lower() in text_lower:
                relevant.append(f"- {name} ({type_label}): {desc}")

        if not relevant:
            return ""

        return "\n\nRelevant Context from Story Bible:\n" + "\n".join(relevant)

    def generate_tokens(self, provider: str, model: str, prompt: str, story_id: str, system_prompt: str) -> Generator[str, None, None]:
        try:
            client = self.get_client(provider)
            
            context = self.get_relevant_context(story_id, prompt)
            full_system = system_prompt + context

            stream = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": full_system},
                    {"role": "user", "content": prompt}
                ],
                stream=True
            )

            for chunk in stream:
                token = chunk.choices[0].delta.content
                if token:
                    yield token

        except requests.exceptions.ConnectionError:
            yield f"Error: Local AI server at {os.getenv('LOCAL_AI_BASE_URL')} is unreachable."
        except Exception as e:
            yield f"Error: {str(e)}"
