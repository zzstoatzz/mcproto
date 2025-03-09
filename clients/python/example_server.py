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
    from mcproto_client import register_mcp_server_with_atproto

    with register_mcp_server_with_atproto(
        mcp,
        name=mcp.name,
        installation="uv run https://github.com/zzstoatzz/mcproto/blob/main/clients/python/example_server.py",
        description="A simple example MCP server",
    ):
        mcp.run()
