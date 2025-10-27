#!/usr/bin/env node

/**
 * local-mcp-filesystem
 *
 * One command to start:
 * - STDIO filesystem adapter
 * - Cloudflare tunnel
 * - Return HTTPS URL
 *
 * Usage:
 *   npx local-mcp-filesystem
 *   npx local-mcp-filesystem --port 3000 --dir /path/to/folder
 *   npx local-mcp-filesystem --tunnel-url https://my-tunnel.com
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { homedir } from 'os';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    port: 3000,
    dir: process.cwd(),
    tunnelUrl: null,
    dev: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--port':
      case '-p':
        config.port = parseInt(args[++i], 10);
        break;
      case '--dir':
      case '-d':
        config.dir = args[++i];
        break;
      case '--tunnel-url':
      case '-t':
        config.tunnelUrl = args[++i];
        break;
      case '--dev':
        config.dev = true;
        break;
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
        break;
    }
  }

  return config;
}

function showHelp() {
  log('\nlocal-mcp-filesystem', colors.bright);
  log('='.repeat(60), colors.bright);
  log('\nOne-command local filesystem MCP server with automatic HTTPS tunnel\n');

  log('Usage:', colors.cyan);
  log('  npx local-mcp-filesystem [options]\n');

  log('Options:', colors.cyan);
  log('  -p, --port <number>        Port for adapter (default: 3000)');
  log('  -d, --dir <path>           Root directory to serve (default: current dir)');
  log('  -t, --tunnel-url <url>     Use existing tunnel URL (skip tunnel creation)');
  log('  --dev                      Development mode (verbose logging)');
  log('  -h, --help                 Show this help\n');

  log('Examples:', colors.cyan);
  log('  npx local-mcp-filesystem');
  log('  npx local-mcp-filesystem --dir ~/Documents');
  log('  npx local-mcp-filesystem --port 3001');
  log('  npx local-mcp-filesystem --tunnel-url https://my-tunnel.trycloudflare.com\n');
}

async function checkCloudflared() {
  return new Promise((resolve) => {
    const check = spawn('which', ['cloudflared']);
    check.on('close', (code) => resolve(code === 0));
  });
}

async function startAdapter(config) {
  return new Promise((resolve, reject) => {
    log('\n🚀 Starting filesystem adapter...', colors.bright);
    log(`   Root directory: ${config.dir}`, colors.cyan);
    log(`   Port: ${config.port}`, colors.cyan);

    const adapterPath = join(__dirname, '../lib/server.js');

    const adapter = spawn('node', [adapterPath], {
      env: {
        ...process.env,
        PORT: config.port.toString(),
        ROOT_DIR: config.dir,
        DEBUG: config.dev ? '1' : '0',
      },
      stdio: config.dev ? 'inherit' : ['ignore', 'pipe', 'pipe'],
    });

    let started = false;

    adapter.stdout?.on('data', (data) => {
      const output = data.toString();
      if (output.includes('listening') || output.includes('started')) {
        if (!started) {
          started = true;
          log('✓ Adapter running', colors.green);
          resolve(adapter);
        }
      }
      if (config.dev) {
        process.stdout.write(output);
      }
    });

    adapter.stderr?.on('data', (data) => {
      if (config.dev) {
        process.stderr.write(data);
      }
    });

    adapter.on('error', reject);

    // Give it 3 seconds to start
    setTimeout(() => {
      if (!started) {
        log('✓ Adapter started (timeout)', colors.green);
        resolve(adapter);
      }
    }, 3000);
  });
}

async function startTunnel(port, config) {
  return new Promise((resolve, reject) => {
    log('\n🌐 Starting Cloudflare tunnel...', colors.bright);

    const tunnel = spawn('cloudflared', [
      'tunnel',
      '--url',
      `http://localhost:${port}`,
    ], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let tunnelUrl = null;

    tunnel.stdout.on('data', (data) => {
      const output = data.toString();

      // Look for tunnel URL
      const urlMatch = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
      if (urlMatch && !tunnelUrl) {
        tunnelUrl = urlMatch[0];
        log(`✓ Tunnel created: ${tunnelUrl}`, colors.green);
        resolve({ process: tunnel, url: tunnelUrl });
      }

      if (config.dev) {
        process.stdout.write(output);
      }
    });

    tunnel.stderr.on('data', (data) => {
      if (config.dev) {
        process.stderr.write(data);
      }
    });

    tunnel.on('error', reject);

    // Timeout after 30 seconds
    setTimeout(() => {
      if (!tunnelUrl) {
        reject(new Error('Tunnel creation timeout'));
      }
    }, 30000);
  });
}

async function main() {
  const config = parseArgs();

  log('\n╔═══════════════════════════════════════════════════════════╗', colors.bright);
  log('║           local-mcp-filesystem Server                     ║', colors.bright);
  log('╚═══════════════════════════════════════════════════════════╝', colors.bright);

  let adapter, tunnel;

  try {
    // Start adapter
    adapter = await startAdapter(config);

    // Start or use existing tunnel
    if (config.tunnelUrl) {
      log(`\n🌐 Using provided tunnel: ${config.tunnelUrl}`, colors.cyan);
      tunnel = { url: config.tunnelUrl };
    } else {
      // Check if cloudflared is installed
      const hasCloudflared = await checkCloudflared();

      if (!hasCloudflared) {
        log('\n⚠️  Cloudflared not found!', colors.yellow);
        log('\nInstall cloudflared:', colors.cyan);
        log('  macOS:   brew install cloudflare/cloudflare/cloudflared');
        log('  Linux:   https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/');
        log('  Windows: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/\n');
        log('Or provide your own tunnel URL with --tunnel-url\n', colors.cyan);
        process.exit(1);
      }

      tunnel = await startTunnel(config.port, config);
    }

    // Success!
    log('\n' + '═'.repeat(60), colors.green);
    log('✓ Server Ready!', colors.green + colors.bright);
    log('═'.repeat(60), colors.green);

    log('\n📋 Configuration:', colors.bright);
    log(`   Adapter Port: ${config.port}`, colors.cyan);
    log(`   Root Directory: ${config.dir}`, colors.cyan);
    log(`   Tunnel URL: ${tunnel.url}`, colors.cyan);

    log('\n🎯 Next Steps:', colors.bright);
    log('\n   1. Copy this URL:', colors.cyan);
    log(`      ${tunnel.url}`, colors.green + colors.bright);

    log('\n   2. Add to ChatGPT Developer Mode:', colors.cyan);
    log('      • Settings → Apps & Connectors → Developer Mode');
    log('      • Add Remote MCP Server');
    log(`      • URL: ${tunnel.url}`);
    log('      • Protocol: HTTP (streaming)');
    log('      • Authentication: None');

    log('\n   3. Available tools in ChatGPT:', colors.cyan);
    log('      • search - Find files by pattern');
    log('      • fetch - Read file contents');
    log('      • list - List directory contents');
    log('      • write - Create or update files');

    log('\n' + '─'.repeat(60), colors.cyan);
    log('Press Ctrl+C to stop\n', colors.yellow);

    // Handle graceful shutdown
    const cleanup = () => {
      log('\n\n🛑 Shutting down...', colors.yellow);

      if (adapter) {
        adapter.kill();
        log('✓ Adapter stopped', colors.green);
      }

      if (tunnel?.process) {
        tunnel.process.kill();
        log('✓ Tunnel stopped', colors.green);
      }

      log('\nGoodbye! 👋\n', colors.cyan);
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

  } catch (error) {
    log(`\n✗ Error: ${error.message}`, colors.red);

    if (adapter) adapter.kill();
    if (tunnel?.process) tunnel.process.kill();

    process.exit(1);
  }
}

main().catch((err) => {
  log(`\nFatal error: ${err.message}`, colors.red);
  process.exit(1);
});
