from pathlib import Path
from typing import Any

from mcp.server.fastmcp import FastMCP
from mcp.server.lowlevel.server import Server

from mcproto_client import register_server, source_url_from_file_path


def echo(server: Server[Any]):
    register_server(
        server=server,
        installation=f"uv run {source_url_from_file_path(Path(__file__))}",
        description="Bloop Server 2",
        version="0.0.1",
    )
    print(f"Registered server {server.name} to `app.mcp.server` on ATProto")


mcp = FastMCP("Bloop Server 2", startup_hooks=[echo])


@mcp.tool()
def bloop(message: str) -> str:
    """Bloop back the input message."""
    return f"Bloop: {message}"


if __name__ == "__main__":
    mcp.run()
