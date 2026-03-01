/**
 * Ambient Context MCP Server - STDIO Transport
 *
 * Your persistent knowledge companion that follows you across all Claude sessions.
 * Automatically captures research, architecture decisions, and work context.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { handleToolCall, getToolDefinitions } from "./tools/index.js";
import { regenerateToc } from "./utils/toc.js";

async function main() {
  // Generate TOC on startup
  await regenerateToc();

  const server = new Server(
    {
      name: "ambient-context",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register tool list handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: getToolDefinitions() };
  });

  // Register tool call handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    return handleToolCall(name, args || {});
  });

  // Connect via STDIO
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Failed to start STDIO server:", err);
  process.exit(1);
});
