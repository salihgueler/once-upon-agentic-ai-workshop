# Chapter 5 — The Grand Alliance: Agent-to-Agent

[← Chapter 4](04-mcp-integration.md) · [Back to README](../README.md) · [Next: Chapter 6 →](06-ui-testing.md)

---

![Chapter 5](../assets/header_5.png)

## Quest objective

So far each agent has worked alone. Now you'll let multiple agents collaborate, each with its own tools and expertise, using [Agent2Agent (A2A)](https://strandsagents.com/latest/documentation/docs/user-guide/concepts/multi-agent/agent-to-agent/).

You'll build a three-agent D&D system orchestrated by a central Game Master.

```bash
cd sample-once-upon-agentic-ai-typescript
```

## Architecture

```
🧙 Rules Agent      ⚔️ Character Agent     🎲 Dice MCP Server
   (port 8000)         (port 8001)           (port 8080)
        │                   │                     │
        └───────────────────┼─────────────────────┘
                            │
                  👑 Gamemaster Orchestrator
                        (port 8009)
```

| Agent | Role | File |
| --- | --- | --- |
| **Rules Agent** | D&D rules lookup, backed by a vector DB | `5_a2a_integration/agents/rules_agent/rules_agent.ts` |
| **Character Agent** | Character creation and persistent storage | `5_a2a_integration/agents/character_agent/character_agent.ts` |
| **Gamemaster Orchestrator** | Routes requests, calls dice MCP, narrates | `5_a2a_integration/agents/gamemaster_orchestrator/gamemaster_orchestrator.ts` |

---

## Part 1 — The Rules Agent

The Rules Agent looks up D&D rules from a local vector database. Before it can answer anything, you need to build the **knowledge base**.

### Build the knowledge base

1. Download the [D&D Basic Rules 2018 PDF](https://media.wizards.com/2018/dnd/downloads/DnD_BasicRules_2018.pdf). The file must be named `DnD_BasicRules_2018.pdf`.
2. Place it in `5_a2a_integration/utils/` next to `create_knowledge_base.ts`.
3. Run the indexer:

   ```bash
   npx tsx 5_a2a_integration/utils/create_knowledge_base.ts
   ```

This script extracts text from the PDF, generates embeddings using the local `all-MiniLM-L6-v2` model (~80 MB, downloaded automatically on first run), and writes a LanceDB vector database to `5_a2a_integration/utils/dnd_knowledge_base/`. No external services or API keys needed.

When complete, you'll see `Knowledge base creation complete!` and a `dnd_basic_rules.lance` file inside the output folder.

### Wire up the agent

In `rules_agent.ts`:

```typescript
import { Agent, tool } from "@strands-agents/sdk";
import { A2AExpressServer } from "@strands-agents/sdk/a2a/express";

const queryDndRules = tool({
  name: "query_dnd_rules",
  description: "Fast D&D rule lookup. Returns brief rule with page reference.",
  inputSchema: z.object({
    query: z.string().describe("The D&D rule query to look up"),
  }),
  callback: async (input) => rulesKb.quickQuery(input.query),
});

const agent = new Agent({
  tools: [queryDndRules],
  systemPrompt: SYSTEM_PROMPT,
});

const server = new A2AExpressServer({
  agent,
  name: "Rules Agent",
  description: DESCRIPTION,
  port: 8000,
});

await server.serve();
```

`A2AExpressServer` wraps the agent in an A2A-compatible HTTP server. See the [A2A docs](https://strandsagents.com/latest/documentation/docs/user-guide/concepts/multi-agent/agent-to-agent/#creating-an-a2a-server).

---

## Part 2 — The Character Agent

The Character Agent uses three tools to manage heroes (already implemented in the source repo — read them carefully, they're a great pattern to copy):

- `create_character` — generates a new character with stats and inventory
- `find_character_by_name` — searches by name
- `list_all_characters` — returns the full roster

Storage is just `characters.json` next to the agent file.

In `character_agent.ts`:

```typescript
const agent = new Agent({
  tools: [findCharacterByName, listAllCharacters, createCharacter],
  systemPrompt: SYSTEM_PROMPT,
});

const server = new A2AExpressServer({
  agent,
  name: "Character Creator Agent",
  description: DESCRIPTION,
  port: 8001,
});

await server.serve();
```

---

## Part 3 — The Gamemaster Orchestrator

The orchestrator is itself a Strands agent. It connects to:

- The dice MCP server from Chapter 4 (via `McpClient`)
- The Rules Agent and Character Agent (via A2A clients wrapped as tools)

```typescript
import { Agent, McpClient, tool } from "@strands-agents/sdk";
import { A2AAgent } from "@strands-agents/sdk/a2a";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const mcpClient = new McpClient({
  transport: new StreamableHTTPClientTransport(
    new URL("http://localhost:8080/mcp")
  ) as Transport,
});

const rulesAgent = new A2AAgent({ url: "http://127.0.0.1:8000" });
const characterAgent = new A2AAgent({ url: "http://127.0.0.1:8001" });

const askRulesAgent = tool({
  name: "ask_rules_agent",
  description: "Ask the Rules Agent about D&D mechanics and rules",
  inputSchema: z.object({
    question: z.string().describe("The D&D rules question to ask"),
  }),
  callback: async (input) => String(await rulesAgent.invoke(input.question)),
});

const askCharacterAgent = tool({
  name: "ask_character_agent",
  description: "Ask the Character Agent about available characters",
  inputSchema: z.object({
    question: z.string().describe("The character question to ask"),
  }),
  callback: async (input) =>
    String(await characterAgent.invoke(input.question)),
});

const agent = new Agent({
  tools: [askRulesAgent, askCharacterAgent, mcpClient],
  systemPrompt: SYSTEM_PROMPT,
});
```

The orchestrator then exposes a thin Express API on port 8009 (`POST /inquire`, `GET /user/:name`, `GET /health`) that the rest of the world can call.

See the [A2A "as a tool" pattern](https://strandsagents.com/latest/documentation/docs/user-guide/concepts/multi-agent/agent-to-agent/#as-a-tool).

---

## Running the full fellowship

You'll need **four terminals**:

```bash
# Terminal 1 — Dice MCP server (Chapter 4)
npx tsx 4_mcp_integration/dice_roll_mcp_server.ts

# Terminal 2 — Rules Agent
npx tsx 5_a2a_integration/agents/rules_agent/rules_agent.ts

# Terminal 3 — Character Agent
npx tsx 5_a2a_integration/agents/character_agent/character_agent.ts

# Terminal 4 — Gamemaster Orchestrator
npx tsx 5_a2a_integration/agents/gamemaster_orchestrator/gamemaster_orchestrator.ts
```

## Try it

You can use `5_a2a_integration/test/test.http` with the VS Code REST Client extension, or curl directly:

```bash
# Rules question
curl -X POST http://0.0.0.0:8009/inquire \
  -H "Content-Type: application/json" \
  -d '{"question": "What are the rules for dexterity checks?"}'

# Create a character
curl -X POST http://0.0.0.0:8009/inquire \
  -H "Content-Type: application/json" \
  -d '{"question": "Create a character named Thorin, a Dwarf Fighter with strength 16, dexterity 12, constitution 15"}'

# Look up that character
curl -X POST http://0.0.0.0:8009/inquire \
  -H "Content-Type: application/json" \
  -d '{"question": "What is Thorin'\''s constitution?"}'

# Roll a d20
curl -X POST http://0.0.0.0:8009/inquire \
  -H "Content-Type: application/json" \
  -d '{"question": "Roll a d20 for initiative!"}'
```

## What's happening under the hood

1. The orchestrator receives your question
2. It picks the right tool: `ask_rules_agent`, `ask_character_agent`, or the MCP `roll_dice`
3. The downstream agent does its work and replies
4. The orchestrator weaves the results back into a single narrative response

This is the same pattern used in production multi-agent systems: a coordinator agent routes work to specialists.

## What you learned

- How `A2AExpressServer` exposes a Strands agent over HTTP
- How `A2AAgent` connects to a remote agent and how `tool()` wraps it as a callable tool
- How an orchestrator can mix MCP tools and A2A tools in one `Agent`
- How vector search (LanceDB + local embeddings) gives an agent grounded knowledge

---

[← Chapter 4](04-mcp-integration.md) · [Back to README](../README.md) · [Next: Chapter 6 →](06-ui-testing.md)
