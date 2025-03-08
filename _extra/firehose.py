# /// script
# requires-python = ">=3.10"
# dependencies = ["atproto"]
# ///

import asyncio
import json
import argparse
from datetime import datetime, timezone

import anyio
from atproto import (
    AsyncFirehoseSubscribeReposClient,
    parse_subscribe_repos_message,
    models,
    CAR,
)

BASE_PATH = anyio.Path(__file__).parent / "data"


async def _get_save_path(record_type: str) -> anyio.Path:
    date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    save_path = BASE_PATH / "firehose" / record_type.replace(".", "_") / date_str
    await save_path.mkdir(parents=True, exist_ok=True)
    return save_path


async def process_commit(
    commit: models.ComAtprotoSyncSubscribeRepos.Commit, record_types: set[str]
) -> None:
    """Process a commit message, looking for specified record types."""
    if not commit.blocks:
        return

    car = CAR.from_bytes(
        commit.blocks if isinstance(commit.blocks, bytes) else commit.blocks.encode()
    )

    # Look for matching records in the commit
    async with anyio.create_task_group() as tg:
        for record in car.blocks.values():
            if isinstance(record, dict) and record.get("$type") in record_types:
                record_type = record["$type"]
                save_path = await _get_save_path(record_type)

                filepath = (
                    save_path
                    / f"{datetime.now(timezone.utc).strftime('%H%M%S')}_{commit.seq}.json"
                )

                tg.start_soon(
                    anyio.Path(filepath).write_text, json.dumps(record, indent=2)
                )
                print(f"Saved {record_type} record: {filepath}")


async def on_message_handler(message, record_types: set[str]) -> None:
    """Handle incoming firehose messages."""
    commit = parse_subscribe_repos_message(message)

    if isinstance(commit, models.ComAtprotoSyncSubscribeRepos.Commit):
        await process_commit(commit, record_types)


async def on_error_handler(error: BaseException) -> None:
    """Handle errors from the firehose."""
    print(f"Error in firehose: {error}")


async def main():
    """Connect to the firehose and start processing messages."""
    parser = argparse.ArgumentParser(
        description="Monitor ATProto firehose for specific record types"
    )
    parser.add_argument(
        "--types",
        "-t",
        nargs="+",
        default=["app.mcp.server"],
        help="Record types to monitor (e.g., app.mcp.server app.bsky.feed.post)",
    )
    args = parser.parse_args()
    record_types = set(args.types)
    print(f"Monitoring firehose for record types: {', '.join(record_types)}")

    client = AsyncFirehoseSubscribeReposClient()

    try:
        await client.start(
            lambda msg: on_message_handler(msg, record_types), on_error_handler
        )
    except KeyboardInterrupt:
        print("\nShutting down gracefully...")
        await client.stop()


if __name__ == "__main__":
    asyncio.run(main())
