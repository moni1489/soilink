from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./soilink.db"
    ML_MODELS_DIR: str = "ml_models"
    ANTHROPIC_API_KEY: str = ""
    OPENMETEO_API_URL: str = "https://api.open-meteo.com/v1/forecast"

    class Config:
        env_file = ".env"

    @property
    def models_path(self) -> Path:
        return Path(__file__).resolve().parent.parent.parent / self.ML_MODELS_DIR


settings = Settings()
