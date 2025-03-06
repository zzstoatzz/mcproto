"""CLI for registering MCP servers with ATProto."""

import argparse
import sys

from mcp.cli.cli import _import_server, _parse_file_path
from mcp.server.fastmcp.utilities.logging import get_logger

from . import register_mcp_server_with_atproto
from ._git import get_github_url

logger = get_logger("mcproto")


def main():
    parser = argparse.ArgumentParser(description="Register an MCP server with ATProto")
    parser.add_argument("file_spec", help="Python file containing MCP server")
    parser.add_argument("--version", default="0.0.1", help="Server version")
    args = parser.parse_args()

    try:
        # Add parent directory to Python path so imports can be resolved
        file_path, server_object = _parse_file_path(args.file_spec)
        file_dir = str(file_path.parent)
        if file_dir not in sys.path:
            sys.path.insert(0, file_dir)

        server = _import_server(file_path, server_object)
        package = get_github_url(file_path)

        # Register and preserve existing record
        ctx = register_mcp_server_with_atproto(
            server,
            name=server.name,
            package=package,
            description=server.__doc__,
            version=args.version,
            raise_on_error=True,  # CLI should always require credentials
        )
        ctx.__enter__()
        if not ctx.registered:
            logger.error("Failed to register server with ATProto")
            sys.exit(1)
        logger.info(f"Successfully registered {server.name} with ATProto")
    except ValueError as e:
        logger.error(f"Cannot register server: {str(e)}")
        sys.exit(1)
    except Exception as e:
        logger.error(str(e))
        sys.exit(1)


if __name__ == "__main__":
    main()
