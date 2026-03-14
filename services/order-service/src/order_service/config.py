"""Application configuration using pydantic-settings."""

from pydantic_settings import BaseSettings

_DEV_SECRET_MARKER = "dev-secret-change-in-production-min-32-bytes"


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

    # Auth settings
    jwt_secret: str = _DEV_SECRET_MARKER
    oauth_client_id: str = ""
    oauth_client_secret: str = ""
    admin_emails: str = ""

    # CORS settings
    cors_origins: str = "http://localhost:5173"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()

if settings.environment not in ("local", "test") and settings.jwt_secret == _DEV_SECRET_MARKER:
    raise RuntimeError(
        "JWT_SECRET must be set to a secure value in non-local environments. "
        "The dev-default placeholder is not allowed in production."
    )
