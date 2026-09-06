from fastapi import APIRouter
from pydantic import BaseModel
from groq import Groq
import os
from dotenv import load_dotenv

load_dotenv()
router = APIRouter()
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

class ChatRequest(BaseModel):
    message: str
    history: list = []

@router.post("/chat")
async def chat(req: ChatRequest):
    try:
        messages = [
            {
                "role": "system",
                "content": "You are JobsQ AI assistant — a smart, friendly career advisor. Help users with job search, resume tips, interview prep, salary negotiation, and career guidance. Keep responses concise and helpful."
            }
        ]
        for h in req.history[-6:]:
            messages.append({"role": h["role"], "content": h["content"]})
        messages.append({"role": "user", "content": req.message})

        response = groq_client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=messages,
            temperature=0.7,
            max_tokens=500
        )
        reply = response.choices[0].message.content
        # Strip thinking tags if present
        if '<think>' in reply:
            reply = reply.split('</think>')[-1].strip()
        return {"reply": reply}
    except Exception as e:
        return {"reply": "Sorry, I'm having trouble right now. Please try again!"}