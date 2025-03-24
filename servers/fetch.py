# /// script
# requires-python = ">=3.13"
# dependencies = ["mcp"]
# [tool.uv]
# exclude-newer = "2025-03-16T00:00:00Z"
# ///

from mcp.server.fastmcp import FastMCP
import httpx


server = FastMCP(
    "Fetch text from URL",
    instructions="Use to fetch text from a URL",
    dependencies=["trafilatura"],
)


@server.tool()
def fetch(url: str) -> str:
    import trafilatura

    response = httpx.get(url)
    return trafilatura.extract(response.text)


if __name__ == "__main__":
    server.run()
