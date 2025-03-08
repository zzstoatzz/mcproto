"""Entry point for the firehose consumer."""

import anyio

from docket_firehose.tasks.firehose import consume_firehose


async def main(record_types: frozenset[str] = frozenset(["app.mcp.server"])) -> None:
    """Run the firehose consumer."""
    await consume_firehose(record_types)


if __name__ == "__main__":
    anyio.run(main)
