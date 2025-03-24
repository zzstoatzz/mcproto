"""ATProto integration for MCP server registration."""

import asyncio
import hashlib
from datetime import datetime
from typing import Any

from atproto import Client, models
from mcp.server.fastmcp.server import FastMCP
from mcp.server.lowlevel.server import Server

from ._git import extract_github_commit_sha
from .settings import Settings


def make_valid_rkey(package: str) -> str:
    """Create a deterministic but valid rkey from package URL."""
    return hashlib.sha256(package.encode()).hexdigest()[:32]


def register_server(
    *,
    server: Server[Any],
    installation: str,
    description: str | None = None,
    version: str = "0.0.1",
    bsky_handle: str | None = None,
    bsky_password: str | None = None,
) -> None:
    """Register an MCP server with ATProto if credentials exist.

    Args:
        name: Display name of the server
        tools: List of tool names available in the server
        installation: Command to install and run the server (e.g. "uv run script.py")
        description: Optional description of the server
        version: Server version string
        bsky_handle: Bluesky handle for authentication
        bsky_password: Bluesky password for authentication
    """
    provided_options: dict[str, Any] = {}
    if bsky_handle:
        provided_options["handle"] = bsky_handle
    if bsky_password:
        provided_options["password"] = bsky_password

    settings = Settings(**provided_options)

    client = Client()
    profile = client.login(settings.handle, settings.password)

    rkey = make_valid_rkey(installation)

    # Try to get existing record to preserve createdAt
    created_at = datetime.now().isoformat()
    try:
        existing_records = client.com.atproto.repo.list_records(
            params=models.ComAtprotoRepoListRecords.Params(
                repo=profile.did,
                collection="app.mcp.server",
            ),
        )
        for record in existing_records.records:
            if record.uri.split("/")[-1] == rkey and isinstance(record.value, dict):
                created_at = record.value.get("createdAt", created_at)
                break
    except Exception:
        # If we can't read records, just use current time for createdAt
        pass

    publisher_info = {
        "did": profile.did,
        "handle": profile.handle,
    }

    if "." in profile.handle:
        publisher_info["verifiedDomain"] = profile.handle

    commit_sha = extract_github_commit_sha(installation)

    # Prepare base record data
    if isinstance(server, FastMCP):
        tools = asyncio.run(server.list_tools())
    else:
        tools = []  # TODO: get tool names from low-level server

    breakpoint()
    record_content = {
        "$type": "app.mcp.server",
        "name": server.name,
        "installation": installation,
        "version": version,
        "description": description,
        "tools": tools,
        "createdAt": created_at,
        "lastRegisteredAt": datetime.now().isoformat(),
        "publisher": publisher_info,
        "language": "python",
    }

    # Only add commit SHA if available
    if commit_sha:
        record_content["commitSha"] = commit_sha

    try:
        # Try to update existing record first
        client.com.atproto.repo.put_record(
            models.ComAtprotoRepoPutRecord.Data(
                repo=profile.did,
                collection="app.mcp.server",
                rkey=rkey,
                record=record_content,
            )
        )
    except Exception as put_error:
        # If update fails, try to create new record
        try:
            print(f"Creating record: {record_content}")
            client.com.atproto.repo.create_record(
                models.ComAtprotoRepoCreateRecord.Data(
                    repo=profile.did,
                    collection="app.mcp.server",
                    rkey=rkey,
                    record=record_content,
                )
            )
        except Exception as create_error:
            raise RuntimeError(
                f"Failed to update or create record: Update error: {put_error}, Create error: {create_error}"
            )
