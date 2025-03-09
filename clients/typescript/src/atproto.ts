import { BskyAgent } from "@atproto/api";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const NSID = "app.mcp.server";

interface MCPServerRecord {
  name: string;
  installation: string;
  $type: string;
  description?: string;
  version?: string;
  tools: string[];
  createdAt: string;
  lastRegisteredAt: string;
  language: string;
  publisher: {
    did: string;
    handle: string;
    verifiedDomain?: string;
  };
}

function makeValidRkey(packageUrl: string): string {
  const hash = require('crypto').createHash('sha256');
  hash.update(packageUrl);
  return hash.digest('hex').slice(0, 32);
}

export class MCPRegistrationContext {
  private server: Server;
  private name: string;
  private description?: string;
  private version: string;
  private raiseOnError: boolean;
  public registered: boolean = false;

  constructor(
    server: Server,
    options: {
      name: string;
      description?: string;
      version?: string;
      raiseOnError?: boolean;
    }
  ) {
    this.server = server;
    this.name = options.name;
    this.description = options.description;
    this.version = options.version || "1.0.0";
    this.raiseOnError = options.raiseOnError || false;
  }

  async register(): Promise<void> {
    const handle = process.env.BSKY_HANDLE;
    const password = process.env.BSKY_PASSWORD;
    const installationUrl = process.env.MCP_INSTALLATION_URL;

    if (!handle || !password) {
      const error = "BSKY_HANDLE and BSKY_PASSWORD environment variables not set. Cannot register server with ATProto without credentials.";
      if (this.raiseOnError) {
        throw new Error(error);
      } else {
        console.warn(error);
        return;
      }
    }

    if (!installationUrl) {
      const error = "MCP_INSTALLATION_URL environment variable not set. Cannot register server with ATProto without an installation URL.";
      if (this.raiseOnError) {
        throw new Error(error);
      } else {
        console.warn(error);
        return;
      }
    }

    try {
      const agent = new BskyAgent({ service: "https://bsky.social" });
      await agent.login({ identifier: handle, password });

      if (!agent.session) {
        throw new Error("Failed to authenticate with ATProto");
      }

      // Get list of tools from server's capabilities (TODO this is a private method)
      const capabilities = this.server.getCapabilities();
      const toolNames = capabilities?.tools ? Object.keys(capabilities.tools) : [];

      // Check for existing record with same package URL
      const rkey = makeValidRkey(installationUrl);
      const { data: records } = await agent.api.com.atproto.repo.listRecords({
        repo: agent.session.did,
        collection: NSID,
      });

      // Find existing record by rkey
      const existingRecord = records.records.find(
        record => record.uri.split("/").pop() === rkey
      ) as { value: MCPServerRecord } | undefined;

      const recordData: MCPServerRecord = {
        name: this.name,
        installation: installationUrl,
        $type: NSID,
        description: this.description,
        version: this.version,
        tools: toolNames,
        createdAt: existingRecord?.value?.createdAt || new Date().toISOString(),
        lastRegisteredAt: new Date().toISOString(),
        language: "typescript",
        publisher: {
          did: agent.session.did,
          handle: agent.session.handle,
          ...(agent.session.handle?.includes('.') && { verifiedDomain: agent.session.handle })
        }
      };

      if (existingRecord) {
        // Update existing record, preserving createdAt and merging metadata
        const updatedRecord = {
          ...existingRecord.value,
          ...recordData,
          // Preserve creation timestamp
          createdAt: existingRecord.value.createdAt,
          // Always update lastRegisteredAt
          lastRegisteredAt: new Date().toISOString(),
          // Merge tools arrays without duplicates
          tools: Array.from(new Set([...existingRecord.value.tools || [], ...toolNames])),
          // Update publisher info if it's the same publisher
          publisher: existingRecord.value.publisher.did === agent.session.did ? recordData.publisher : existingRecord.value.publisher
        };

        await agent.api.com.atproto.repo.putRecord({
          repo: agent.session.did,
          collection: NSID,
          rkey,
          record: updatedRecord,
        });
      } else {
        // Create new record
        await agent.api.com.atproto.repo.createRecord({
          repo: agent.session.did,
          collection: NSID,
          rkey,
          record: recordData,
        });
      }

      this.registered = true;
      console.log(`Successfully registered ${this.name} with ATProto`);
    } catch (error) {
      console.error("Failed to register with ATProto:", error);
      if (this.raiseOnError) {
        throw error;
      }
    }
  }
}

export function registerMCPServerWithATProto(
  server: Server,
  options: {
    name: string;
    installation: string;
    description?: string;
    version?: string;
    raiseOnError?: boolean;
  }
): MCPRegistrationContext {
  return new MCPRegistrationContext(server, options);
} 