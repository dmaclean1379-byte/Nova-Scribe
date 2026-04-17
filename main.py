from fastapi import FastAPI, Query
from fastapi.responses import StreamingResponse
from provider_service import AIProviderService
import json

app = FastAPI()
ai_service = AIProviderService()

@app.get("/generate")
async def generate(
    provider: str = Query(...),
    model: str = Query("gpt-3.5-turbo"),
    prompt: str = Query(...),
    story_id: str = Query(...),
    system_prompt: str = Query("You are a creative writing assistant.")
):
    def stream_wrapper():
        for token in ai_service.generate_tokens(provider, model, prompt, story_id, system_prompt):
            yield f"data: {json.dumps({'token': token})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(stream_wrapper(), media_type="text/event-stream")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
