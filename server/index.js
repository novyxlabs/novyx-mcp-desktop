#!/usr/bin/env node
"use strict";

/**
 * Novyx MCP Desktop Extension
 *
 * Thin Node.js wrapper that spawns the Python novyx-mcp server as a child
 * process and pipes stdio directly. The real MCP server logic lives in the
 * novyx-mcp Python package — this wrapper just launches it.
 *
 * Claude Desktop does NOT inherit the user's shell PATH, so we must search
 * for Python/uvx in well-known locations explicitly.
 */

const { spawn, execFileSync } = require("child_process");
const { platform, homedir } = require("os");
const { existsSync } = require("fs");
const { join } = require("path");

const PACKAGE = "novyx-mcp";
const MODULE = "novyx_mcp";

function log(msg) {
  process.stderr.write(`[novyx-mcp] ${msg}\n`);
}

/**
 * Build a rich PATH that includes common Python/uv install locations.
 * Claude Desktop's Node process has a minimal PATH (/usr/bin:/bin:/usr/sbin:/sbin).
 */
function buildPath() {
  const home = homedir();
  const sep = platform() === "win32" ? ";" : ":";
  const existing = process.env.PATH || "";

  const dirs = [];

  if (platform() === "win32") {
    // Windows common Python/uv paths
    dirs.push(
      join(home, "AppData", "Local", "Programs", "Python", "Python313", "Scripts"),
      join(home, "AppData", "Local", "Programs", "Python", "Python312", "Scripts"),
      join(home, "AppData", "Local", "Programs", "Python", "Python311", "Scripts"),
      join(home, "AppData", "Local", "Programs", "Python", "Python310", "Scripts"),
      join(home, "AppData", "Local", "Programs", "Python", "Python313"),
      join(home, "AppData", "Local", "Programs", "Python", "Python312"),
      join(home, "AppData", "Local", "Programs", "Python", "Python311"),
      join(home, "AppData", "Local", "Programs", "Python", "Python310"),
      join(home, "AppData", "Roaming", "Python", "Scripts"),
      join(home, "AppData", "Local", "uv"),
      join(home, ".local", "bin"),
      "C:\\Python313\\Scripts",
      "C:\\Python312\\Scripts",
      "C:\\Python311\\Scripts",
      "C:\\Python310\\Scripts",
      "C:\\Python313",
      "C:\\Python312",
      "C:\\Python311",
      "C:\\Python310",
    );
  } else {
    // macOS / Linux common paths
    dirs.push(
      join(home, ".local", "bin"),           // pip install --user, pipx, uv
      join(home, ".cargo", "bin"),           // uv installed via cargo
      "/usr/local/bin",                       // Homebrew (Intel Mac), system pip
      "/opt/homebrew/bin",                    // Homebrew (Apple Silicon)
      "/opt/homebrew/sbin",
      join(home, "Library", "Python", "3.13", "bin"),
      join(home, "Library", "Python", "3.12", "bin"),
      join(home, "Library", "Python", "3.11", "bin"),
      join(home, "Library", "Python", "3.10", "bin"),
      "/usr/local/opt/python@3.13/bin",
      "/usr/local/opt/python@3.12/bin",
      "/usr/local/opt/python@3.11/bin",
      "/usr/local/opt/python@3.10/bin",
      "/opt/homebrew/opt/python@3.13/bin",
      "/opt/homebrew/opt/python@3.12/bin",
      "/opt/homebrew/opt/python@3.11/bin",
      "/opt/homebrew/opt/python@3.10/bin",
    );
  }

  // Deduplicate and prepend to existing PATH
  const pathDirs = [...new Set([...dirs.filter(d => existsSync(d)), ...existing.split(sep)])];
  return pathDirs.join(sep);
}

/**
 * Check if a command exists by trying to run it.
 */
function commandExists(cmd) {
  try {
    execFileSync(cmd, ["--version"], {
      stdio: "ignore",
      timeout: 5000,
      env: { ...process.env, PATH: richPath },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Try to install novyx-mcp using the first available method.
 * Returns true if installation succeeded.
 */
function autoInstall() {
  log("novyx-mcp not found. Attempting auto-install...");

  // Try uv first (fastest)
  if (commandExists("uv")) {
    try {
      log("Installing via: uv pip install novyx-mcp");
      execFileSync("uv", ["pip", "install", "--system", PACKAGE], {
        stdio: ["ignore", "ignore", "pipe"],
        timeout: 120000,
        env: { ...process.env, PATH: richPath },
      });
      log("Installed successfully via uv.");
      return true;
    } catch (e) {
      log(`uv install failed: ${e.message}`);
    }
  }

  // Try pip3/pip
  const pips = platform() === "win32" ? ["pip", "pip3"] : ["pip3", "pip"];
  for (const pip of pips) {
    if (commandExists(pip)) {
      try {
        log(`Installing via: ${pip} install novyx-mcp`);
        execFileSync(pip, ["install", PACKAGE], {
          stdio: ["ignore", "ignore", "pipe"],
          timeout: 120000,
          env: { ...process.env, PATH: richPath },
        });
        log(`Installed successfully via ${pip}.`);
        return true;
      } catch (e) {
        log(`${pip} install failed: ${e.message}`);
      }
    }
  }

  return false;
}

// Build rich PATH once
const richPath = buildPath();
const env = { ...process.env, PATH: richPath };

log(`Starting... (PATH includes ${richPath.split(platform() === "win32" ? ";" : ":").length} directories)`);

/**
 * Build list of commands to try, in priority order.
 */
function buildCommands() {
  const cmds = [];

  // 1. uvx (fastest — downloads and runs in isolated env, no install needed)
  cmds.push(["uvx", PACKAGE]);

  // 2. python -m novyx_mcp (works if pip installed)
  const pythons = platform() === "win32"
    ? ["python", "python3", "py"]
    : ["python3", "python"];
  for (const py of pythons) {
    cmds.push([py, "-m", MODULE]);
  }

  // 3. Direct command (works if installed via pipx)
  cmds.push(["novyx-mcp"]);

  return cmds;
}

/**
 * Try commands sequentially. On failure, try auto-install once, then retry.
 */
function trySpawn(commands, index, attempted_install) {
  if (index >= commands.length) {
    if (!attempted_install) {
      // All commands failed — try auto-installing and retry
      if (autoInstall()) {
        log("Retrying after install...");
        trySpawn(buildCommands(), 0, true);
        return;
      }
    }

    log(
      `Error: Could not start novyx-mcp.\n` +
      `Tried: ${commands.map((c) => c.join(" ")).join(", ")}\n\n` +
      `Please install manually:\n` +
      `  pip install novyx-mcp\n` +
      `  # or\n` +
      `  brew install uv && uvx novyx-mcp\n`
    );
    process.exit(1);
  }

  const [cmd, ...args] = commands[index];
  log(`Trying: ${cmd} ${args.join(" ")}`);

  const child = spawn(cmd, args, {
    stdio: ["pipe", "pipe", "pipe"],
    env,
    windowsHide: true,
  });

  let connected = false;
  let gotData = false;

  child.on("error", (err) => {
    log(`  → ${cmd}: ${err.message}`);
    trySpawn(commands, index + 1, attempted_install);
  });

  child.stdout.once("data", () => {
    gotData = true;
  });

  // Wait briefly for the process to either produce output or die
  const checkTimer = setTimeout(() => {
    if (child.exitCode !== null && !gotData) {
      // Already exited with no output — try next
      return;
    }
    // Process is running — wire up stdio
    connected = true;
    log(`  → Connected via: ${cmd} ${args.join(" ")}`);

    process.stdin.pipe(child.stdin);
    child.stdout.pipe(process.stdout);
    child.stderr.pipe(process.stderr);
  }, 500);

  child.on("exit", (code) => {
    if (!connected) {
      clearTimeout(checkTimer);
      log(`  → ${cmd}: exited with code ${code}`);
      trySpawn(commands, index + 1, attempted_install);
      return;
    }
    process.exit(code ?? 1);
  });
}

trySpawn(buildCommands(), 0, false);
