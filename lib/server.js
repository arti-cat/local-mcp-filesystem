#!/usr/bin/env node

/**
 * Filesystem MCP Server (HTTP adapter for STDIO)
 *
 * This is the actual adapter that wraps the MCP filesystem server
 * and exposes it over HTTP for the tunnel to access.
 */

import express from 'express';
import { spawn } from 'child_process';
import { randomUUID } from 'crypto';

const PORT = parseInt(process.env.PORT || '3000', 10);
const ROOT_DIR = process.env.ROOT_DIR || process.cwd();
const DEBUG = process.env.DEBUG === '1';

const app = express();
app.use(express.json());

// Start MCP filesystem server process
let mcpProcess = null;
const pendingRequests = new Map();
let requestCounter = 0;
const sessionId = randomUUID();

function debug(...args) {
  if (DEBUG) {
    console.log('[DEBUG]', ...args);
  }
}

function startMCPProcess() {
  debug('Starting MCP filesystem process...');
  debug(`Root directory: ${ROOT_DIR}`);

  mcpProcess = spawn('npx', [
    '@modelcontextprotocol/server-filesystem',
    ROOT_DIR
  ], {
    stdio: ['pipe', 'pipe', 'inherit'],
  });

  let buffer = '';

  mcpProcess.stdout.on('data', (data) => {
    buffer += data.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    lines.forEach((line) => {
      if (!line.trim()) return;

      try {
        const response = JSON.parse(line);
        debug('MCP response:', response.id, response.method || 'result');

        const pending = pendingRequests.get(response.id);
        if (pending) {
          clearTimeout(pending.timeout);
          pendingRequests.delete(response.id);
          pending.resolve(response);
        }
      } catch (err) {
        debug('Parse error:', err.message);
      }
    });
  });

  mcpProcess.on('error', (err) => {
    console.error('MCP process error:', err);
  });

  mcpProcess.on('exit', (code) => {
    console.log(`MCP process exited with code ${code}`);
    mcpProcess = null;
  });

  // Initialize the MCP server
  sendToMCP({
    jsonrpc: '2.0',
    id: requestCounter++,
    method: 'initialize',
    params: {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: {
        name: 'local-mcp-filesystem',
        version: '1.0.0',
      },
    },
  }).then(() => {
    debug('MCP server initialized');
  });
}

function sendToMCP(message) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingRequests.delete(message.id);
      reject(new Error('Request timeout'));
    }, 30000);

    pendingRequests.set(message.id, { resolve, reject, timeout });

    const json = JSON.stringify(message);
    debug('Sending to MCP:', message.id, message.method);
    mcpProcess.stdin.write(json + '\n');
  });
}

// Health check
app.get('/healthz', (req, res) => {
  res.json({ ok: true, session: sessionId });
});

// MCP endpoint
app.post('/mcp', async (req, res) => {
  try {
    const request = req.body;
    debug('HTTP request:', request.id, request.method);

    if (!mcpProcess) {
      return res.status(503).json({
        jsonrpc: '2.0',
        id: request.id || null,
        error: {
          code: -32000,
          message: 'MCP server not running',
        },
      });
    }

    // Handle initialize specially
    if (request.method === 'initialize') {
      const response = await sendToMCP({
        ...request,
        id: requestCounter++,
      });

      return res.json({
        jsonrpc: '2.0',
        id: request.id,
        result: response.result,
      });
    }

    // Forward other requests
    const response = await sendToMCP({
      ...request,
      id: requestCounter++,
    });

    res.json({
      jsonrpc: '2.0',
      id: request.id,
      result: response.result,
      error: response.error,
    });
  } catch (error) {
    debug('Error:', error.message);
    res.status(500).json({
      jsonrpc: '2.0',
      id: req.body?.id || null,
      error: {
        code: -32603,
        message: error.message,
      },
    });
  }
});

// Start server
app.listen(PORT, '127.0.0.1', () => {
  console.log(`Filesystem adapter listening on http://127.0.0.1:${PORT}`);
  startMCPProcess();
});

// Cleanup
process.on('SIGINT', () => {
  if (mcpProcess) mcpProcess.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  if (mcpProcess) mcpProcess.kill();
  process.exit(0);
});
