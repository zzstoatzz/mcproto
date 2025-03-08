"""Docket firehose package for processing ATProto records."""

from .logging import setup_logging
from .settings import Settings

__all__ = ["Settings", "setup_logging"]
