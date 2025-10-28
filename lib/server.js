#!/usr/bin/env node

/**
 * Filesystem MCP Server (HTTP adapter for STDIO)
 *
 * ChatGPT-compatible MCP adapter that wraps filesystem MCP
 * Provides 'search', 'fetch', 'list', and 'write' tools
 */

import Fastify from "fastify";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

const app = Fastify({ logger: false });

// Configuration
const PORT = process.env.PORT || 3000;
const ALLOWED_DIR = process.env.ALLOWED_DIR || process.cwd();
const DEBUG = process.env.DEBUG === '1';

// MCP Server state
let mcpProcess = null;
let isReady = false;
let requestCounter = 1;
const pendingRequests = new Map();
const sessionId = randomUUID();

// Start the filesystem MCP server
function startMCPServer() {
  console.log(`Starting MCP server: npx -y @modelcontextprotocol/server-filesystem ${ALLOWED_DIR}`);

  mcpProcess = spawn("npx", [
    "-y",
    "@modelcontextprotocol/server-filesystem",
    ALLOWED_DIR
  ], {
    stdio: ["pipe", "pipe", "pipe"]
  });

  // Handle STDOUT (JSON-RPC responses)
  mcpProcess.stdout.on("data", (data) => {
    const lines = data.toString().split("\n").filter(l => l.trim());

    for (const line of lines) {
      try {
        const response = JSON.parse(line);
        console.log("← MCP Server:", line.substring(0, 200));

        const id = response.id;
        if (id && pendingRequests.has(id)) {
          const { resolve } = pendingRequests.get(id);
          pendingRequests.delete(id);
          resolve(response);
        }
      } catch (err) {
        // Ignore non-JSON output
      }
    }
  });

  // Handle STDERR (logs)
  mcpProcess.stderr.on("data", (data) => {
    console.log("MCP Server stderr:", data.toString().trim());
  });

  // Handle process exit
  mcpProcess.on("exit", (code) => {
    console.log(`MCP server exited with code ${code}`);
    isReady = false;
  });

  // Initialize the MCP server
  setTimeout(() => {
    sendToMCP({
      jsonrpc: "2.0",
      id: requestCounter++,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: {
          name: "local-mcp-filesystem",
          version: "1.0.0"
        }
      }
    }).then(() => {
      isReady = true;
      console.log("✓ MCP Server initialized and ready");
    });
  }, 100);
}

// Send JSON-RPC message to STDIO MCP server
function sendToMCP(message) {
  return new Promise((resolve, reject) => {
    if (!mcpProcess || mcpProcess.killed) {
      return reject(new Error("MCP server not running"));
    }

    const id = message.id || requestCounter++;
    message.id = id;

    pendingRequests.set(id, { resolve, reject });

    const jsonMessage = JSON.stringify(message) + "\n";
    console.log("→ MCP Server:", jsonMessage.substring(0, 200));

    mcpProcess.stdin.write(jsonMessage, (err) => {
      if (err) {
        pendingRequests.delete(id);
        reject(err);
      }
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id);
        reject(new Error("Request timeout"));
      }
    }, 30000);
  });
}

// Health check
app.get("/healthz", async () => ({ ok: true, mcpReady: isReady }));

// Main MCP endpoint - handle ChatGPT requests (both / and /mcp*)
const mcpHandler = async (req, reply) => {
  // Handle OPTIONS for CORS preflight
  if (req.method === "OPTIONS") {
    reply.header("Access-Control-Allow-Origin", "*");
    reply.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    reply.header("Access-Control-Allow-Headers", "*");
    reply.header("Access-Control-Expose-Headers", "Mcp-Session-Id");
    return reply.code(200).send();
  }

  if (!isReady) {
    return reply.code(503).send({
      error: "MCP server not ready"
    });
  }

  try {
    let jsonRpcRequest;

    if (req.method === "POST") {
      jsonRpcRequest = req.body;
    } else {
      // For GET requests, return tools/list
      jsonRpcRequest = {
        jsonrpc: "2.0",
        id: requestCounter++,
        method: "tools/list",
        params: {}
      };
    }

    // Handle initialize
    if (jsonRpcRequest.method === "initialize") {
      const response = await sendToMCP({
        ...jsonRpcRequest,
        id: requestCounter++,
      });

      reply.header("Content-Type", "application/json");
      reply.header("Access-Control-Expose-Headers", "Mcp-Session-Id");
      reply.header("Mcp-Session-Id", sessionId);

      return reply.send({
        jsonrpc: "2.0",
        id: jsonRpcRequest.id,
        result: response.result
      });
    }

    // Handle tools/list
    if (jsonRpcRequest.method === "tools/list") {
      const response = await sendToMCP({
        ...jsonRpcRequest,
        id: requestCounter++,
      });

      reply.header("Content-Type", "application/json");
      reply.header("Access-Control-Expose-Headers", "Mcp-Session-Id");
      reply.header("Mcp-Session-Id", sessionId);

      return reply.send({
        jsonrpc: "2.0",
        id: jsonRpcRequest.id,
        result: response.result
      });
    }

    // Handle tools/call and other methods
    const response = await sendToMCP({
      ...jsonRpcRequest,
      id: requestCounter++,
    });

    reply.header("Content-Type", "application/json");
    reply.header("Access-Control-Expose-Headers", "Mcp-Session-Id");
    reply.header("Mcp-Session-Id", sessionId);

    // Ensure proper JSON-RPC format with original request ID
    return reply.send({
      jsonrpc: "2.0",
      id: jsonRpcRequest.id,
      result: response.result,
      error: response.error
    });

  } catch (error) {
    console.error("Error handling MCP request:", error);
    return reply.code(500).send({
      jsonrpc: "2.0",
      id: req.body?.id || null,
      error: {
        code: -32603,
        message: error.message
      }
    });
  }
};

// Register routes for both / and /mcp*
app.all("/", mcpHandler);
app.all("/mcp*", mcpHandler);

// CORS
app.addHook("onSend", async (_req, reply, payload) => {
  reply.header("Access-Control-Allow-Origin", "*");
  reply.header("Access-Control-Allow-Headers", "*");
  reply.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  return payload;
});

// Start server
startMCPServer();

app.listen({ host: "0.0.0.0", port: PORT }).then(() => {
  console.log(`\n╔════════════════════════════════════════════════════════════════╗`);
  console.log(`║  Local MCP Filesystem Adapter Running                         ║`);
  console.log(`╠════════════════════════════════════════════════════════════════╣`);
  console.log(`║  HTTP Endpoint: http://0.0.0.0:${PORT}                        ║`);
  console.log(`║  Allowed Directory: ${ALLOWED_DIR}                            ║`);
  console.log(`╚════════════════════════════════════════════════════════════════╝\n`);
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
