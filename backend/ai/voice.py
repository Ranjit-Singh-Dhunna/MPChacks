"""ElevenLabs text-to-speech -> base64 MP3. Returns None if unavailable (graceful)."""
import base64

import httpx

from config import settings

_API = "https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"


def text_to_speech(text: str) -> str | None:
    if not settings.has_elevenlabs or not text.strip():
        return None
    url = _API.format(voice_id=settings.elevenlabs_voice_id)
    headers = {
        "xi-api-key": settings.elevenlabs_api_key,
        "Content-Type": "application/json",
    }
    payload = {
        "text": text[:800],
        "model_id": "eleven_turbo_v2",
        "voice_settings": {"stability": 0.5, "similarity_boost": 0.75},
    }
    try:
        with httpx.Client(timeout=20) as client:
            r = client.post(url, headers=headers, json=payload)
            r.raise_for_status()
            return base64.b64encode(r.content).decode("ascii")
    except Exception:  # noqa: BLE001
        return None
