import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

class Settings(BaseSettings):
    # DB
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    POSTGRES_HOST: str
    POSTGRES_PORT: str = "5432"

    # Sec
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 180
    
    # Admin
    ADMIN_DEFAULT_PASSWORD: str

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173"

    # Execution
    EXECUTION_TIMEOUT: int = 5
    EXECUTION_MEMORY_LIMIT: str = "128m"

    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

@lru_cache()
def get_settings() -> Settings:
    return Settings()

settings = get_settings()