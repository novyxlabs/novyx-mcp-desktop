#!/usr/bin/env node
"use strict";

/**
 * Novyx MCP Desktop Extension
 *
 * Thin Node.js wrapper that spawns the Python novyx-mcp server as a child
 * process and pipes stdio directly. The real MCP server logic lives in the
 * novyx-mcp Python package — this wrapper just launches it.
 */

const { spawn } = require("child_process");
const { platform } = require("os");

const PACKAGE = "novyx-mcp";

/**
 * Find a working Python command. Returns the first one that exists.
 */
function findPython() {
  // On Windows, "python" is standard. On macOS/Linux, "python3" is more reliable.
  if (platform() === "win32") {
    return ["python", "python3", "py"];
  }
  return ["python3", "python"];
}

/**
 * Try to spawn novyx-mcp using uvx first (fastest, no install needed),
 * then fall back to python -m novyx_mcp.
 */
function trySpawn(commands, index) {
  if (index >= commands.length) {
    process.stderr.write(
      `[novyx-mcp] Error: Could not start novyx-mcp.\n` +
      `Tried: ${commands.map((c) => c.join(" ")).join(", ")}\n\n` +
      `Install with: pip install novyx-mcp\n` +
      `Or: pipx install novyx-mcp\n`
    );
    process.exit(1);
  }

  const [cmd, ...args] = commands[index];
  const child = spawn(cmd, args, {
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env },
    windowsHide: true,
  });

  child.on("error", () => {
    // Command not found — try next option
    trySpawn(commands, index + 1);
  });

  // Give the process a moment to fail with a spawn error before wiring up stdio
  let started = false;

  child.on("spawn", () => {
    started = true;

    // Pipe stdin from Claude Desktop to the Python server
    process.stdin.pipe(child.stdin);

    // Pipe stdout from the Python server to Claude Desktop
    child.stdout.pipe(process.stdout);

    // Forward stderr for diagnostics
    child.stderr.pipe(process.stderr);
  });

  child.on("exit", (code) => {
    if (!started) {
      // Process exited before fully starting — try next
      trySpawn(commands, index + 1);
      return;
    }
    process.exit(code ?? 1);
  });
}

// Build the list of commands to try, in priority order
const commands = [];

// 1. uvx (fastest — downloads and runs in one shot, no install needed)
commands.push(["uvx", PACKAGE]);

// 2. python -m novyx_mcp (works if pip installed)
for (const py of findPython()) {
  commands.push([py, "-m", "novyx_mcp"]);
}

// 3. Direct command (works if installed via pipx)
commands.push(["novyx-mcp"]);

trySpawn(commands, 0);
