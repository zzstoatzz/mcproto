"""Git utilities for package URL resolution."""

import subprocess
import urllib.parse
import warnings
from pathlib import Path

import httpx


def _run_git(args: list[str], cwd: str | Path) -> str:
    return subprocess.run(
        ["git", *args], cwd=cwd, capture_output=True, text=True, check=True
    ).stdout.strip()


def _get_github_url(file_path: Path) -> str:
    """Get the GitHub URL for a file in the current repository.

    Raises:
        ValueError: If the repository is not hosted on GitHub or no remote is configured.
    """
    try:
        git_root = _run_git(["rev-parse", "--show-toplevel"], file_path.parent)
        try:
            remote = _run_git(["config", "--get", "remote.origin.url"], git_root)
            branch = _run_git(["rev-parse", "--abbrev-ref", "HEAD"], git_root)

            if remote.startswith("git@github.com:"):
                remote = remote.replace("git@github.com:", "https://github.com/")
            if remote.endswith(".git"):
                remote = remote[:-4]
            print(f"Processed remote: {remote}")

            if not remote.startswith("https://github.com/"):
                raise ValueError("Repository must be hosted on GitHub")

            # If remote already contains a branch, use that instead of current branch
            if "@" in remote:
                remote, branch = remote.split("@")

            rel_path = file_path.resolve().relative_to(Path(git_root).resolve())
            url = f"{remote}/blob/{branch}/{rel_path}"
            return url
        except subprocess.CalledProcessError:
            raise ValueError("No git remote configured")
    except subprocess.CalledProcessError:
        raise ValueError("Not in a git repository")


def _github_to_raw_url(github_url: str) -> str:
    """
    Convert a GitHub file URL to its raw content URL.

    Args:
        github_url: A GitHub URL to a file, in the format:
                   https://github.com/{owner}/{repo}/blob/{branch}/{path}

    Returns:
        The raw content URL in the format:
        https://raw.githubusercontent.com/{owner}/{repo}/refs/heads/{branch}/{path}

    Example:
        >>> github_to_raw_url("https://github.com/zzstoatzz/mcproto/blob/main/clients/python/example_server.py")
        "https://raw.githubusercontent.com/zzstoatzz/mcproto/refs/heads/main/clients/python/example_server.py"
    """
    # Check if the URL is a valid GitHub blob URL
    if not github_url.startswith("https://github.com/") or "/blob/" not in github_url:
        raise ValueError("URL must be a valid GitHub file URL")

    # Split the URL to extract the components
    parts = github_url.split("/")
    if len(parts) < 8:
        raise ValueError("Invalid GitHub URL format")

    # Extract owner, repo, branch
    owner = parts[3]
    repo = parts[4]
    branch = parts[6]

    # Extract the file path (everything after the branch)
    path = "/".join(parts[7:])

    # Construct the raw URL
    raw_url = (
        f"https://raw.githubusercontent.com/{owner}/{repo}/refs/heads/{branch}/{path}"
    )

    return raw_url


def source_url_from_file_path(file_path: Path) -> str:
    """Get the source URL for a file in the current repository."""
    github_url = _get_github_url(Path(file_path))
    return _github_to_raw_url(github_url)


def extract_github_commit_sha(package_url: str) -> str | None:
    """Extract commit SHA from GitHub URL or fetch latest if on main/master."""
    try:
        parsed = urllib.parse.urlparse(package_url)
        if not parsed.hostname or "github.com" not in parsed.hostname:
            return None

        # Extract owner/repo from path
        path_parts = [p for p in parsed.path.split("/") if p]
        if len(path_parts) < 2:
            return None

        owner, repo = path_parts[0:2]

        # If URL contains commit/tree/blob, extract SHA
        if len(path_parts) > 4 and path_parts[2] in ("commit", "tree", "blob"):
            return path_parts[3]

        # Otherwise fetch latest commit from default branch
        api_url = f"https://api.github.com/repos/{owner}/{repo}/commits/HEAD"
        response = httpx.get(api_url)
        if response.status_code == 200:
            return response.json()["sha"]

    except Exception as e:
        warnings.warn(f"Failed to extract/fetch commit SHA: {e}")
    return None
