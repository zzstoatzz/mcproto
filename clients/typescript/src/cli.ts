#!/usr/bin/env bun

import { BskyAgent } from "@atproto/api";
import { Command } from "commander";
import { MCPClient, MCPServerConfig } from "./client.js";
import { registerServerWithATProto } from "./atproto.js";
import { findMCPServers } from "./discovery.js";
import { getGitHubUrl } from "./git.js";

const program = new Command();

interface RegisterOptions {
  name?: string;
  package?: string;
  description?: string;
  version?: string;
  handle?: string;
  password?: string;
}

program
  .name("mcproto")
  .description("CLI for registering MCP servers with ATProto")
  .version("0.1.0");

program
  .command("register [file]")
  .description("Register an MCP server with ATProto")
  .option("-n, --name <name>", "Server name")
  .option("-p, --package <package>", "Package URL")
  .option("-d, --description <description>", "Server description")
  .option("-v, --version <version>", "Server version")
  .option("--handle <handle>", "ATProto handle (or use BSKY_HANDLE env var)")
  .option("--password <password>", "ATProto password (or use BSKY_PASSWORD env var)")
  .action(async (file: string | undefined, options: RegisterOptions) => {
    try {
      // If no file specified, try to discover servers in current directory
      if (!file) {
        const servers = await findMCPServers(".");
        if (servers.length === 0) {
          console.error("No MCP servers found in current directory");
          process.exit(1);
        }
        // Register all found servers
        for (const server of servers) {
          await registerServer(server.file, {
            name: server.name,
            package: await getGitHubUrl(server.file),
            description: server.description,
            version: options.version || "0.0.1",
            handle: options.handle || process.env.BSKY_HANDLE,
            password: options.password || process.env.BSKY_PASSWORD,
          });
        }
        return;
      }

      // Register specific file
      await registerServer(file, options);
    } catch (error) {
      console.error("Error:", error);
      process.exit(1);
    }
  });

async function registerServer(file: string, options: RegisterOptions) {
  const handle = options.handle || process.env.BSKY_HANDLE;
  const password = options.password || process.env.BSKY_PASSWORD;

  if (!handle || !password) {
    console.error("ATProto credentials required. Set BSKY_HANDLE and BSKY_PASSWORD or use --handle and --password");
    process.exit(1);
  }

  const agent = new BskyAgent({ service: "https://bsky.social" });
  await agent.login({ identifier: handle, password });

  const config: MCPServerConfig = {
    name: options.name || "MCP Server",
    package: options.package || await getGitHubUrl(file),
    description: options.description,
    version: options.version || "0.0.1",
  };

  await registerServerWithATProto(agent, config);
  console.log("Server registered successfully");
}

program.parse(); 