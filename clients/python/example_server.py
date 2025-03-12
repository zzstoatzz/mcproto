# /// script
# dependencies = ["mcproto-client@git+https://github.com/zzstoatzz/mcproto.git#subdirectory=clients/python"]
# ///

from mcp.server.fastmcp import FastMCP

mcp = FastMCP("Bloop Server 2")


@mcp.tool()
def bloop(message: str) -> str:
    """Bloop back the input message."""
    return f"Bloop: {message}"


if __name__ == "__main__":
    mcp.run()
