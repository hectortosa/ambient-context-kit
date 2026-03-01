/**
 * Ambient Context MCP Server - HTTP Transport
 *
 * Your persistent knowledge companion accessible from anywhere.
 * Supports both SSE and Streamable HTTP transports.
 * Auth can be disabled with NO_AUTH=true for Tailscale/local use.
 */

import { handleToolCall, getToolDefinitions } from "./tools/index.js";
import {
  validateAuthFromRequest,
  isOAuthEnabled,
  getOAuthConfig,
  type AuthResult,
} from "./auth.js";
import { generateOAuthMetadata, hasRequiredScopes } from "./oauth-config.js";
import { regenerateToc } from "./utils/toc.js";
import { handleWebRequest } from "./web.js";
import { isQmdAvailable, qmdUpdate } from "./utils/qmd.js";
import {
  startScheduler,
  getSchedulerStatus,
  setSchedulerEnabled,
  triggerWorkflow,
} from "./scheduler.js";

const PORT = parseInt(process.env.MCP_SERVER_PORT || "9000");
const AUTH_DISABLED = process.env.NO_AUTH === "true";

async function getTailscaleIP(): Promise<string | null> {
  const candidates = [
    "/Applications/Tailscale.app/Contents/MacOS/Tailscale",
    "tailscale",
  ];
  for (const bin of candidates) {
    try {
      const proc = Bun.spawn([bin, "ip", "-4"], {
        stdout: "pipe",
        stderr: "pipe",
      });
      const output = await new Response(proc.stdout).text();
      const code = await proc.exited;
      if (code === 0 && output.trim()) return output.trim();
    } catch {}
  }
  return null;
}

// CORS headers for cross-origin requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Cache-Control",
};

// Store for SSE sessions
const sseSessions = new Map<string, {
  write: (data: string) => void;
  close: () => void;
}>();

/**
 * Handle MCP JSON-RPC requests
 */
async function handleMcpRequest(body: unknown): Promise<unknown> {
  const request = body as { jsonrpc?: string; id?: number | string; method?: string; params?: Record<string, unknown> };

  const id = request.id;
  const method = request.method;
  const params = request.params || {};

  try {
    let result: unknown;

    switch (method) {
      case "initialize":
        result = {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: "ambient-context-mcp",
            version: "1.0.0",
          },
        };
        break;

      case "notifications/initialized":
        return null;

      case "tools/list":
        result = { tools: getToolDefinitions() };
        break;

      case "tools/call":
        const toolName = params.name as string;
        const toolArgs = (params.arguments || {}) as Record<string, unknown>;
        result = await handleToolCall(toolName, toolArgs);
        break;

      case "ping":
        result = {};
        break;

      default:
        return {
          jsonrpc: "2.0",
          id,
          error: {
            code: -32601,
            message: `Method not found: ${method}`,
          },
        };
    }

    if (id !== undefined) {
      return {
        jsonrpc: "2.0",
        id,
        result,
      };
    }
    return null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      jsonrpc: "2.0",
      id,
      error: {
        code: -32603,
        message,
      },
    };
  }
}

/**
 * Handle OAuth metadata discovery endpoint
 * GET /.well-known/oauth-authorization-server
 * GET /.well-known/openid-configuration
 */
function handleOAuthMetadata(req: Request): Response {
  const config = getOAuthConfig();

  if (!config) {
    return new Response(
      JSON.stringify({ error: "OAuth not configured" }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Determine the server URL from the request
  const url = new URL(req.url);
  const serverUrl = `${url.protocol}//${url.host}`;

  const metadata = generateOAuthMetadata(config, serverUrl);

  return new Response(JSON.stringify(metadata, null, 2), {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

/**
 * Handle Protected Resource Metadata endpoint
 * GET /.well-known/oauth-protected-resource (RFC 9728)
 */
function handleProtectedResourceMetadata(req: Request): Response {
  const config = getOAuthConfig();

  if (!config) {
    return new Response(
      JSON.stringify({ error: "OAuth not configured" }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const metadata = {
    // Use Auth0 API audience so Claude.ai knows what audience to request
    // This ensures Auth0 returns a 3-part JWT instead of a 5-part opaque token
    resource: config.audience,
    authorization_servers: [config.issuer],
    scopes_supported: config.supportedScopes,
    bearer_methods_supported: ["header"],
    resource_documentation: "https://github.com/ambient-context/vault-mcp",
  };

  return new Response(JSON.stringify(metadata, null, 2), {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

/**
 * Format an MCP request for logging
 */
function formatMcpOperation(request: { method?: string; params?: Record<string, unknown> }): string {
  const method = request.method || "unknown";
  if (method === "tools/call") {
    const toolName = request.params?.name || "unknown";
    return `tools/call → ${toolName}`;
  }
  return method;
}

/**
 * Streamable HTTP transport handler
 * POST /mcp - handles JSON-RPC requests with streaming response
 */
async function handleStreamableHttp(req: Request): Promise<Response> {
  try {
    const body = await req.json();

    // Handle single request or batch
    const isBatch = Array.isArray(body);
    const requests = isBatch ? body : [body];
    const responses: unknown[] = [];

    // Log operations being invoked
    const ops = requests.map((r: { method?: string; params?: Record<string, unknown> }) => formatMcpOperation(r));
    console.error(`  → Operations: ${ops.join(", ")}`);

    for (const request of requests) {
      const response = await handleMcpRequest(request);
      if (response !== null) {
        responses.push(response);
      }
    }

    // Return appropriate response
    if (responses.length === 0) {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const result = isBatch ? responses : responses[0];
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        error: { code: -32700, message: `Parse error: ${message}` },
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}

/**
 * SSE connection handler
 */
function handleSSE(req: Request): Response {
  const sessionId = crypto.randomUUID();
  const encoder = new TextEncoder();

  let streamController: ReadableStreamDefaultController<Uint8Array> | null = null;
  let pingInterval: ReturnType<typeof setInterval> | null = null;
  let isClosed = false;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      streamController = controller;

      sseSessions.set(sessionId, {
        write: (data: string) => {
          if (!isClosed && streamController) {
            try {
              streamController.enqueue(encoder.encode(data));
            } catch (e) {
              console.error(`Failed to write to session ${sessionId}:`, e);
            }
          }
        },
        close: () => {
          if (!isClosed) {
            isClosed = true;
            if (pingInterval) clearInterval(pingInterval);
            sseSessions.delete(sessionId);
            try { controller.close(); } catch {}
          }
        },
      });

      // Send initial endpoint event
      const endpointUrl = `/message?sessionId=${sessionId}`;
      controller.enqueue(encoder.encode(`event: endpoint\ndata: ${endpointUrl}\n\n`));

      // Keep alive
      pingInterval = setInterval(() => {
        if (!isClosed && streamController) {
          try {
            streamController.enqueue(encoder.encode(`: keepalive\n\n`));
          } catch {
            if (pingInterval) clearInterval(pingInterval);
            sseSessions.delete(sessionId);
            isClosed = true;
          }
        }
      }, 15000);
    },
    cancel() {
      isClosed = true;
      if (pingInterval) clearInterval(pingInterval);
      sseSessions.delete(sessionId);
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

/**
 * Handle message POST for SSE sessions
 */
async function handleMessage(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("sessionId");

  if (!sessionId) {
    return new Response(JSON.stringify({ error: "Missing sessionId" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const session = sseSessions.get(sessionId);
  if (!session) {
    return new Response(JSON.stringify({ error: "Session not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const response = await handleMcpRequest(body);

    if (response !== null) {
      const sseMessage = `event: message\ndata: ${JSON.stringify(response)}\n\n`;
      session.write(sseMessage);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 202,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

/**
 * Build WWW-Authenticate header for 401 responses
 */
function buildWwwAuthenticate(): string {
  const config = getOAuthConfig();
  if (config) {
    return `Bearer realm="vault-mcp", authorization_uri="${config.authorizationEndpoint}"`;
  }
  return `Bearer realm="vault-mcp"`;
}

/**
 * HTTP request handler
 */
async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);

  // Log all incoming requests for debugging
  const authHeader = req.headers.get("Authorization");
  const authPreview = authHeader
    ? `${authHeader.substring(0, 20)}...`
    : "(none)";

  // Try to get original client info (forwarded through tunnel)
  const forwardedFor = req.headers.get("X-Forwarded-For");
  const clientIp = req.headers.get("X-MS-Client-IP") || req.headers.get("X-Real-IP");
  const userAgent = req.headers.get("User-Agent");
  const originInfo = forwardedFor || clientIp || "(direct)";

  console.error(
    `[${new Date().toISOString()}] ${req.method} ${url.pathname} | Auth: ${authPreview}`
  );
  console.error(`  → Origin: ${originInfo} | UA: ${userAgent?.substring(0, 50) || "(none)"}`);


  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    console.error(`  → 204 CORS preflight`);
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Health check (no auth required)
  if (url.pathname === "/health") {
    return new Response(
      JSON.stringify({
        status: "ok",
        sessions: sseSessions.size,
        auth_disabled: AUTH_DISABLED,
        oauth_enabled: !AUTH_DISABLED && isOAuthEnabled(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Scheduler API (requires auth when auth is enabled)
  if (url.pathname === "/api/scheduler") {
    if (!AUTH_DISABLED) {
      const authResult = await validateAuthFromRequest(req);
      if (!authResult.valid) {
        return new Response(
          JSON.stringify({ error: "unauthorized", error_description: authResult.error }),
          {
            status: 401,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
              "WWW-Authenticate": buildWwwAuthenticate(),
            },
          }
        );
      }
    }
    if (req.method === "GET") {
      return new Response(JSON.stringify(getSchedulerStatus(), null, 2), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (req.method === "POST") {
      const body = (await req.json()) as Record<string, unknown>;
      if (body.action === "enable") {
        setSchedulerEnabled(true);
        return new Response(JSON.stringify({ ok: true, enabled: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (body.action === "disable") {
        setSchedulerEnabled(false);
        return new Response(JSON.stringify({ ok: true, enabled: false }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (body.action === "trigger" && typeof body.workflow === "string") {
        const result = await triggerWorkflow(body.workflow);
        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(
        JSON.stringify({ error: "Invalid action. Use: enable, disable, trigger" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  // Web UI (no MCP auth required - serves vault browser)
  if (url.pathname === "/" || url.pathname.startsWith("/api/")) {
    const webResponse = await handleWebRequest(req);
    if (webResponse) return webResponse;
  }

  // OAuth metadata endpoints (no auth required, skipped when auth disabled)
  if (!AUTH_DISABLED) {
    if (
      url.pathname === "/.well-known/oauth-authorization-server" ||
      url.pathname === "/.well-known/openid-configuration"
    ) {
      return handleOAuthMetadata(req);
    }

    if (url.pathname === "/.well-known/oauth-protected-resource") {
      return handleProtectedResourceMetadata(req);
    }
  }

  // HEAD request for MCP protocol version (no auth, for discovery)
  if (url.pathname === "/mcp" && req.method === "HEAD") {
    return new Response(null, {
      status: 200,
      headers: {
        ...corsHeaders,
        "MCP-Protocol-Version": "2024-11-05",
      },
    });
  }

  // Validate auth unless disabled (e.g. Tailscale/local network)
  if (!AUTH_DISABLED) {
    const authResult = await validateAuthFromRequest(req);
    console.error(
      `  → Auth result: valid=${authResult.valid}, method=${authResult.authMethod || "none"}, error=${authResult.error || "none"}`
    );
    if (!authResult.valid) {
      console.error(`  → 401 Unauthorized`);
      return new Response(
        JSON.stringify({
          error: "unauthorized",
          error_description: authResult.error,
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "WWW-Authenticate": buildWwwAuthenticate(),
          },
        }
      );
    }
  }

  // Streamable HTTP transport (recommended for claude.ai)
  if (url.pathname === "/mcp" && req.method === "POST") {
    return handleStreamableHttp(req);
  }

  // SSE transport (legacy)
  if (url.pathname === "/sse" && req.method === "GET") {
    return handleSSE(req);
  }

  // SSE message endpoint
  if (url.pathname === "/message" && req.method === "POST") {
    return handleMessage(req);
  }

  // 404
  return new Response(JSON.stringify({ error: "Not found" }), {
    status: 404,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Main entry point
 */
async function main() {
  console.error("Generating vault TOC...");
  await regenerateToc();
  console.error("TOC generated");

  // Re-index qmd in background (non-blocking)
  isQmdAvailable().then((available) => {
    if (available) {
      console.error("Updating qmd index...");
      qmdUpdate()
        .then(() => console.error("qmd index updated"))
        .catch((err) => console.error("qmd index update failed:", err));
    } else {
      console.error("qmd not available, search will use brute-force fallback");
    }
  });

  // Start workflow scheduler
  startScheduler();

  // Always listen on localhost
  Bun.serve({
    port: PORT,
    hostname: "127.0.0.1",
    fetch: handleRequest,
    idleTimeout: 255,
  });

  // Also listen on Tailscale interface if available
  const tailscaleIP = await getTailscaleIP();
  if (tailscaleIP) {
    Bun.serve({
      port: PORT,
      hostname: tailscaleIP,
      fetch: handleRequest,
      idleTimeout: 255,
    });
    console.error(`Ambient Context MCP Server running on:`);
    console.error(`  http://127.0.0.1:${PORT} (local)`);
    console.error(`  http://${tailscaleIP}:${PORT} (tailscale)`);
  } else {
    console.error(`Ambient Context MCP Server running at http://127.0.0.1:${PORT}`);
    console.error("  (Tailscale not available - localhost only)");
  }
  console.error("");
  console.error("Endpoints:");
  console.error(`  GET  /                                    - Vault browser (web UI)`);
  console.error(`  GET  /health                              - Health check`);
  console.error(`  HEAD /mcp                                 - Protocol version`);
  console.error(`  POST /mcp                                 - Streamable HTTP (for claude.ai)`);
  console.error(`  GET  /sse                                 - SSE transport (legacy)`);
  console.error(`  POST /message                             - SSE messages`);
  console.error(`  GET  /api/scheduler                       - Scheduler status`);
  console.error(`  POST /api/scheduler                       - Scheduler control (enable/disable/trigger)`);
  console.error("");
  if (AUTH_DISABLED) {
    console.error("Auth: DISABLED (relying on network-level security)");
  } else {
    console.error("OAuth Discovery:");
    console.error(`  GET  /.well-known/oauth-authorization-server`);
    console.error(`  GET  /.well-known/openid-configuration`);
    console.error(`  GET  /.well-known/oauth-protected-resource`);
    console.error("");
    if (isOAuthEnabled()) {
      const config = getOAuthConfig();
      console.error(`Auth: OAuth 2.1 (Auth0: ${config?.domain})`);
      if (config?.allowApiKeyFallback) {
        console.error("      + API key fallback enabled");
      }
    } else {
      console.error("Auth: API key only (OAuth not configured)");
    }
  }
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
