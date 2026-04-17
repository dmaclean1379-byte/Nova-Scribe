from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from services import ai_service
import uvicorn

app = FastAPI(title="Nova-Scribe Backend")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/v1/chat/completions")
async def chat_completions(request: Request):
    """
    Standard OpenAI compatible endpoint.
    Pulls lore context and streams response.
    """
    body = await request.json()
    provider = body.get("provider", "ollama")
    model = body.get("model", "llama3")
    messages = body.get("messages", [])
    
    # Extract prompt from last user message for lore scanning
    user_prompt = ""
    for msg in reversed(messages):
        if msg['role'] == 'user':
            user_prompt = msg['content']
            break
            
    # Pull lore context
    lore = ai_service.fetch_lore_context(user_prompt)
    
    return StreamingResponse(
        ai_service.stream_completion(provider, model, messages, lore),
        media_type="text/event-stream"
    )

@app.get("/generate")
async def legacy_generate(provider: str, model: str, prompt: str):
    """Refactored legacy endpoint for backwards compatibility."""
    lore = ai_service.fetch_lore_context(prompt)
    messages = [{"role": "user", "content": prompt}]
    return StreamingResponse(
        ai_service.stream_completion(provider, model, messages, lore),
        media_type="text/event-stream"
    )

if __name__ == "__main__":
    # Ensure server stays alive and handles CORS
    uvicorn.run(app, host="0.0.0.0", port=8000)
