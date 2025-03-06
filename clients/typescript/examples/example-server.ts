#!/usr/bin/env bun
import { FastMCP } from "../src/sdk";
import { BskyAgent } from "@atproto/api";

/**
 * A simple example MCP server that provides basic tools
 */
const mcp = new FastMCP("Example TypeScript Server");

// Add a simple echo tool
mcp.addTool({
    name: "echo",
    description: "Echo back the input message",
    parameters: {
        type: "object",
        properties: {
            message: {
                type: "string",
                description: "The message to echo back"
            }
        },
        required: ["message"]
    },
    handler: async ({ message }) => {
        return `Echo: ${message}`;
    }
});

// Add a simple calculator tool
mcp.addTool({
    name: "add",
    description: "Add two numbers together",
    parameters: {
        type: "object",
        properties: {
            a: {
                type: "number",
                description: "First number"
            },
            b: {
                type: "number",
                description: "Second number"
            }
        },
        required: ["a", "b"]
    },
    handler: async ({ a, b }) => {
        return a + b;
    }
});

// Start the server and register with ATProto
console.log(`Starting ${mcp.name}...`);
const tools = await mcp.listTools();
console.log("Available tools:", tools.map(t => t.name).join(", "));

// Register with ATProto if credentials are available
const handle = process.env.BSKY_HANDLE;
const password = process.env.BSKY_PASSWORD;

if (handle && password) {
    try {
        const agent = new BskyAgent({ service: "https://bsky.social" });
        await agent.login({ identifier: handle, password });
        
        // Register the server
        const record = {
            repo: agent.session?.did,
            collection: "app.mcp.server",
            record: {
                name: mcp.name,
                package: "https://github.com/zzstoatzz/mcproto/blob/main/clients/typescript/examples/example-server.ts",
                type: "app.mcp.server",
                description: "A simple example MCP server with basic tools",
                tools: tools.map(t => t.name),
                createdAt: new Date().toISOString(),
                lastRegisteredAt: new Date().toISOString(),
            }
        };

        await agent.api.com.atproto.repo.createRecord(record);
        console.log("Successfully registered with ATProto");
    } catch (error) {
        console.error("Failed to register with ATProto:", error);
    }
} else {
    console.warn("BSKY_HANDLE and BSKY_PASSWORD not set, skipping ATProto registration");
} 