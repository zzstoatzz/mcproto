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
    package: str,
    description: str | None = None,
    version: str = "1.0.0",
    raise_on_error: bool = False,
) -> None:
    """Register an MCP server with ATProto if credentials exist.

    Args:
        server: The MCP server to register
        name: Display name of the server
        package: URL or package identifier for installation
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

        # Get list of tools from server
        tools = [tool.name for tool in asyncio.run(server.list_tools())]

        # Check for existing record with same package URL
        existing_records = client.com.atproto.repo.list_records(
            params=models.ComAtprotoRepoListRecords.Params(
                repo=profile.did,
                collection="app.mcp.server",
            ),
        )

        rkey = make_valid_rkey(package)

        # Find existing record by rkey
        existing_record = None
        for record in existing_records.records:
            if record.uri.split("/")[-1] == rkey:
                existing_record = record
                break

        # Get publisher info including handle verification
        publisher_info = {
            "did": profile.did,
            "handle": profile.handle,
        }

        # If handle contains a dot, it might be a verified domain
        if "." in profile.handle:
            publisher_info["verifiedDomain"] = profile.handle

        # Extract commit SHA if GitHub URL
        commit_sha = extract_github_commit_sha(package)

        # Prepare record data
        record_content = {
            "type": "app.mcp.server",
            "name": name,
            "package": package,
            "version": version,
            "description": description,
            "tools": tools,
            "createdAt": (
                existing_record.value["createdAt"]
                if existing_record and isinstance(existing_record.value, dict)
                else datetime.now().isoformat()
            ),
            "lastRegisteredAt": datetime.now().isoformat(),
            "publisher": publisher_info,
        }

        # Only add commit SHA if available
        if commit_sha:
            record_content["commitSha"] = commit_sha

        if existing_record:
            # Update existing record
            client.com.atproto.repo.put_record(
                data=models.ComAtprotoRepoPutRecord.Data(
                    repo=profile.did,
                    collection="app.mcp.server",
                    rkey=rkey,
                    record=record_content,
                )
            )
        else:
            # Create new record with stable rkey
            client.com.atproto.repo.create_record(
                models.ComAtprotoRepoCreateRecord.Data(
                    repo=profile.did,
                    collection="app.mcp.server",
                    rkey=rkey,  # Use stable rkey
                    record=record_content,
                )
            )

    except Exception as e:
        raise RuntimeError(f"Failed to register MCP server with ATProto: {e}") from e
