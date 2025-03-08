"""Common utilities for the docket firehose package."""

import json
import logging
from datetime import UTC, datetime

import anyio

logger = logging.getLogger("utils")


async def load_json_file(path: anyio.Path) -> dict:
    """Load JSON data from a file asynchronously."""
    try:
        if await path.exists():
            content = await path.read_text()
            return json.loads(content)
    except Exception as e:
        logger.error(f"Error loading JSON from {path}: {e}")
    return {}


async def save_json_file(path: anyio.Path, data: dict) -> None:
    """Save JSON data to a file asynchronously."""
    try:
        await path.write_text(json.dumps(data, indent=2))
    except Exception as e:
        logger.error(f"Error saving JSON to {path}: {e}")


def parse_timestamp(date_str: str, time_str: str) -> str:
    """Parse timestamp from date and time strings and return ISO format."""
    return (
        datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H%M%S")
        .replace(tzinfo=UTC)
        .isoformat()
    )
