import { BskyAgent } from "@atproto/api";
import { MCPServerConfig } from "./client.js";

const NSID = "app.mcp.server";

interface MCPServerRecord {
  name: string;
  package: string;
  description?: string;
  version?: string;
  createdAt: string;
}

export async function registerServerWithATProto(
  agent: BskyAgent,
  config: MCPServerConfig
): Promise<void> {
  if (!agent.session) {
    throw new Error("ATProto agent must be authenticated");
  }

  // Get existing records
  const { data: records } = await agent.api.com.atproto.repo.listRecords({
    repo: agent.session.did,
    collection: NSID,
  });

  // Check for existing record with same name
  const existingRecord = records.records.find(
    (record) => (record.value as MCPServerRecord).name === config.name
  );

  const recordData: MCPServerRecord = {
    name: config.name,
    package: config.package,
    description: config.description,
    version: config.version,
    createdAt: new Date().toISOString(),
  };

  if (existingRecord) {
    // Update existing record
    await agent.api.com.atproto.repo.putRecord({
      repo: agent.session.did,
      collection: NSID,
      rkey: existingRecord.uri.split("/").pop()!,
      record: recordData,
    });
  } else {
    // Create new record
    const rkey = makeValidRkey(config.package);
    await agent.api.com.atproto.repo.putRecord({
      repo: agent.session.did,
      collection: NSID,
      rkey,
      record: recordData,
    });
  }
}

function makeValidRkey(packageUrl: string): string {
  // Create a deterministic key from the package URL
  const hash = packageUrl.split("/").pop() || packageUrl;
  return hash.replace(/[^a-zA-Z0-9-]/g, "-").toLowerCase();
} 