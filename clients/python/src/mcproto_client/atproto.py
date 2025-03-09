"""ATProto integration for MCP server registration."""

import asyncio
import hashlib
import warnings
from datetime import datetime

from atproto import Client, models
from mcp.server.fastmcp import FastMCP

from ._git import extract_github_commit_sha
from .settings import Settings


def make_valid_rkey(package: str) -> str:
    """Create a deterministic but valid rkey from package URL."""
    return hashlib.sha256(package.encode()).hexdigest()[:32]


def register_server(
    server: FastMCP,
    *,
    name: str,
    installation: str,
    description: str | None = None,
    version: str = "1.0.0",
    raise_on_error: bool = False,
) -> None:
    """Register an MCP server with ATProto if credentials exist.

    Args:
        server: The MCP server to register
        name: Display name of the server
        installation: Command to install and run the server (e.g. "uv run script.py")
        description: Optional description of the server
        version: Server version string
        raise_on_error: If True, missing credentials will raise ValueError. If False, will warn.
    """
    settings = Settings()

    if not settings.handle or not settings.password:
        if raise_on_error:
            raise ValueError(
                "BSKY_HANDLE and BSKY_PASSWORD environment variables not set. "
                "Cannot register server with ATProto without credentials."
            )
        else:
            warnings.warn(
                "BSKY_HANDLE and BSKY_PASSWORD environment variables not set. "
                "Cannot register server with ATProto without credentials."
            )
            return

    try:
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

        # Get publisher info including handle verification
        publisher_info = {
            "did": profile.did,
            "handle": profile.handle,
        }

        # If handle contains a dot, it might be a verified domain
        if "." in profile.handle:
            publisher_info["verifiedDomain"] = profile.handle

        # Extract commit SHA if GitHub URL
        commit_sha = extract_github_commit_sha(installation)

        # Prepare base record data
        record_content = {
            "$type": "app.mcp.server",
            "name": name,
            "installation": installation,
            "version": version,
            "description": description,
            "tools": [tool.name for tool in asyncio.run(server.list_tools())],
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

    except Exception as e:
        raise RuntimeError(f"Failed to register MCP server with ATProto: {e}") from e
