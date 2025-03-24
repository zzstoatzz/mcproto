from typing import ClassVar

from pydantic import AnyHttpUrl, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config: ClassVar[SettingsConfigDict] = SettingsConfigDict(
        env_file=".env", extra="ignore", env_prefix="BSKY_"
    )

    handle: str
    password: str

    registry_url: AnyHttpUrl = AnyHttpUrl("https://mcproto.alternatebuild.dev")

    @model_validator(mode="before")
    @classmethod
    def validate_credentials(cls, data):
        if not data.get("handle") or not data.get("password"):
            raise ValueError(
                "BSKY_HANDLE and BSKY_PASSWORD environment variables not set. Cannot register server with ATProto without credentials."
            )
        return data
