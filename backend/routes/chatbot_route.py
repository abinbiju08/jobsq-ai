from fastapi import APIRouter
from groq import Groq
from pydantic import BaseModel
from typing import List, Optional
import os, re
from dotenv import load_dotenv

load_dotenv()
router = APIRouter()
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[Message]] = []
    system: Optional[str] = None

@router.post("/chat")
async def chat(req: ChatRequest):
    try:
        # Default system prompt if none provided
        system_prompt = req.system or """You are JobsQ AI — a career assistant for job seekers in India.
Help with resume tips, interview prep, salary advice, and job search.
Be concise and practical. Use numbered lists for tips."""

        messages = [{"role": "system", "content": system_prompt}]

        # Add history
        for msg in (req.history or []):
            if msg.content and msg.content.strip():
                messages.append({"role": msg.role, "content": msg.content})

        # Add current message
        messages.append({"role": "user", "content": req.message})

        response = groq_client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=messages,
            temperature=0.3,
            max_tokens=800
        )

        reply = response.choices[0].message.content.strip()

        # Remove <think> tags
        reply = re.sub(r'<think>.*?</think>', '', reply, flags=re.DOTALL).strip()

        return {"reply": reply, "success": True}

    except Exception as e:
        return {"reply": f"Error: {str(e)}", "success": False}