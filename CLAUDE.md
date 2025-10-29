# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`local-mcp-filesystem` is a Node.js CLI tool that bridges ChatGPT to local filesystems via the Model Context Protocol (MCP). It wraps the STDIO-based `@modelcontextprotocol/server-filesystem` and exposes it over HTTP/HTTPS for ChatGPT Developer Mode compatibility.

**One command starts everything**: filesystem adapter + Cloudflare tunnel → returns HTTPS URL for ChatGPT.

## Development Commands

```bash
# Run locally (from project root)
npm start

# Run with verbose logging
npm run dev

# Run via npx (as end users would)
npx local-mcp-filesystem
npx local-mcp-filesystem --dir ~/Documents --port 3001

# Test the CLI with custom options
node bin/cli.js --dev --dir /tmp
```

### Testing the HTTP Adapter Directly

```bash
# Start just the adapter (without tunnel)
PORT=3000 ALLOWED_DIR=/tmp DEBUG=1 node lib/server.js

# Test health check
curl http://localhost:3000/healthz

# Test tools/list
curl -X POST http://localhost:3000 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'

# Test tools/call (example: list directory)
curl -X POST http://localhost:3000 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"list_directory","arguments":{"path":"."}}}'
```

## Architecture

### Process Hierarchy

```
bin/cli.js (parent process)
├── lib/server.js (child process - Fastify HTTP adapter)
│   └── @modelcontextprotocol/server-filesystem (grandchild - STDIO MCP server)
└── cloudflared tunnel (child process - HTTPS tunnel)
```

### Two-Layer Bridge Pattern

1. **STDIO → HTTP Bridge** ([lib/server.js](lib/server.js))
   - Fastify server spawns the filesystem MCP server as child process
   - Converts HTTP JSON-RPC requests → STDIO communication
   - Maintains request/response mapping via `pendingRequests` Map
   - Handles initialization, tools/list, and tools/call methods

2. **Local → Public HTTPS** ([bin/cli.js](bin/cli.js))
   - CLI orchestrates both adapter and tunnel processes
   - Manages unified lifecycle (startup, shutdown, error handling)
   - Parses arguments and passes config via environment variables

### Key Files

- **[bin/cli.js](bin/cli.js)**: Main entry point, argument parsing, process orchestration, terminal UI
- **[lib/server.js](lib/server.js)**: Fastify HTTP adapter, JSON-RPC ↔ STDIO translation
- **[package.json](package.json)**: Defines `local-mcp-filesystem` and `lmcp` bin aliases

## Protocol Flow

ChatGPT communicates using JSON-RPC 2.0 over HTTP:

1. ChatGPT → HTTP POST to tunnel URL
2. Tunnel → Fastify adapter (localhost:3000)
3. Adapter → Converts to STDIO JSON-RPC
4. MCP filesystem server → Processes request
5. Response flows back through same chain

**Critical**: Each request needs a unique ID for mapping responses. The adapter maintains its own `requestCounter` and maps incoming request IDs to outgoing ones via `pendingRequests`.

## Environment Variables

When running the adapter directly:
- `PORT` - HTTP server port (default: 3000)
- `ALLOWED_DIR` - Root directory to serve (default: cwd)
- `DEBUG` - Enable verbose logging ('1' = on)

These are set by [bin/cli.js](bin/cli.js) when spawning [lib/server.js](lib/server.js).

## Dependencies

- **Runtime**: Node.js >= 18.19
- **Key packages**:
  - `fastify` - HTTP server (replaced Express for ChatGPT compatibility)
  - `@modelcontextprotocol/sdk` - MCP protocol support
  - `cloudflared` - Auto-installs tunnel binary
  - `dotenv` - Environment config

**No build step required** - pure JavaScript with ES modules.

## Deployment & Publishing

This is published as an npm package. Users run it via:
```bash
npm install -g local-mcp-filesystem
npx local-mcp-filesystem
```

The `bin` field in [package.json](package.json) creates two executable aliases:
- `local-mcp-filesystem` - Full name
- `lmcp` - Short alias for convenience

## Common Gotchas

1. **Port conflicts**: CLI attempts `fuser -k` to kill processes on the port before starting (Linux only)
2. **Cloudflared binary**: Auto-installed via npm package on first run
3. **Process cleanup**: SIGINT/SIGTERM handlers ensure both adapter and tunnel are killed together
4. **Request timeout**: Adapter waits max 30s for MCP server responses
5. **Initialization timing**: 100ms delay before sending initialize to MCP server to ensure STDIO is ready
6. **Security**: The `ALLOWED_DIR` parameter restricts filesystem access. Always use the most specific directory needed.
