#!/usr/bin/env bun

import { BskyAgent } from "@atproto/api";
import { Command } from "commander";
import { MCPClient, MCPServerConfig } from "./client.js";
import { registerServerWithATProto } from "./atproto.js";

interface RegisterOptions {
  name: string;
  package: string;
  description?: string;
  version?: string;
  handle?: string;
  password?: string;
}

const program = new Command();

program
  .name("mcp-client")
  .description("CLI for interacting with MCP servers")
  .version("1.0.0");

program
  .command("register")
  .description("Register an MCP server with ATProto")
  .requiredOption("--name <name>", "Server name")
  .requiredOption("--package <package>", "Package URL")
  .option("--description <description>", "Server description")
  .option("--version <version>", "Server version")
  .option("--handle <handle>", "ATProto handle")
  .option("--password <password>", "ATProto password")
  .action(async (options: RegisterOptions) => {
    try {
      const config: MCPServerConfig = {
        name: options.name,
        package: options.package,
        description: options.description,
        version: options.version,
      };

      if (options.handle && options.password) {
        const agent = new BskyAgent({ service: "https://bsky.social" });
        await agent.login({
          identifier: options.handle,
          password: options.password,
        });
        await registerServerWithATProto(agent, config);
        console.log("Server registered successfully");
      } else {
        console.warn("ATProto credentials not provided, skipping registration");
      }
    } catch (error) {
      console.error("Error:", error);
      process.exit(1);
    }
  });

program
  .command("list-tools")
  .description("List available tools from an MCP server")
  .action(async () => {
    try {
      const client = new MCPClient();
      await client.connect();
      const tools = await client.listTools();
      console.log(JSON.stringify(tools, null, 2));
      await client.disconnect();
    } catch (error) {
      console.error("Error:", error);
      process.exit(1);
    }
  });

program.parse(); 