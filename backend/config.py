"""Application settings, loaded from environment / .env."""
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent
REPO_ROOT = BACKEND_DIR.parent
DATA_DIR = REPO_ROOT / "data"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env", env_file_encoding="utf-8", extra="ignore"
    )

    gemini_api_key: str = ""
    elevenlabs_api_key: str = ""
    elevenlabs_voice_id: str = "21m00Tcm4TlvDq8ikWAM"
    fx_rate_usd_to_cad: float = 1.379
    pre_auth_threshold_usd: float = 50.0
    database_url: str = "sqlite:///./brim.db"

    # Convenience paths
    @property
    def transactions_csv(self) -> Path:
        return DATA_DIR / "transactions.csv"

    @property
    def employees_json(self) -> Path:
        return DATA_DIR / "employees.json"

    @property
    def mcc_codes_json(self) -> Path:
        return DATA_DIR / "mcc_codes.json"

    @property
    def has_gemini(self) -> bool:
        return bool(self.gemini_api_key)

    @property
    def has_elevenlabs(self) -> bool:
        return bool(self.elevenlabs_api_key)


settings = Settings()
