# /// script
# requires-python = ">=3.10"
# dependencies = ["atproto"]
# ///

import argparse
from functools import partial

import anyio
from atproto import Client, models

BASE_PATH = anyio.Path(__file__).parent / "data"


async def _get_collection_path(did: str, collection: str) -> anyio.Path:
    """Get the path for a specific DID and collection type."""
    collection_path = BASE_PATH / did.replace(":", "_") / collection
    await collection_path.mkdir(parents=True, exist_ok=True)
    return collection_path


async def _save_record(
    record: models.ComAtprotoRepoListRecords.Record, collection_path: anyio.Path
):
    filepath = collection_path / f"{record.uri.split('/')[-1]}.json"
    await anyio.Path(filepath).write_text(record.model_dump_json(indent=2))
    print(f"saved: {filepath}")


async def download_repo_for_did(did: str, collection: str, limit: int = 5) -> None:
    """Download records for a specific DID and collection."""
    collection_path = await _get_collection_path(did, collection)
    client = Client()

    cursor = None
    total_fetched = 0
    batch_size = min(50, limit) if limit > 0 else 50

    while total_fetched < limit or limit == 0:
        response = client.com.atproto.repo.list_records(
            {
                "repo": did,
                "collection": collection,
                "limit": (
                    min(batch_size, limit - total_fetched) if limit > 0 else batch_size
                ),
                "cursor": cursor,
            }
        )

        if not response.records:
            break

        async with anyio.create_task_group() as tg:
            for record in response.records:
                tg.start_soon(_save_record, record, collection_path)

        total_fetched += len(response.records)
        cursor = response.cursor

        if not cursor or (limit > 0 and total_fetched >= limit):
            break


async def download_collections(
    did: str, collections: list[str], limit: int = 5
) -> None:
    async with anyio.create_task_group() as tg:
        for collection in collections:
            tg.start_soon(download_repo_for_did, did, collection, limit)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Download ATProto repository records")
    parser.add_argument(
        "--did", default="did:plc:xbtmt2zjwlrfegqvch7fboei", help="DID to download from"
    )
    parser.add_argument(
        "--collection",
        "-c",
        default="app.bsky.feed.post",  # or app.mcp.server
        help="Collection type to download",
    )
    parser.add_argument(
        "--limit",
        "-l",
        type=int,
        default=5,
        help="Maximum number of records to download (0 for all)",
    )
    parser.add_argument(
        "--collections", "-C", nargs="+", help="Multiple collections to download"
    )
    args = parser.parse_args()
    collections = args.collections if args.collections else [args.collection]
    anyio.run(partial(download_collections, args.did, collections, args.limit))
