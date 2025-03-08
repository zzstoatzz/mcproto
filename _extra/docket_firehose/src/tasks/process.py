"""Example task for processing saved firehose records."""

import json
import logging
from pathlib import Path

# Configure minimal, clean logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("processor")


async def process_saved_records(record_type: str = "app.mcp.server") -> None:
    """
    Dummy task that simulates processing saved firehose records.
    Later this might do things like:
    - Validate records
    - Transform data
    - Update indexes
    - Trigger notifications
    etc.
    """
    logger.info(f"Processing records for type: {record_type}")

    # Simulate some work
    base_path = Path("/app/data/firehose") / record_type.replace(".", "_")
    if base_path.exists():
        for date_dir in base_path.iterdir():
            if date_dir.is_dir():
                logger.info(f"Found records for date: {date_dir.name}")
                for record_file in date_dir.glob("*.json"):
                    try:
                        data = json.loads(record_file.read_text())
                        logger.info(
                            f"Would process record: {data.get('name', 'unknown')} from {record_file}"
                        )
                    except Exception as e:
                        logger.error(f"Error processing {record_file}: {e}")

    logger.info("Processing complete")
