"""Application configuration using pydantic-settings."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Order Service configuration.

    Values are read from environment variables, falling back to .env file.
    """

    database_url: str = "postgresql+asyncpg://cloudmart:localdev@localhost:5433/orderdb"
    redis_url: str = "redis://localhost:6379/0"
    product_service_url: str = "http://localhost:8080"
    gcp_project_id: str = "local-project"
    pubsub_emulator_host: str | None = None
    environment: str = "local"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
