"""Task for processing saved firehose records and calculating basic reputation scores."""

import json
import logging
from datetime import datetime

from docket_firehose.settings import Settings
from docket_firehose.utils import load_json_file, parse_timestamp, save_json_file

logger = logging.getLogger("processor")
settings = Settings()


def calculate_longevity_score(first_seen: str, last_seen: str) -> float:
    """
    Calculate a 0-1 score based on server longevity.
    For now, we'll use a simple formula:
    - Base score for being registered (from settings)
    - Up to max_age_score additional score based on age (max at max_age_days)
    """
    try:
        first = datetime.fromisoformat(first_seen)
        last = datetime.fromisoformat(last_seen)
        age_days = (last - first).days

        # Base score for registration
        base_score = settings.base_reputation_score

        # Additional score based on age
        age_score = min(
            settings.max_age_score,
            (age_days / settings.max_age_days) * settings.max_age_score,
        )

        return round(base_score + age_score, 3)
    except Exception as e:
        logger.error(f"Error calculating longevity score: {e}")
        return 0.0


async def process_saved_records(record_type: str = settings.record_type) -> None:
    """
    Process saved firehose records and update reputation scores.
    Currently tracks:
    - First seen date
    - Last seen date
    - Basic longevity-based reputation score
    """
    logger.info(f"Processing records for type: {record_type}")

    # Load existing reputation data
    reputation_data = await load_json_file(settings.reputation_file)

    # Process all record files
    base_path = settings.firehose_data_path / record_type.replace(".", "_")
    if await base_path.exists():
        async for date_dir in base_path.iterdir():
            if await date_dir.is_dir():
                async for record_file in date_dir.glob("*.json"):
                    try:
                        content = await record_file.read_text()
                        data = json.loads(content)
                        server_did = data.get("did")
                        if not server_did:
                            continue

                        # Parse record timestamp from filename (HHMMSS_seq.json)
                        timestamp = parse_timestamp(date_dir.name, record_file.name[:6])

                        # Update server data
                        if server_did not in reputation_data:
                            reputation_data[server_did] = {
                                "first_seen": timestamp,
                                "last_seen": timestamp,
                                "name": data.get("name", "unknown"),
                            }
                        else:
                            # Update last_seen if this record is newer
                            if timestamp > reputation_data[server_did]["last_seen"]:
                                reputation_data[server_did]["last_seen"] = timestamp

                        # Calculate reputation score
                        reputation_data[server_did]["reputation_score"] = (
                            calculate_longevity_score(
                                reputation_data[server_did]["first_seen"],
                                reputation_data[server_did]["last_seen"],
                            )
                        )

                        logger.info(
                            f"Updated reputation for {data.get('name', 'unknown')} "
                            f"(DID: {server_did[:8]}...) - "
                            f"Score: {reputation_data[server_did]['reputation_score']}"
                        )

                    except Exception as e:
                        logger.error(f"Error processing {record_file}: {e}")

    # Save updated reputation data
    await save_json_file(settings.reputation_file, reputation_data)
    logger.info("Processing complete")
