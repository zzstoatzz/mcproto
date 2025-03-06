import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

export interface MCPServerConfig {
  name: string;
  package: string;
  description?: string;
  version?: string;
}

export class MCPClient {
  private client: Client;
  private transport: StdioClientTransport;

  constructor() {
    this.transport = new StdioClientTransport();
    this.client = new Client(this.transport);
  }

  async connect(): Promise<void> {
    await this.client.connect();
  }

  async disconnect(): Promise<void> {
    await this.client.disconnect();
  }

  async listTools(): Promise<Tool[]> {
    const response = await this.client.request({
      method: "tools/list",
      params: {},
    });
    return response.tools;
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    return await this.client.request({
      method: "tools/call",
      params: {
        name,
        arguments: args,
      },
    });
  }

  async registerServer(config: MCPServerConfig): Promise<void> {
    // TODO: Implement ATProto registration
    console.log("Registering server:", config);
  }
} 