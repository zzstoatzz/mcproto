import warnings

from mcp.server.fastmcp import FastMCP

from .atproto import register_server


class MCPRegistrationContext:
    def __init__(
        self,
        server: FastMCP,
        *,
        name: str,
        package: str,
        description: str | None = None,
        version: str = "1.0.0",
        raise_on_error: bool = False,
    ):
        self.server = server
        self.name = name
        self.package = package
        self.description = description
        self.version = version
        self.raise_on_error = raise_on_error
        self.registered = False

    def __enter__(self) -> FastMCP:
        try:
            register_server(
                self.server,
                name=self.name,
                package=self.package,
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
    package: str,
    description: str | None = None,
    version: str = "1.0.0",
    raise_on_error: bool = False,
) -> MCPRegistrationContext:
    """Context manager to register an MCP server with ATProto if credentials exist.

    Args:
        server: The MCP server to register
        name: Display name of the server
        package: URL or package identifier for installation
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
            package="https://github.com/me/repo/blob/main/server.py",
            description="Does cool stuff"
        ):
            mcp.run()
    """
    return MCPRegistrationContext(
        server=server,
        name=name,
        package=package,
        description=description,
        version=version,
        raise_on_error=raise_on_error,
    )
