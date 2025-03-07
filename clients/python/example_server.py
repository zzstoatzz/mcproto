# /// script
# dependencies = ["mcproto-client@git+https://github.com/prefecthq/marvin.git#examples/mcproto"]
# ///

from mcp.server.fastmcp import FastMCP

mcp = FastMCP("Bloop Server 2")


@mcp.tool()
def bloop(message: str) -> str:
    """Bloop back the input message."""
    return f"Bloop: {message}"


if __name__ == "__main__":
    from mcproto_client import register_mcp_server_with_atproto

    with register_mcp_server_with_atproto(
        mcp,
        name=mcp.name,
        package="https://github.com/prefecthq/marvin/blob/main/examples/mcproto/server.py",
        description="A simple example MCP server",
    ):
        mcp.run()
