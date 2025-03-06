import { exec } from "child_process";
import { promisify } from "util";
import { dirname, relative, resolve } from "path";

const execAsync = promisify(exec);

export async function getGitHubUrl(filePath: string): Promise<string> {
  try {
    // Get git root
    const { stdout: gitRoot } = await execAsync("git rev-parse --show-toplevel", {
      cwd: dirname(filePath),
    });

    try {
      // Get remote URL and current branch
      const { stdout: remote } = await execAsync(
        "git config --get remote.origin.url",
        { cwd: gitRoot.trim() }
      );
      const { stdout: branch } = await execAsync(
        "git rev-parse --abbrev-ref HEAD",
        { cwd: gitRoot.trim() }
      );

      let remoteUrl = remote.trim();
      if (remoteUrl.startsWith("git@github.com:")) {
        remoteUrl = remoteUrl.replace("git@github.com:", "https://github.com/");
      }
      if (remoteUrl.endsWith(".git")) {
        remoteUrl = remoteUrl.slice(0, -4);
      }

      if (!remoteUrl.startsWith("https://github.com/")) {
        throw new Error("Repository must be hosted on GitHub");
      }

      // Get relative path from git root
      const relPath = relative(
        resolve(gitRoot.trim()),
        resolve(filePath)
      );

      return `${remoteUrl}/blob/${branch.trim()}/${relPath}`;
    } catch (e) {
      throw new Error("No git remote configured");
    }
  } catch (e) {
    throw new Error("Not in a git repository");
  }
} 