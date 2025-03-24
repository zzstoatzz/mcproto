# MCP Server Registry

A decentralized registry for discovering MCP (Model Context Protocol) servers via AT Protocol.

## Overview

The MCP Server Registry enables:
1. Discovery of MCP servers via AT Protocol
2. Verification of server ownership through DIDs
3. Real-time status monitoring of available servers

## How It Works

### Server Discovery
MCP servers are discovered through AT Protocol records. Each server record contains:
- Name: Display name of the server
- Package: URL or package identifier for installation
- Type: Record type (app.mcp.server)
- Description: What the server does
- Tools: List of available MCP tools
- Version: Optional version number
- Last Registered: Timestamp of last registration

These records are stored in users' AT Protocol repositories under the `app.mcp.server` collection.

### Authentication & Trust
- Each server record is cryptographically signed by its publisher's DID
- Records can only be modified/deleted by their original publisher
- The registry UI shows who published each server

## Running the Registry

```bash
cd registry
bun install
HANDLE=your.handle PASSWORD=your-password bun dev
```

The registry will be available at:
- Web UI: http://localhost:3000
- API: http://localhost:3000/api/servers

## Publishing Your MCP Server

### 1. Create your server with dependencies

```python
# /// script
# dependencies = [
#   "pandas",  # your dependencies here
#   "requests>=2.0.0",
#   "package[extra]@git+https://github.com/user/repo.git"
# ]
# ///

from mcp.server.fastmcp import FastMCP

mcp = FastMCP("My Server")

@mcp.tool()
def my_tool():
    """My cool tool"""
    return "Hello!"
```

### 2. Register with ATProto

```bash
# Set your Bluesky credentials
export BSKY_HANDLE="your.handle"
export BSKY_PASSWORD="your-password"

# Register your server
uv run -m mcproto your_server.py:mcp
```

UV will automatically handle installing dependencies from your script metadata.

## Script Dependencies

Dependencies can be declared in your MCP server file using UV's script metadata:

```python
# /// script
# dependencies = [
#   "package-name",                     # from PyPI
#   "package>=1.0.0",                   # with version constraint
#   "package[extra]",                   # with extras
#   "package@git+https://..."          # from git
# ]
# ///
```

For more details on script dependencies, see [UV's documentation](https://github.com/astral-sh/uv/blob/main/docs/scripts.md).

## Development

The registry consists of:
- `server.py`: MCP server implementation with ATProto registration
- `registry/`: Web UI for browsing servers
  - `src/components/App.tsx`: Main UI components
  - `src/server/api.ts`: API endpoints for server discovery
  - `src/styles/styles.css`: UI styling

This project uses `uv` for dependency management:

```bash
cd clients/python
uv sync
```

## Contributing

This is an experimental project. Feel free to submit issues and pull requests.

## License

MIT
