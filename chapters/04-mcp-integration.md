# Chapter 4 — Planar Portals: MCP Integration

[← Chapter 3](03-custom-tools.md) · [Back to README](../README.md) · [Next: Chapter 5 →](05-a2a-integration.md)

---

![Chapter 4](../assets/header_4.png)

## Quest objective

Learn the [Model Context Protocol (MCP)](https://strandsagents.com/) — the protocol that lets an agent use tools that live in a separate process, reached over HTTP.

You'll build:

1. **An MCP server** that exposes a `roll_dice` tool over stateless Streamable HTTP
2. **An MCP client** that hands that server straight to a Strands agent as a tool provider

Everything is already installed from [Chapter 0](00-prerequisites.md). The relevant pins in `package.json`:

```jsonc
"@modelcontextprotocol/sdk": "1.30.0",
"@strands-agents/sdk": "1.17.0",
"express": "5.2.1"
```

---

## Part 1 — The MCP server

The server has two files. Create the directories and files shown below; none of them are present in the starter workspace.

> **Create:** `src/mcp-server/dice.ts`, `src/mcp-server/server.ts`, and `src/mcp-client/agent.ts`<br>
> **Reference after attempting the exercise:** [`completed/04-mcp-integration/src/`](../completed/04-mcp-integration/src/)

| File                                    | Responsibility                          |
| --------------------------------------- | --------------------------------------- |
| `src/mcp-server/dice.ts`                | Pure dice logic (easy to test, no I/O)  |
| `src/mcp-server/server.ts`              | MCP tool registration + HTTP transport  |

### Step 1 — The dice logic (`src/mcp-server/dice.ts`)

Keep the randomness in one small, dependency-free module:

```typescript
export interface RollResult {
  rolls: number[];
  total: number;
  faces: number;
  count: number;
}

export function rollDice(faces: number, count: number): RollResult {
  if (faces < 1) throw new Error("A die must have at least 1 face");
  if (count < 1) throw new Error("Must roll at least 1 die");

  const rolls = Array.from(
    { length: count },
    () => Math.floor(Math.random() * faces) + 1,
  );
  const total = rolls.reduce((sum, roll) => sum + roll, 0);
  return { rolls, total, faces, count };
}
```

### Step 2 — Imports (`src/mcp-server/server.ts`)

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import { z } from "zod";
import { rollDice } from "./dice.js";
```

> The `.js` extension on `./dice.js` is required — this project is native ESM with TypeScript `NodeNext` resolution.

### Step 3 — Register the dice tool on a fresh server

```typescript
function createServer(): McpServer {
  const server = new McpServer({
    name: "D&D Dice Roll Service",
    version: "1.0.0",
  });

  server.registerTool(
    "roll_dice",
    {
      description: "Roll one or more dice for D&D (e.g. 4d6, a single d20).",
      inputSchema: {
        faces: z.number().int().min(1).default(6).describe("Sides per die"),
        count: z.number().int().min(1).default(1).describe("Number of dice"),
      },
    },
    async ({ faces, count }) => {
      const result = rollDice(faces, count);
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  );

  return server;
}
```

### Step 4 — Wire the stateless Streamable HTTP transport

This is the **stateless** pattern: each POST gets its own server and transport with `sessionIdGenerator: undefined`, so the server keeps **no per-client state** and any instance can answer any request.

```typescript
const app = express();
app.use(express.json());

app.post("/mcp", async (req, res) => {
  const server = createServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless: no sessions
  });
  res.on("close", () => {
    void transport.close();
    void server.close();
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

// A stateless transport has no server-initiated streams or sessions.
const methodNotAllowed = (_req: express.Request, res: express.Response) => {
  res.status(405).json({ error: "Method not allowed" });
};
app.get("/mcp", methodNotAllowed);
app.delete("/mcp", methodNotAllowed);

app.listen(8080, () => {
  console.log("🎲 D&D Dice Roll MCP Server running on http://localhost:8080/mcp");
});
```

---

## Part 2 — The MCP client (`src/mcp-client/agent.ts`)

Here is the key idea of this chapter: **you don't call `listTools()` yourself**. In the current SDK, an `McpClient` is a valid member of an agent's `tools` array, so you pass the client in directly. The agent discovers the remote tools and manages the connection for you.

### Step 1 — Imports

```typescript
import { Agent, McpClient } from "@strands-agents/sdk";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import * as readline from "node:readline/promises";
import { createModel } from "../model.js";
```

> `import type { Transport }` must be a type-only import — the tsconfig uses `verbatimModuleSyntax`, which rejects mixing types into value imports.

### Step 2 — Build the client and hand it to the agent

```typescript
const mcpClient = new McpClient({
  transport: new StreamableHTTPClientTransport(
    new URL("http://localhost:8080/mcp"),
  ) as Transport,
});

const gamemaster = new Agent({
  model: createModel(),
  tools: [mcpClient], // ← the client IS the tool provider
  systemPrompt: `You are Lady Luck, the mystical keeper of dice and fortune.
    ALWAYS use the roll_dice tool for any roll — never invent results.`,
});
```

### Step 3 — Chat, then always disconnect

Wrap the loop in `try/finally` so the transport is released even on error or Ctrl-D.

Ctrl-D (and piped input running out) closes stdin, and readline then rejects the
*next* `question()` with `ERR_USE_AFTER_CLOSE`. Catch that one error and break, or the
process dies with a stack trace instead of exiting cleanly:

```typescript
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
try {
  for (;;) {
    let userInput: string;
    try {
      userInput = (await rl.question("\n🎲 Your request: ")).trim();
    } catch (error) {
      // Ctrl-D / EOF closed stdin — leave the loop and let `finally` clean up.
      if (
        error instanceof Error &&
        (error as NodeJS.ErrnoException).code === "ERR_USE_AFTER_CLOSE"
      ) {
        break;
      }
      throw error;
    }
    if (["exit", "quit", "bye"].includes(userInput.toLowerCase())) break;
    const result = await gamemaster.invoke(userInput);
    console.log(result.toString());
  }
} finally {
  rl.close();
  await mcpClient.disconnect();
}
```

---

## Testing the system

Run the server in one terminal (from the project root):

```bash
npm run mcp:server
```

You should see:

```
🎲 D&D Dice Roll MCP Server running on http://localhost:8080/mcp
```

In a second terminal, run the client (make sure Ollama is running, or set `MODEL_PROVIDER=bedrock`):

```bash
npm run mcp:client
```

Try prompts like:

- `Roll a d20`
- `Roll a d6`
- `Roll a d100`
- `Roll 4d6 for ability scores`

Type `exit` to quit — the client disconnects cleanly.

## Reference solutions

After attempting the exercise, compare your files with
[`completed/04-mcp-integration/src/`](../completed/04-mcp-integration/src/).
Runtime commands still target your root `src/`, so the completed snapshot never
runs in place of your work.

## What you learned

- How to expose a tool from a **stateless** MCP server with `@modelcontextprotocol/sdk`
- Why `sessionIdGenerator: undefined` makes the server hold no per-client state
- How the current Strands SDK lets you pass an `McpClient` **directly** into `tools` — no manual `listTools()` wiring
- Why you should `disconnect()` in a `finally` block

---

[← Chapter 3](03-custom-tools.md) · [Back to README](../README.md) · [Next: Chapter 5 →](05-a2a-integration.md)
