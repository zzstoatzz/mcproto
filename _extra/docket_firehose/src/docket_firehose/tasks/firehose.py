"""ATProto firehose consumer task."""

import json
import logging
from datetime import UTC, datetime

import anyio
from atproto import (
    CAR,
    AsyncFirehoseSubscribeReposClient,
    models,
    parse_subscribe_repos_message,
)
from atproto_firehose.models import MessageFrame

from docket_firehose.logging import setup_logging
from docket_firehose.settings import Settings

logger = logging.getLogger("firehose")
settings = Settings()

setup_logging()


async def _get_save_path(record_type: str) -> anyio.Path:
    """Get the save path for a given record type."""
    date_str = datetime.now(UTC).strftime("%Y-%m-%d")
    save_path = settings.firehose_data_path / record_type.replace(".", "_") / date_str
    await anyio.Path(save_path).mkdir(parents=True, exist_ok=True)
    return save_path


async def consume_firehose(
    record_types: frozenset[str], max_runtime: int | None = None
) -> None:
    """
    Docket task that consumes the ATProto firehose and processes records of specified types.

    Args:
        record_types: Set of record types to monitor
        max_runtime: Optional maximum runtime in seconds
    """
    logger.info(f"Starting firehose consumer for: {', '.join(record_types)}")
    client = AsyncFirehoseSubscribeReposClient()
    start_time = datetime.now(UTC)

    async def process_commit(
        commit: models.ComAtprotoSyncSubscribeRepos.Commit,
    ) -> None:
        """Process a commit message, looking for specified record types."""
        if not commit.blocks:
            return

        car = CAR.from_bytes(
            commit.blocks
            if isinstance(commit.blocks, bytes)
            else commit.blocks.encode()
        )

        async with anyio.create_task_group() as tg:
            for record in car.blocks.values():
                if isinstance(record, dict) and record.get("$type") in record_types:
                    record_type = record["$type"]
                    save_path = await _get_save_path(record_type)
                    filepath = (
                        save_path
                        / f"{datetime.now(UTC).strftime('%H%M%S')}_{commit.seq}.json"
                    )
                    tg.start_soon(
                        anyio.Path(filepath).write_text, json.dumps(record, indent=2)
                    )
                    logger.info(
                        f"Saved {record_type} record: {record.get('name', 'unknown')}"
                    )

    async def message_handler(message: MessageFrame) -> None:
        """Handle incoming firehose messages."""
        commit = parse_subscribe_repos_message(message)
        if isinstance(commit, models.ComAtprotoSyncSubscribeRepos.Commit):
            await process_commit(commit)

        if max_runtime and (datetime.now(UTC) - start_time).seconds > max_runtime:
            logger.info("Max runtime reached")
            await client.stop()

    async def error_handler(error: BaseException) -> None:
        """Handle errors from the firehose."""
        logger.error(f"Firehose error: {error}", exc_info=True)

    try:
        logger.info("Connecting to firehose...")
        await client.start(message_handler, error_handler)
    except KeyboardInterrupt:
        logger.info("Shutting down gracefully...")
        await client.stop()
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        raise
    finally:
        logger.info("Firehose consumer stopped")
