# local-mcp-filesystem

**One command to give ChatGPT access to your local filesystem.**

No separate tunnels. No multiple terminals. Just one command.

---

## What This Does

Starts everything you need in one process:
- ✅ Filesystem MCP server adapter
- ✅ Cloudflare tunnel (automatic HTTPS)
- ✅ Returns URL ready for ChatGPT
- ✅ Unified logs and graceful shutdown

---

## Quick Start

```bash
# Install globally
npm install -g local-mcp-filesystem

# Run (from any directory)
npx local-mcp-filesystem

# Or with short alias
npx lmcp
```

**Output:**
```
╔═══════════════════════════════════════════════════════════╗
║           local-mcp-filesystem Server                     ║
╚═══════════════════════════════════════════════════════════╝

🚀 Starting filesystem adapter...
   Root directory: /Users/you/projects
   Port: 3000
✓ Adapter running

🌐 Starting Cloudflare tunnel...
✓ Tunnel created: https://abc-123-xyz.trycloudflare.com

═══════════════════════════════════════════════════════════
✓ Server Ready!
═══════════════════════════════════════════════════════════

📋 Configuration:
   Adapter Port: 3000
   Root Directory: /Users/you/projects
   Tunnel URL: https://abc-123-xyz.trycloudflare.com

🎯 Next Steps:

   1. Copy this URL:
      https://abc-123-xyz.trycloudflare.com

   2. Add to ChatGPT Developer Mode:
      • Settings → Apps & Connectors → Developer Mode
      • Add Remote MCP Server
      • URL: https://abc-123-xyz.trycloudflare.com
      • Protocol: HTTP (streaming)
      • Authentication: None

   3. Available tools in ChatGPT:
      • search - Find files by pattern
      • fetch - Read file contents
      • list - List directory contents
      • write - Create or update files

────────────────────────────────────────────────────────────
Press Ctrl+C to stop
```

---

## Usage

### Basic Usage

```bash
# Start in current directory
npx local-mcp-filesystem

# Start in specific directory
npx local-mcp-filesystem --dir ~/Documents

# Use custom port
npx local-mcp-filesystem --port 3001
```

### With Existing Tunnel

If you already have a tunnel running:

```bash
npx local-mcp-filesystem --tunnel-url https://my-tunnel.trycloudflare.com
```

### Development Mode

```bash
# Verbose logging
npx local-mcp-filesystem --dev
```

---

## Options

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--port` | `-p` | Adapter port | `3000` |
| `--dir` | `-d` | Root directory to serve | Current directory |
| `--tunnel-url` | `-t` | Use existing tunnel (skip creation) | Auto-create |
| `--dev` | | Development mode (verbose logs) | `false` |
| `--help` | `-h` | Show help | |

---

## Requirements

### Cloudflare Tunnel (cloudflared)

**Automatically installed!** The `cloudflared` binary is now included as an npm dependency and will be automatically downloaded when you install the package. No manual installation required.

If you prefer to use your own cloudflared installation, you can provide a custom tunnel URL with `--tunnel-url`.

### Node.js

Node.js >= 18.19 required.

---

## How It Works

```
┌────────────────────────────────────────────────────────┐
│ local-mcp-filesystem (this package)                    │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 1. Filesystem Adapter (lib/server.js)           │  │
│  │    • Wraps @modelcontextprotocol/server-filesystem │
│  │    • Exposes HTTP endpoint at localhost:3000     │  │
│  │    • Handles JSON-RPC ↔ STDIO conversion         │  │
│  └──────────────────────────────────────────────────┘  │
│                         ↓                               │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 2. Cloudflare Tunnel                             │  │
│  │    • Starts: cloudflared tunnel --url http://... │  │
│  │    • Returns: https://xyz.trycloudflare.com      │  │
│  │    • Provides HTTPS for ChatGPT                  │  │
│  └──────────────────────────────────────────────────┘  │
│                         ↓                               │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 3. Unified Process Management                    │  │
│  │    • Single command starts everything            │  │
│  │    • Unified log output                          │  │
│  │    • Graceful shutdown (Ctrl+C kills both)       │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
                         │
                         ↓
                ┌─────────────────┐
                │    ChatGPT      │
                │  (uses tunnel)  │
                └─────────────────┘
```

---

## Available Tools in ChatGPT

Once connected, ChatGPT can use these tools:

### `search`
Find files by pattern.

**Example:**
```
Find all JavaScript files in the src directory
```

### `fetch`
Read file contents.

**Example:**
```
Read the contents of src/index.js
```

### `list`
List directory contents.

**Example:**
```
List all files in the current directory
```

### `write`
Create or update files.

**Example:**
```
Create a new file called README.md with "Hello World"
```

---

## Security

### What Has Access?

- ✅ Only files in the specified `--dir` (default: current directory)
- ✅ Respects `.gitignore` patterns
- ❌ Cannot access files outside root directory
- ❌ Cannot execute commands

### Tunnel Security

- Tunnel URL is temporary (expires when you stop the process)
- Only accessible while the process is running
- No authentication needed (secured by temporary URL)

### Best Practices

```bash
# Good: Specific project directory
npx local-mcp-filesystem --dir ~/projects/my-app

# Bad: Root or home directory
npx local-mcp-filesystem --dir ~  # Too broad!
npx local-mcp-filesystem --dir /  # Dangerous!
```

---

## Troubleshooting

### "cloudflared: command not found"

If you prefer to use your own cloudflared installation, you can provide a custom tunnel URL with `--tunnel-url`.

Or, make sure you have installed the package correctly.

### "Address already in use"

Port 3000 is taken. Use a different port:
```bash
npx local-mcp-filesystem --port 3001
```

### ChatGPT shows "No tools available"

1. Check the tunnel URL is correct
2. Verify the server is running (don't close terminal)
3. Try refreshing ChatGPT's connector

### "Permission denied" when reading files

The process runs with your user permissions. If you can't read a file, neither can the server.

---

## Comparison to Other Packages

### vs `chatgpt-mcp-filesystem`

- ✅ Same functionality
- ✅ Better name (no "chatgpt")
- ✅ One command (vs two terminals)
- ✅ Better UX (formatted output, URL ready to copy)

### vs Manual Setup (stdio-adapter + tunnel)

**Manual:**
```bash
# Terminal 1
cd stdio-adapter
npm run dev

# Terminal 2
cloudflared tunnel --url http://localhost:3000

# Copy URL manually
```

**This package:**
```bash
npx local-mcp-filesystem
# Everything starts, URL ready to copy
```

---

## Development

### Running from Source

```bash
cd packages/local-mcp-filesystem
npm install
npm start
```

### Publishing

```bash
npm version patch
npm publish
```

---

## Related Projects

- [Universal MCP Bridge](../../) - Bridge for remote MCP servers (like Context7)
- [@modelcontextprotocol/server-filesystem](https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem) - The underlying filesystem MCP server

---

## License

MIT

---

## Support

- 🐛 [Report a bug](https://github.com/arti-cat/mcp-bridge/issues)
- 💡 [Request a feature](https://github.com/arti-cat/mcp-bridge/issues)
- 📖 [Documentation](https://github.com/arti-cat/mcp-bridge)

---

**Made for developers who want filesystem access in ChatGPT without the hassle.**
