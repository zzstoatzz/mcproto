#!/usr/bin/env -S uv run --script

# /// script
# requires-python = ">=3.13"
# dependencies = ["mcp", "trafilatura"]
# [tool.uv]
# exclude-newer = "2025-03-16T00:00:00Z"
# ///

from mcp.server.fastmcp import FastMCP
import httpx
import trafilatura

server = FastMCP("Fetch text from URL")


@server.tool()
def fetch(url: str) -> str:
    response = httpx.get(url)
    return trafilatura.extract(response.text)


if __name__ == "__main__":
    server.run()
