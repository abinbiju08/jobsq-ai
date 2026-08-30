from fastapi import APIRouter
from pydantic import BaseModel
import os, httpx
from dotenv import load_dotenv

load_dotenv()
router = APIRouter()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

class FaceLoginRequest(BaseModel):
    user_id: str

@router.post("/face-login")
async def face_login(req: FaceLoginRequest):
    try:
        async with httpx.AsyncClient() as client:

            # Step 1: Get user email
            user_res = await client.get(
                f"{SUPABASE_URL}/auth/v1/admin/users/{req.user_id}",
                headers={
                    "apikey": SERVICE_KEY,
                    "Authorization": f"Bearer {SERVICE_KEY}",
                }
            )
            if user_res.status_code != 200:
                return {"error": f"User not found: {user_res.text}"}

            email = user_res.json().get("email")
            if not email:
                return {"error": "No email found for user"}

            # Step 2: Generate magic link
            link_res = await client.post(
                f"{SUPABASE_URL}/auth/v1/admin/generate_link",
                headers={
                    "apikey": SERVICE_KEY,
                    "Authorization": f"Bearer {SERVICE_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "type": "magiclink",
                    "email": email,
                    "options": {"redirect_to": "http://localhost:5173/home"}
                }
            )

            if link_res.status_code != 200:
                return {"error": f"Generate link failed: {link_res.text}"}

            link_data = link_res.json()

            # Extract token from action_link URL directly
            action_link = link_data.get("action_link", "")

            # Parse token from the URL — it's in the fragment or query
            # action_link looks like: https://xxx.supabase.co/auth/v1/verify?token=xxx&type=magiclink
            token = None
            if "token=" in action_link:
                token = action_link.split("token=")[1].split("&")[0]

            if not token:
                # Try hashed_token from properties
                props = link_data.get("properties", {})
                token = props.get("hashed_token") or props.get("token")

            if not token:
                # Log full response for debugging
                return {"error": "Could not extract token", "full_response": link_data}

            # Step 3: Verify token to get session
            verify_res = await client.post(
                f"{SUPABASE_URL}/auth/v1/verify",
                headers={
                    "apikey": SERVICE_KEY,
                    "Content-Type": "application/json"
                },
                json={
                    "type": "magiclink",
                    "token_hash": token
                }
            )

            if verify_res.status_code == 200:
                data = verify_res.json()
                access_token = data.get("access_token")
                refresh_token = data.get("refresh_token", "")
                if access_token:
                    return {
                        "access_token": access_token,
                        "refresh_token": refresh_token
                    }
                return {"error": "No access token", "data": data}

            # Try with token directly (not token_hash)
            verify_res2 = await client.post(
                f"{SUPABASE_URL}/auth/v1/verify",
                headers={
                    "apikey": SERVICE_KEY,
                    "Content-Type": "application/json"
                },
                json={
                    "type": "magiclink",
                    "token": token
                }
            )

            if verify_res2.status_code == 200:
                data = verify_res2.json()
                access_token = data.get("access_token")
                if access_token:
                    return {
                        "access_token": access_token,
                        "refresh_token": data.get("refresh_token", "")
                    }

            return {
                "error": f"Verify failed",
                "verify1": verify_res.text,
                "verify2": verify_res2.text
            }

    except Exception as e:
        return {"error": str(e)}

@router.get("/status")
async def auth_status():
    return {"status": "Auth handled by Supabase client"}