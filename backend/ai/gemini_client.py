"""Thin Gemini wrapper enforcing a strict JSON contract.

Contract: invalid/unsafe output -> retry once -> return {"_fallback": True}.
Callers must handle the fallback deterministically (never surface a raw LLM error).
If no API key is configured the client reports unavailable and callers skip the AI tier.
"""
import json
import logging
import time

from config import settings

logger = logging.getLogger(__name__)

_MODEL_NAME = settings.gemini_model
_JSON_GENERATION_CONFIG = {
    "temperature": 0.1,
    "response_mime_type": "application/json",
}


class GeminiClient:
    def __init__(self, api_key: str | None = None):
        self.api_key = api_key or settings.gemini_api_key
        self._model = None
        self.init_error = ""
        if self.api_key:
            try:
                import google.generativeai as genai

                genai.configure(api_key=self.api_key)
                self._model = genai.GenerativeModel(_MODEL_NAME)
                logger.info("Gemini client initialized model=%s", _MODEL_NAME)
            except Exception as exc:  # noqa: BLE001
                self.init_error = f"{type(exc).__name__}: {exc}"
                logger.exception("Gemini client failed to initialize model=%s", _MODEL_NAME)
                self._model = None
        else:
            self.init_error = "no_api_key"
            logger.warning("Gemini client unavailable: GEMINI_API_KEY is not configured")

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

    def call_json(self, prompt: str, max_retries: int = 1, response_schema: dict | None = None):
        """Return parsed JSON (dict or list), or {"_fallback": True} on failure."""
        if not self.available:
            return {"_fallback": True, "_reason": self.init_error or "unavailable", "_model": _MODEL_NAME}

        generation_config = dict(_JSON_GENERATION_CONFIG)
        if response_schema:
            generation_config["response_schema"] = response_schema

        last_err = ""
        for attempt in range(max_retries + 1):
            try:
                resp = self._model.generate_content(
                    prompt,
                    generation_config=generation_config,
                )
                raw = self._strip_fences(resp.text)
                return json.loads(raw)
            except TypeError:
                # Older google-generativeai versions may not support structured-output config.
                try:
                    resp = self._model.generate_content(prompt)
                    raw = self._strip_fences(resp.text)
                    return json.loads(raw)
                except Exception as exc:  # noqa: BLE001
                    last_err = f"{type(exc).__name__}: {exc}"
            except Exception as exc:  # noqa: BLE001
                last_err = f"{type(exc).__name__}: {exc}"
            logger.warning(
                "Gemini JSON call failed attempt=%s/%s model=%s reason=%s",
                attempt + 1,
                max_retries + 1,
                _MODEL_NAME,
                last_err,
            )
            if attempt < max_retries:
                time.sleep(0.4)
        return {"_fallback": True, "_reason": last_err, "_model": _MODEL_NAME}


# Singleton used across the app
gemini = GeminiClient()
