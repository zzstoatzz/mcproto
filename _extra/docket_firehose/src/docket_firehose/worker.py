"""Worker for processing saved firehose records."""

import logging
from datetime import UTC, datetime, timedelta

import anyio
from docket import Docket, Worker

from docket_firehose.logging import setup_logging
from docket_firehose.settings import Settings
from docket_firehose.tasks.process import process_saved_records

logger = logging.getLogger("worker")
settings = Settings()


async def main() -> None:
    """Run the Docket worker to process saved records."""
    setup_logging()
    logger.info("Starting worker")

    async with Docket(name="firehose-processor", url=settings.redis_url) as docket:
        logger.info("Connected to Redis, registering tasks...")
        docket.register(process_saved_records)
        logger.info("Tasks registered")

        now = datetime.now(UTC)
        await docket.add(process_saved_records)()
        await docket.add(process_saved_records, when=now + timedelta(minutes=5))()
        logger.info("Initial tasks scheduled")

        async with Worker(docket, concurrency=1) as worker:
            logger.info("Ready")
            await worker.run_forever()


if __name__ == "__main__":
    anyio.run(main)
