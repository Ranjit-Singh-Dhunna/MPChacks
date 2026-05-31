"""Application settings, loaded from environment / .env."""
from pathlib import Path
from urllib.parse import urlparse

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent
REPO_ROOT = BACKEND_DIR.parent
DATA_DIR = REPO_ROOT / "data"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env", env_file_encoding="utf-8", extra="ignore"
    )

    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.1-flash-lite"
    gemini_cluster_narratives: bool = False
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

    @property
    def resolved_database_url(self) -> str:
        """Resolve the default SQLite path relative to backend/, not the launch cwd."""
        if not self.database_url.startswith("sqlite:///"):
            return self.database_url
        raw_path = self.database_url.removeprefix("sqlite:///")
        if raw_path in {":memory:", ""}:
            return self.database_url
        parsed = urlparse(self.database_url)
        if parsed.netloc:
            return self.database_url
        db_path = Path(raw_path)
        if db_path.is_absolute():
            return self.database_url
        return f"sqlite:///{(BACKEND_DIR / db_path).as_posix()}"


settings = Settings()
