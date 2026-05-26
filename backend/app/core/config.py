from pathlib import Path
from pydantic_settings import BaseSettings

_ENV_FILE = Path(__file__).resolve().parent.parent.parent / ".env"


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./soilink.db"
    ML_MODELS_DIR: str = "ml_models"
    GEMINI_API_KEY: str = ""
    GROQ_API_KEY: str = ""
    OPENMETEO_API_URL: str = "https://api.open-meteo.com/v1/forecast"

    class Config:
        env_file = str(_ENV_FILE)
        extra = "ignore"

    @property
    def models_path(self) -> Path:
        return Path(__file__).resolve().parent.parent.parent / self.ML_MODELS_DIR


settings = Settings()
