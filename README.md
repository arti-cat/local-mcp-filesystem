# local-mcp-filesystem

**Connect ChatGPT to your local filesystem in one command.**

---

## 🚀 Quick Start (30 seconds)

```bash
# Run directly (no install needed)
npx local-mcp-filesystem

# Or install globally first
npm install -g local-mcp-filesystem
local-mcp-filesystem
```

**That's it!** The command will:

1. Start the filesystem adapter
2. Create a secure tunnel
3. Give you an HTTPS URL to paste into ChatGPT

**After running:**

1. Copy the tunnel URL (e.g., `https://abc-123-xyz.trycloudflare.com`)
2. Add to ChatGPT Settings → Apps & Connectors → Developer Mode
3. Add name 'Local Filesystem' (or whatever you like)
4. Set Protocol: HTTP (streaming)
5. Set Authentication: None
6. Refresh ChatGPT and ask it to work with your files

---

## Configuration

### Command Options

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--port` | `-p` | Adapter port | `3000` |
| `--dir` | `-d` | Root directory to serve | Current directory |
| `--tunnel-url` | `-t` | Use existing tunnel (skip creation) | Auto-create |
| `--dev` | | Development mode (verbose logs) | `false` |
| `--help` | `-h` | Show help | |

### Usage Examples

```bash
# Start in current directory
npx local-mcp-filesystem

# Serve a specific directory
npx local-mcp-filesystem --dir ~/Documents

# Use custom port
npx local-mcp-filesystem --port 3001

# Short alias
npx lmcp
```

---

## Available Tools

Once connected, ChatGPT can:

- **read_file** / **read_text_file** - Read file contents
- **write_file** - Create or update files
- **list_directory** - List directory contents
- **search_files** - Find files by pattern
- **get_file_info** - Get file metadata
- **create_directory** - Create new directories
- **move_file** - Move or rename files

ChatGPT will automatically use these tools when you ask it to work with files.

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
# ✅ Good: Specific project directory
npx local-mcp-filesystem --dir ~/projects/my-app

# ❌ Bad: Root or home directory
npx local-mcp-filesystem --dir ~  # Too broad!
npx local-mcp-filesystem --dir /  # Dangerous!
```

---

## Requirements

- **Node.js** >= 18.19
- **Cloudflared** - Automatically installed via npm dependency

---

## Troubleshooting

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

## License

MIT - Built for the MCP community.

**Need help?** Open an [issue](https://github.com/arti-cat/local-mcp-filesystem/issues) or read [CLAUDE.md](CLAUDE.md) for technical details.
