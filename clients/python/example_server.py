# /// script
# dependencies = ["mcproto-client@git+https://github.com/prefecthq/marvin.git#examples/mcproto"]
# ///

from mcp.server.fastmcp import FastMCP

mcp = FastMCP("Example Server")


@mcp.tool()
def echo(message: str) -> str:
    """Echo back the input message."""
    return f"Echo: {message}"


@mcp.tool()
def add(a: float, b: float) -> str:
    """Add two numbers."""
    return f"The sum of {a} and {b} is {a + b}."


if __name__ == "__main__":
    from mcproto_client import register_mcp_server_with_atproto

    with register_mcp_server_with_atproto(
        mcp,
        name="Example Server",
        package="https://github.com/prefecthq/marvin/blob/main/examples/mcproto/server.py",
        description="A simple example MCP server",
    ):
        mcp.run()
