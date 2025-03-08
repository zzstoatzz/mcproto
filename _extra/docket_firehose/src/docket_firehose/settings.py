"""Settings for the docket firehose package."""

import anyio
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings."""

    model_config = SettingsConfigDict(extra="forbid")

    # Paths
    base_data_path: anyio.Path = anyio.Path("/app/data")
    firehose_data_path: anyio.Path = base_data_path / "firehose"
    reputation_file: anyio.Path = base_data_path / "reputation.json"

    # Redis
    redis_url: str = "redis://redis:6379/0"

    # Record types
    record_type: str = "app.mcp.server"

    # Reputation scoring
    base_reputation_score: float = 0.1
    max_age_score: float = 0.9
    max_age_days: int = 30
