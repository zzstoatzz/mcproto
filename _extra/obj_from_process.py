# /// script
# dependencies = ["cloudpickle"]
# ///

import importlib.util
import re
import subprocess
import sys
import tomllib
from pathlib import Path
from typing import Any


def parse_script_metadata(script_content: str) -> dict[str, Any] | None:
    metadata_pattern = (
        r"(?m)^# /// (?P<type>[a-zA-Z0-9-]+)$\s(?P<content>(^#(| .*)$\s)+)^# ///$"
    )
    matches = [
        match
        for match in re.finditer(metadata_pattern, script_content)
        if match.group("type") == "script"
    ]
    if not matches:
        return None

    match = matches[0]
    content_lines = match.group("content").splitlines()
    toml_content = ""
    for line in content_lines:
        if line.startswith("# "):
            toml_content += line[2:] + "\n"
        elif line == "#":
            toml_content += "\n"

    return tomllib.loads(toml_content)


def load_module(path: Path | str) -> Any:
    path = Path(path)
    spec = importlib.util.spec_from_file_location(path.stem, path)
    if not spec or not spec.loader:
        raise ImportError(f"Could not load {path}")

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


if __name__ == "__main__":
    script_path = Path("servers/fetch.py")
    metadata = parse_script_metadata(script_path.read_text())
    print(f"Script metadata: {metadata}")

    # Re-run this script with dependencies
    if metadata and "dependencies" in metadata:
        cmd = [sys.executable]  # current Python interpreter
        for dep in metadata["dependencies"]:
            cmd.extend(["--with", dep])
        cmd.append(__file__)

        result = subprocess.run(["uv", "run", *cmd[1:]], capture_output=True, text=True)
        if result.returncode != 0:
            print(f"Error installing dependencies: {result.stderr}", file=sys.stderr)
            sys.exit(1)

    module = load_module(script_path)
    print(f"Server object: {module.server}")
    print(f"Server dependencies: {module.server.dependencies}")
