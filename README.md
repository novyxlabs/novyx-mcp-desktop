# Novyx MCP — Desktop Extension

Desktop Extension (.mcpb) for [Claude Desktop](https://claude.ai/download). One-click install for persistent AI agent memory with rollback, audit trails, and semantic search.

<a href="https://glama.ai/mcp/servers/novyxlabs/novyx-mcp-desktop">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/novyxlabs/novyx-mcp-desktop/badge" alt="Novyx MCP server" />
</a>

## Features

- **Persistent Memory** — Store and recall memories with semantic search
- **Time-Travel Rollback** — Undo mistakes by rewinding to any point in time
- **Audit Trails** — Cryptographic proof of every memory operation
- **Knowledge Graph** — Link memories with subject-predicate-object triples
- **Context Spaces** — Isolated memory scopes for different projects
- **Local-First** — Works instantly with SQLite, no API key needed
- **Cloud Upgrade** — Optional cloud sync, team sharing, and advanced features

23 tools, 6 resources, 3 prompts.

## Installation

**From the Anthropic Directory (recommended):**

Install directly from Claude Desktop → Settings → Extensions.

**Manual install:**

1. Download the latest `.mcpb` file from [Releases](https://github.com/novyxlabs/novyx-mcp-desktop/releases)
2. Double-click the file, or drag it into Claude Desktop

**Prerequisites:** Python 3.10+ must be installed. The extension automatically installs `novyx-mcp` via `uvx` or uses an existing `pip install novyx-mcp`.

## Configuration

**No configuration required for local mode.** The extension works out of the box with a local SQLite database.

**Optional — Cloud mode:**

When prompted during installation, enter your Novyx API key. Get a free key at [novyxlabs.com](https://novyxlabs.com) (5,000 memories, no credit card).

Cloud mode enables:
- Cross-device memory sync
- RSA-signed audit trails
- Team sharing and context spaces
- Replay and cortex features

## Usage Examples

### Example 1: Store and recall memories

**User prompt:**
> Remember that the project deadline is March 15th and we're using React with TypeScript.

**What happens:** Claude calls the `remember` tool to store two tagged memories. Later:

> What tech stack are we using for this project?

**What happens:** Claude calls `recall` with a semantic search, finds the stored memory about React + TypeScript, and answers accurately.

### Example 2: Roll back a mistake

**User prompt:**
> I accidentally told you the deadline was March 15th — it's actually April 1st. Roll back the wrong memory and fix it.

**What happens:** Claude calls `rollback` to undo the incorrect memory, then `remember` to store the corrected date. The `audit` trail shows the full history: original store → rollback → corrected store.

### Example 3: Build a knowledge graph

**User prompt:**
> Track these relationships: Alice manages the frontend team, Bob manages the backend team, and both teams report to Carol.

**What happens:** Claude calls `triple` three times to create knowledge graph entries:
- `Alice → manages → frontend team`
- `Bob → manages → backend team`
- `frontend team, backend team → reports_to → Carol`

Later, asking "Who does the frontend team report to?" triggers a `triples` query that returns the answer.

### Example 4: Isolated project contexts

**User prompt:**
> Create a separate memory space for my side project so it doesn't mix with work memories.

**What happens:** Claude calls `create_space` to create an isolated context. Memories stored in that space are scoped and don't appear in general searches.

## Privacy Policy

Novyx MCP operates in two modes:

**Local mode (default):** All data is stored locally in a SQLite database at `~/.novyx/local.db`. No data is sent to any external server. No analytics or telemetry.

**Cloud mode (opt-in):** When you provide an API key, memories are sent to the Novyx API (`novyx-ram-api.fly.dev`) for storage and sync. Data is encrypted in transit (TLS) and at rest. We do not share your data with third parties. See our full privacy policy at [novyxlabs.com/privacy](https://novyxlabs.com/privacy).

You can switch between modes at any time by adding or removing your API key.

**Data retention:** Local data persists until you delete it. Cloud data is retained until you delete it or close your account. Audit trails are immutable by design.

For privacy questions, contact blake@novyxlabs.com.

## Support

- **Issues:** [github.com/novyxlabs/novyx-mcp-desktop/issues](https://github.com/novyxlabs/novyx-mcp-desktop/issues)
- **Documentation:** [docs.novyxlabs.com](https://docs.novyxlabs.com)
- **Email:** blake@novyxlabs.com

## How It Works

This Desktop Extension is a thin Node.js wrapper that spawns the Python `novyx-mcp` server as a child process. The Node.js layer handles process lifecycle; the Python server handles all MCP logic.

Launch order:
1. `uvx novyx-mcp` (fastest — no install needed)
2. `python3 -m novyx_mcp` (if pip installed)
3. `novyx-mcp` (if pipx installed)

## License

MIT