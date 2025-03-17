"""CLI for registering MCP servers with ATProto."""

import argparse
import sys
import warnings

from mcp.cli.cli import _import_server, _parse_file_path
from mcp.server.fastmcp.utilities.logging import get_logger

from mcproto_client._git import source_url_from_file_path
from mcproto_client.atproto import register_server

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
        github_url = source_url_from_file_path(file_path)

        description = server.__doc__
        if not description:
            warnings.warn(
                f"No description found for server {server.name}, using default",
                stacklevel=2,
            )
            description = f"Non-descript MCP server {server.name}"

        register_server(
            server=server,
            name=server.name,
            installation=f"uv run {github_url}",
            description=description,
            version=args.version,
        )

        logger.info(f"Successfully registered {server.name} with ATProto")
    except ValueError as e:
        logger.error(f"Cannot register server: {str(e)}")
        sys.exit(1)
    except Exception as e:
        logger.error(str(e))
        sys.exit(1)


if __name__ == "__main__":
    main()
