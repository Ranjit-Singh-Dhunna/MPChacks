"""Thin Gemini wrapper enforcing a strict JSON contract.

Contract: invalid/unsafe output -> retry once -> return {"_fallback": True}.
Callers must handle the fallback deterministically (never surface a raw LLM error).
If no API key is configured the client reports unavailable and callers skip the AI tier.
"""
import json
import time

from config import settings

_MODEL_NAME = "gemini-3.1-flash-lite"


class GeminiClient:
    def __init__(self, api_key: str | None = None):
        self.api_key = api_key or settings.gemini_api_key
        self._model = None
        if self.api_key:
            try:
                import google.generativeai as genai

                genai.configure(api_key=self.api_key)
                self._model = genai.GenerativeModel(_MODEL_NAME)
            except Exception:  # noqa: BLE001
                self._model = None

    @property
    def available(self) -> bool:
        return self._model is not None

    @staticmethod
    def _strip_fences(text: str) -> str:
        text = text.strip()
        if text.startswith("```"):
            # remove ```json ... ``` or ``` ... ```
            text = text.split("```", 2)[1] if text.count("```") >= 2 else text.strip("`")
            if text.lstrip().lower().startswith("json"):
                text = text.lstrip()[4:]
        return text.strip()

    def call_json(self, prompt: str, max_retries: int = 1):
        """Return parsed JSON (dict or list), or {"_fallback": True} on failure."""
        if not self.available:
            return {"_fallback": True, "_reason": "no_api_key"}

        last_err = ""
        for attempt in range(max_retries + 1):
            try:
                resp = self._model.generate_content(prompt)
                raw = self._strip_fences(resp.text)
                return json.loads(raw)
            except Exception as exc:  # noqa: BLE001
                last_err = str(exc)
                if attempt < max_retries:
                    time.sleep(0.4)
        return {"_fallback": True, "_reason": last_err}


# Singleton used across the app
gemini = GeminiClient()
