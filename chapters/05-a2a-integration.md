# Chapter 5 — The Grand Alliance: Agent-to-Agent

[← Chapter 4](04-mcp-integration.md) · [Back to README](../README.md) · [Next: Chapter 6 →](06-ui-testing.md)

---

![Chapter 5](../assets/header_5.png)

## Quest objective

So far each agent has worked alone. Now you'll let multiple agents collaborate, each with its own tools and expertise, using [Agent2Agent (A2A)](https://strandsagents.com/).

You'll build a three-agent D&D system orchestrated by a central Game Master. Create each file under your root `src/`; the repository does not pre-populate these exercise implementations.

> **Create:** `src/local-rules.ts`, `src/rules-agent.ts`, `src/character-store.ts`, `src/character-agent.ts`, `src/game-master-schema.ts`, and `src/gamemaster-orchestrator.ts`<br>
> **Reference after attempting the exercise:** [`completed/05-a2a-integration/src/`](../completed/05-a2a-integration/src/)

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

| Component                   | Role                                            | File                              |
| --------------------------- | ----------------------------------------------- | --------------------------------- |
| **Rules Agent**             | D&D rules lookup from a small local dataset     | `src/rules-agent.ts`              |
| **Character Agent**         | Character creation and JSON-file storage        | `src/character-agent.ts`          |
| **Gamemaster Orchestrator** | Routes to specialists + dice MCP, narrates      | `src/gamemaster-orchestrator.ts`  |

Two things are shared across agents and worth noting up front:

- Every agent gets its model from **`createModel()`** (`src/model.ts`) — local Ollama by default, Bedrock when `MODEL_PROVIDER=bedrock`.
- The A2A protocol is served by **`A2AExpressServer`** and consumed by **`A2AAgent`**, both from the current Strands SDK.

---

## Part 1 — The Rules Agent

The Rules Agent answers mechanics questions. To keep the workshop runnable with **zero downloads or vector databases**, it looks rules up in a small local dataset.

### Step 1 — The local rules dataset (`src/local-rules.ts`)

A handful of keyword-tagged, page-referenced snippets and a tiny scorer:

```typescript
export interface Rule {
  topic: string;
  page: number;
  text: string;
  keywords: string[];
}

export const RULES: Rule[] = [
  {
    topic: "Ability Checks",
    page: 58,
    text: "Roll a d20 and add the relevant ability modifier; compare to the DC.",
    keywords: ["ability", "check", "dexterity", "strength", "dc", "d20"],
  },
  {
    topic: "Saving Throws",
    page: 59,
    text: "A saving throw is a d20 roll plus the relevant ability modifier, made to resist a threat such as a spell, trap, or poison, against a DC set by the effect.",
    keywords: ["saving", "throw", "save", "resist", "spell", "poison"],
  },
  {
    topic: "Attack Rolls",
    page: 73,
    text: "To attack, roll a d20 and add your attack modifier. If the total meets or exceeds the target's Armor Class (AC), the attack hits and you roll damage.",
    keywords: ["attack", "roll", "hit", "armor", "class", "ac", "damage"],
  },
  {
    topic: "Advantage & Disadvantage",
    page: 57,
    text: "With advantage, roll two d20s and take the higher. With disadvantage, take the lower. They do not stack; you have one or the other, never multiple.",
    keywords: ["advantage", "disadvantage", "two", "d20", "higher", "lower"],
  },
  {
    topic: "Initiative",
    page: 73,
    text: "At the start of combat, every combatant rolls a Dexterity check for initiative. The DM orders turns from highest to lowest total.",
    keywords: ["initiative", "combat", "turn", "order", "dexterity"],
  },
  {
    topic: "Ability Score Generation",
    page: 12,
    text: "To generate ability scores, roll four d6, drop the lowest die, and total the remaining three. Do this six times, then assign the totals to your abilities.",
    keywords: ["ability", "score", "generate", "4d6", "drop", "lowest", "stats"],
  },
];

export function lookupRule(query: string): Rule | null {
  const words = query.toLowerCase().split(/\W+/).filter(Boolean);
  let best: Rule | null = null;
  let bestScore = 0;
  for (const rule of RULES) {
    const score = rule.keywords.reduce(
      (acc, kw) => acc + (words.includes(kw) ? 1 : 0),
      0,
    );
    if (score > bestScore) {
      bestScore = score;
      best = rule;
    }
  }
  return bestScore > 0 ? best : null;
}
```

> **RAG is optional.** The Rules Agent only depends on the `lookupRule(query)` signature, not on where the data comes from. If you want real retrieval, [Chapter 9](09-rag-vector-store.md) swaps this for a LanceDB vector search with local embeddings — a two-line change to this agent.

### Step 2 — Serve the agent over A2A (`src/rules-agent.ts`)

```typescript
import { Agent, tool } from "@strands-agents/sdk";
import { A2AExpressServer } from "@strands-agents/sdk/a2a/express";
import { z } from "zod";
import { createModel } from "./model.js";
import { lookupRule } from "./local-rules.js";

const queryDndRules = tool({
  name: "query_dnd_rules",
  description: "Fast D&D 5e rule lookup. Returns a brief rule with a page reference.",
  inputSchema: z.object({
    query: z.string().describe("The D&D rule to look up, e.g. 'dexterity check'"),
  }),
  callback: (input) => {
    const rule = lookupRule(input.query);
    if (!rule) return "No matching rule found in the Basic Rules.";
    return `${rule.topic} (p.${rule.page}): ${rule.text}`;
  },
});

const agent = new Agent({
  model: createModel(),
  tools: [queryDndRules],
  systemPrompt: `You are a D&D rules expert. Call query_dnd_rules once, then answer
    concisely, always citing the page reference the tool returns.`,
});

const server = new A2AExpressServer({
  agent,
  name: "Rules Agent",
  description: "Specialized D&D 5e rules-lookup agent with page-referenced answers.",
  port: 8000,
});

await server.serve();
console.log("🧙 Rules Agent running on http://127.0.0.1:8000");
```

`A2AExpressServer` wraps the agent in an A2A-compatible HTTP server and publishes its agent card at `/.well-known/agent-card.json`.

---

## Part 2 — The Character Agent

The Character Agent manages heroes with three tools:

- `create_character` — persists a new character (you roll its stats first)
- `find_character_by_name` — case-insensitive lookup
- `list_all_characters` — the full roster

Storage is a plain `characters.json` written next to the agent. To keep files small and each concern in one place, the storage lives in its own module.

### Step 1 — Storage (`src/character-store.ts`)

```typescript
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "characters.json");

export interface Stats {
  strength: number; dexterity: number; constitution: number;
  intelligence: number; wisdom: number; charisma: number;
}
export interface Character {
  character_id: string; name: string; character_class: string; race: string;
  gender: string; level: number; experience: number; stats: Stats;
  inventory: { item_name: string; quantity: number }[]; created_at: string;
}

interface CharactersDB {
  characters: Record<string, Character>;
}

function readDB(): CharactersDB {
  if (!fs.existsSync(DB_PATH)) return { characters: {} };
  return JSON.parse(fs.readFileSync(DB_PATH, "utf-8")) as CharactersDB;
}

function writeDB(db: CharactersDB): void {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

export function listCharacters(): Character[] {
  return Object.values(readDB().characters);
}

export function findCharacter(name: string): Character | undefined {
  return listCharacters().find((c) => c.name.toLowerCase() === name.toLowerCase());
}

export interface NewCharacter {
  name: string;
  character_class: string;
  race: string;
  gender: string;
  stats: Stats;
}

export function saveCharacter(input: NewCharacter): Character {
  const character: Character = {
    character_id: randomUUID(),
    ...input,
    level: 1,
    experience: 0,
    inventory: [
      { item_name: "Starting Equipment Pack", quantity: 1 },
      { item_name: "Gold Pieces", quantity: 100 },
    ],
    created_at: new Date().toISOString(),
  };
  const db = readDB();
  db.characters[character.character_id] = character;
  writeDB(db);
  return character;
}
```

> `DB_PATH` resolves next to this module, so the store lands at `src/characters.json`.
> Compare with
> [`completed/05-a2a-integration/src/character-store.ts`](../completed/05-a2a-integration/src/character-store.ts)
> when you are done.

### Step 2 — The agent (`src/character-agent.ts`)

```typescript
import { Agent, tool } from "@strands-agents/sdk";
import { A2AExpressServer } from "@strands-agents/sdk/a2a/express";
import { z } from "zod";
import { createModel } from "./model.js";
import { findCharacter, listCharacters, saveCharacter } from "./character-store.js";

const statsSchema = z.object({
  strength: z.number(), dexterity: z.number(), constitution: z.number(),
  intelligence: z.number(), wisdom: z.number(), charisma: z.number(),
});

const createCharacter = tool({
  name: "create_character",
  description: "Create a character. Roll ability scores with 4d6-drop-lowest first.",
  inputSchema: z.object({
    name: z.string(),
    character_class: z.string().describe("Fighter, Wizard, etc."),
    race: z.string().describe("Human, Elf, etc."),
    gender: z.string(),
    stats: statsSchema,
  }),
  callback: (input) => JSON.stringify(saveCharacter(input)),
});

The other two tools follow the same shape — a schema, and a callback that returns a
string:

```typescript
const findCharacterByName = tool({
  name: "find_character_by_name",
  description: "Find a stored character by name.",
  inputSchema: z.object({ name: z.string().describe("The character's name") }),
  callback: (input) => {
    const found = findCharacter(input.name);
    return found ? JSON.stringify(found) : `❌ Character '${input.name}' not found`;
  },
});

const listAllCharacters = tool({
  name: "list_all_characters",
  description: "List every character in the roster.",
  inputSchema: z.object({}),
  callback: () => {
    const all = listCharacters();
    return all.length ? JSON.stringify(all) : "📜 No characters yet";
  },
});
```

Then register all three:

```typescript
const agent = new Agent({
  model: createModel(),
  tools: [findCharacterByName, listAllCharacters, createCharacter],
  systemPrompt: `You are a D&D character-management specialist. Roll ability scores with
    4d6 drop lowest, then use the tools to create, find, or list characters.`,
});

const server = new A2AExpressServer({
  agent,
  name: "Character Creator Agent",
  description: "Creates, stores, and looks up D&D characters.",
  port: 8001,
});

await server.serve();
console.log("⚔️  Character Agent running on http://127.0.0.1:8001");
```

---

## Part 3 — The Gamemaster Orchestrator

The orchestrator is itself a Strands agent that mixes **three** tool sources:

- the two specialists, reached via `A2AAgent` and wrapped as `tool()`s
- the dice MCP server from Chapter 4, passed in **directly** as an `McpClient`

It also produces **typed structured output**. Instead of asking the model for JSON and then parsing/regex-stripping it, we give the agent a Zod schema. The SDK validates the model's output against it and returns a typed object on `result.structuredOutput` — **no JSON parsing and no markdown-fence stripping**.

### Step 1 — The output schema (`src/game-master-schema.ts`)

```typescript
import { z } from "zod";

export const gameMasterSchema = z.object({
  response: z.string().describe("The narrative response, in the Game Master's voice"),
  action_suggestions: z.array(z.string()).describe("A few next actions the player could take"),
  details: z.string().describe("Brief summary of which tools or agents were used"),
  dice_rolls: z.array(z.object({
    dice_type: z.string().describe("The die used, e.g. 'd20'"),
    result: z.number().describe("The rolled total"),
    reason: z.string().describe("Why the roll was made"),
  })),
});

export type GameMasterResponse = z.infer<typeof gameMasterSchema>;
```

### Step 2 — The orchestrator (`src/gamemaster-orchestrator.ts`)

```typescript
import { Agent, McpClient, tool } from "@strands-agents/sdk";
import { A2AAgent } from "@strands-agents/sdk/a2a";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import express from "express";
import { z } from "zod";
import { createModel } from "./model.js";
import { gameMasterSchema, type GameMasterResponse } from "./game-master-schema.js";

const rulesAgent = new A2AAgent({ url: "http://127.0.0.1:8000" });
const characterAgent = new A2AAgent({ url: "http://127.0.0.1:8001" });

const askRulesAgent = tool({
  name: "ask_rules_agent",
  description: "Ask the Rules Agent about D&D mechanics and rules.",
  inputSchema: z.object({ question: z.string().describe("The rules question") }),
  callback: async (input) => (await rulesAgent.invoke(input.question)).toString(),
});
const askCharacterAgent = tool({
  name: "ask_character_agent",
  description: "Ask the Character Agent to create, find, or list characters.",
  inputSchema: z.object({ question: z.string().describe("The character request") }),
  callback: async (input) => (await characterAgent.invoke(input.question)).toString(),
});

const diceMcp = new McpClient({
  transport: new StreamableHTTPClientTransport(
    new URL("http://localhost:8080/mcp"),
  ) as Transport,
});

const gamemaster = new Agent({
  model: createModel(),
  tools: [askRulesAgent, askCharacterAgent, diceMcp],
  systemPrompt: `You are a D&D Game Master orchestrating specialists and tools.
    Use ask_rules_agent for rules, ask_character_agent for characters, and roll_dice
    for every roll. Populate dice_rolls and action_suggestions in your answer.`,
  structuredOutputSchema: gameMasterSchema, // ← typed, validated output
});
```

### Step 3 — A thin Express API on port 8009

```typescript
const app = express();
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "healthy" }));

app.post("/inquire", async (req, res) => {
  const { question } = req.body as { question?: string };
  if (!question) return void res.status(400).json({ error: "Missing 'question'" });
  const result = await gamemaster.invoke(question);
  // Already typed and validated — no JSON.parse, no fence stripping.
  const structured = result.structuredOutput as GameMasterResponse | undefined;
  res.json(structured ?? { response: result.toString(), action_suggestions: [], details: "", dice_rolls: [] });
});

app.listen(8009, () => console.log("🏰 D&D Game Master API running on http://localhost:8009"));
```

---

## Running the full fellowship

You'll need **four terminals**, all from the project root. Start Ollama first (or set `MODEL_PROVIDER=bedrock`):

```bash
# Terminal 1 — Dice MCP server (from Chapter 4)
npm run mcp:server

# Terminal 2 — Rules Agent
npm run agent:rules

# Terminal 3 — Character Agent
npm run agent:characters

# Terminal 4 — Gamemaster Orchestrator
npm run game-master
```

## Try it

```bash
# Rules question
curl -X POST http://127.0.0.1:8009/inquire \
  -H "Content-Type: application/json" \
  -d '{"question": "What are the rules for dexterity checks?"}'

# Create a character
curl -X POST http://127.0.0.1:8009/inquire \
  -H "Content-Type: application/json" \
  -d '{"question": "Create a character named Thorin, a Dwarf Fighter"}'

# Roll a d20
curl -X POST http://127.0.0.1:8009/inquire \
  -H "Content-Type: application/json" \
  -d '{"question": "Roll a d20 for initiative!"}'
```

Each response is the validated `gameMasterSchema` object: a `response`, `action_suggestions`, `details`, and a `dice_rolls` array.

> **If a character isn't saved, just ask again.** Local models occasionally *narrate*
> creating a character without actually calling `create_character`. The reply looks
> right, but no `src/characters.json` appears and `curl http://127.0.0.1:8009/user/<name>`
> returns 404. That is model behaviour, not a bug in your code — re-send the request, or
> phrase it more explicitly ("Use create_character to create ..."). Watch the Character
> Agent's terminal: a real tool call prints a `🔧 Tool #1: create_character` line.

## What's happening under the hood

1. The orchestrator receives your question
2. It picks the right tool: `ask_rules_agent`, `ask_character_agent`, or the MCP `roll_dice`
3. The downstream agent (or MCP server) does its work and replies
4. The SDK validates the orchestrator's final answer against `gameMasterSchema` and returns it as a typed object

This is the pattern behind production multi-agent systems: a coordinator routes work to specialists and returns a strongly-typed result.

## What you learned

- How `A2AExpressServer` exposes a Strands agent over HTTP, and `A2AAgent` consumes it
- How `tool()` wraps a remote `A2AAgent` as a callable tool
- How one `Agent` can mix A2A tools and an MCP client in a single `tools` array
- How `structuredOutputSchema` gives you typed, validated output with **no JSON parsing or fence stripping**
- Why a small local dataset keeps the workshop runnable, with RAG as an optional upgrade

---

[← Chapter 4](04-mcp-integration.md) · [Back to README](../README.md) · [Next: Chapter 6 →](06-ui-testing.md)
