"""Worker for processing saved firehose records."""

import anyio
import logging
import os
from datetime import datetime, timedelta, timezone

from docket import Docket, Worker

from tasks.process import process_saved_records

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("worker")


async def main() -> None:
    """Run the Docket worker to process saved records."""
    redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")
    logger.info("Starting worker")

    async with Docket(name="firehose-processor", url=redis_url) as docket:
        logger.info("Connected to Redis, registering tasks...")
        docket.register(process_saved_records)
        logger.info("Tasks registered")

        now = datetime.now(timezone.utc)
        await docket.add(process_saved_records)()
        await docket.add(process_saved_records, when=now + timedelta(minutes=5))()
        logger.info("Initial tasks scheduled")

        async with Worker(docket, concurrency=1) as worker:
            logger.info("Ready")
            await worker.run_forever()


if __name__ == "__main__":
    anyio.run(main)
