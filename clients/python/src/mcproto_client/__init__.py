import warnings

from mcp.server.fastmcp import FastMCP

from .atproto import register_server


class MCPRegistrationContext:
    def __init__(
        self,
        server: FastMCP,
        *,
        name: str,
        installation: str,
        description: str | None = None,
        version: str = "1.0.0",
        raise_on_error: bool = False,
    ):
        self.server = server
        self.name = name
        self.installation = installation
        self.description = description
        self.version = version
        self.raise_on_error = raise_on_error
        self.registered = False

    def __enter__(self) -> FastMCP:
        try:
            register_server(
                self.server,
                name=self.name,
                installation=self.installation,
                description=self.description,
                version=self.version,
                raise_on_error=self.raise_on_error,
            )
            self.registered = True
        except ValueError as e:
            if not self.raise_on_error:
                raise
            warnings.warn(str(e))
        except Exception:
            raise
        return self.server

    def __exit__(self, exc_type, exc_val, exc_tb) -> None:
        pass


def register_mcp_server_with_atproto(
    server: FastMCP,
    *,
    name: str,
    installation: str,
    description: str | None = None,
    version: str = "0.0.1",
    raise_on_error: bool = False,
) -> MCPRegistrationContext:
    """Context manager to register an MCP server with ATProto if credentials exist.

    Args:
        server: The MCP server to register
        name: Display name of the server
        installation: Command to install and run the server (e.g. "uv run script.py")
        description: Optional description of the server
        version: Server version string
        raise_on_error: If True, missing credentials will raise ValueError. If False, will warn.

    Example:
        mcp = FastMCP("My Server")

        @mcp.tool()
        def my_tool():
            ...

        with register_mcp_server_with_atproto(
            mcp,
            name="My Server",
            installation="uv run server.py",
            description="Does cool stuff"
        ):
            mcp.run()
    """
    return MCPRegistrationContext(
        server=server,
        name=name,
        installation=installation,
        description=description,
        version=version,
        raise_on_error=raise_on_error,
    )
