# mcproto

This project aims to track a **decentralized reputation of Model Context Protocol (MCP) servers** by leveraging the Authenticated Transfer Protocol (AT Protocol).

## Overview

The project consists of three main components:

1. **Client SDKs** (`/clients`): Libraries for MCP server publishers to register their servers with ATProto
   - Python SDK for easy server registration and usage tracking
   - TypeScript SDK (work in progress)

2. **Registry UI/API** (`/registry`): Web interface and API for discovering MCP servers
   - Browse registered servers and their publishers
   - View server capabilities and reputation
   - Real-time updates via ATProto firehose

3. **Firehose Consumer** (`/_extra/docket_firehose`): Service for tracking server registrations
   - Listens to ATProto firehose for MCP server records
   - Saves records for processing and analysis
   - Background worker ready for future reputation processing

## Development

### Registry (Web UI and API)

This project uses `bun` for front-end development.

1. Navigate to the `registry` directory:
   ```bash
   cd registry
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Run in development mode (requires ATProto credentials):
   ```bash
   HANDLE=your.handle PASSWORD=your-password bun dev
   ```
   Access at:
   - Web UI: http://localhost:3000
   - API: http://localhost:3000/api/servers

### Python Client

Use `uv` for the Python toolchain:

1. Navigate to the client directory:
   ```bash
   cd clients/python
   ```

2. Install dependencies:
   ```bash
   uv sync
   ```

3. Register a server:
   ```bash
   uv run mcproto example_server.py:mcp
   ```

### Firehose Consumer

The firehose consumer tracks MCP server registrations across the ATProto network:

1. Navigate to the firehose directory:
   ```bash
   cd _extra/docket_firehose
   ```

2. Run with Docker Compose:
   ```bash
   docker compose up --build
   ```

This starts:
- A firehose listener that saves MCP server records
- A Redis streams worker service ready for future record processing via [`docket`](https://github.com/chrisguidry/docket)

## Architecture

### ATProto Integration

- MCP server publishers register using `app.mcp.server` records
- Records are cryptographically signed by publisher DIDs
- The firehose consumer tracks all registrations in real-time
- Future: Reputation tracking via ATProto's labeling system

### Data Flow

1. Publishers register servers using client SDKs
2. Records are stored on publisher's Personal Data Server (PDS)
3. Firehose consumer captures and saves registration events
4. Registry UI displays servers with real-time updates
5. Future: Background processing for reputation analysis

# Register MCP Server Action

This action registers your Model Context Protocol (MCP) server with the decentralized registry.

## Usage

```yaml
name: Register MCP Server
on:
  push:
    branches: [main]
    paths:
      - '**.py'  # or your specific MCP server path

jobs:
  register:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: zzstoatzz/register-mcp@v1
        with:
          server_path: 'path/to/servers'  # or directory containing servers
          bsky_handle: <YOUR_BLUESKY_HANDLE>
          bsky_password: ${{ secrets.BSKY_PASSWORD }}
```

## Inputs

- `server_path`: Path to your MCP server file or directory containing MCP servers
  - Required: true
  - Default: '.'

- `bsky_handle`: Your Bluesky handle
  - Required: true
  - Set this as a GitHub secret

- `bsky_password`: Your Bluesky password
  - Required: true
  - Set this as a GitHub secret

## Example: Register Multiple Servers

If you have multiple MCP servers in a directory:

```yaml
- uses: zzstoatzz/register-mcp@v1
  with:
    server_path: './servers'  # directory containing .py files with MCP servers
    bsky_handle: ${{ secrets.BSKY_HANDLE }}
    bsky_password: ${{ secrets.BSKY_PASSWORD }}
```
