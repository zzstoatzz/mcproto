#!/usr/bin/env bun
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ListToolsRequestSchema, CallToolRequestSchema, ToolSchema } from "@modelcontextprotocol/sdk/types.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerMCPServerWithATProto } from "../src/atproto";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

// Schema definitions
const EchoArgsSchema = z.object({
  message: z.string().describe("Message to echo back"),
});

const AddArgsSchema = z.object({
  a: z.number().describe("First number"),
  b: z.number().describe("Second number"),
});

const ToolInputSchema = ToolSchema.shape.inputSchema;
type ToolInput = z.infer<typeof ToolInputSchema>;

// Server setup
const server = new Server(
  {
    name: "example-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "echo",
        description: "Echoes back the input message",
        inputSchema: zodToJsonSchema(EchoArgsSchema) as ToolInput,
      },
      {
        name: "add",
        description: "Adds two numbers together",
        inputSchema: zodToJsonSchema(AddArgsSchema) as ToolInput,
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    switch (name) {
      case "echo": {
        const parsed = EchoArgsSchema.safeParse(args);
        if (!parsed.success) {
          throw new Error(`Invalid arguments for echo: ${parsed.error}`);
        }
        return {
          content: [{ type: "text", text: `Echo: ${parsed.data.message}` }],
        };
      }

      case "add": {
        const parsed = AddArgsSchema.safeParse(args);
        if (!parsed.success) {
          throw new Error(`Invalid arguments for add: ${parsed.error}`);
        }
        const sum = parsed.data.a + parsed.data.b;
        return {
          content: [{ type: "text", text: `The sum of ${parsed.data.a} and ${parsed.data.b} is ${sum}` }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error: ${errorMessage}` }],
      isError: true,
    };
  }
});

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP Example Server running on stdio");

  const registration = registerMCPServerWithATProto(server, {
    name: "Typescript Example Server",
    description: "An example Typescript MCP server (sample)",
    installation: "bun run https://github.com/zzstoatzz/mcproto/blob/main/clients/typescript/examples/example-server.ts",
    version: "0.0.1",
  });

  await registration.register();
  if (!registration.registered) {
    console.warn("Failed to register with ATProto");
  }

  process.on("SIGINT", async () => {
    await server.close();
    process.exit(0);
  });
}

// Run server
runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
}); 