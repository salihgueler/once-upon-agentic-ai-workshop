# Chapter 5 — The Grand Alliance: Agent-to-Agent

[← Chapter 4](04-mcp-integration.md) · [Back to README](../README.md) · [Next: Chapter 6 →](06-ui-testing.md)

---

![Chapter 5](../assets/header_5.png)

## Quest objective

So far each agent has worked alone. Now you'll let multiple agents collaborate, each with its own tools and expertise, using [Agent2Agent (A2A)](https://strandsagents.com/latest/documentation/docs/user-guide/concepts/multi-agent/agent-to-agent/).

You'll build a three-agent D&D system orchestrated by a central Game Master.

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

| Agent                       | Role                                      | File                             |
| --------------------------- | ----------------------------------------- | -------------------------------- |
| **Rules Agent**             | D&D rules lookup, backed by a vector DB   | `src/rules_agent.ts`             |
| **Character Agent**         | Character creation and persistent storage | `src/character_agent.ts`         |
| **Gamemaster Orchestrator** | Routes requests, calls dice MCP, narrates | `src/gamemaster_orchestrator.ts` |

---

## Part 1 — The Rules Agent

The Rules Agent looks up D&D rules from a local vector database. Before it can answer anything, you need to build the **knowledge base**.

### Build the knowledge base

1. Download the [D&D Basic Rules 2018 PDF](https://media.wizards.com/2018/dnd/downloads/DnD_BasicRules_2018.pdf). The file must be named `DnD_BasicRules_2018.pdf`.
2. Place it in `src/dnd-knowledge-base`
3. Create a file called `create_knowledge_base.ts`.
4. Install the LanceDB and Transformers `npm install pdf-parse @a2a-js/sdk @lancedb/lancedb @huggingface/transformers`
5. Paste the following:

```ts
/**
 * D&D Basic Rules Knowledge Base Creator
 * Creates a LanceDB vector knowledge base from the D&D Basic Rules PDF
 * Uses all-MiniLM-L6-v2 for local embeddings (same model as ChromaDB's default)
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import {
  pipeline,
  type FeatureExtractionPipeline,
} from "@huggingface/transformers";
import * as lancedb from "@lancedb/lancedb";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface KBChunk {
  id: string;
  text: string;
  page: number;
  paragraph: number;
  source: string;
}

interface LanceRecord extends KBChunk {
  vector: number[];
}

async function createEmbedder(): Promise<FeatureExtractionPipeline> {
  console.log("Loading embedding model (all-MiniLM-L6-v2)...");
  const pipelineFn = pipeline as (
    ...args: unknown[]
  ) => Promise<FeatureExtractionPipeline>;
  const extractor = await pipelineFn(
    "feature-extraction",
    "Xenova/all-MiniLM-L6-v2",
  );
  console.log("Embedding model loaded");
  return extractor;
}

async function embedTexts(
  extractor: FeatureExtractionPipeline,
  texts: string[],
): Promise<number[][]> {
  const vectors: number[][] = [];
  for (const text of texts) {
    const output = await extractor(text, { pooling: "mean", normalize: true });
    vectors.push(Array.from(output.data as Float32Array));
  }
  return vectors;
}

async function extractTextFromPdf(pdfPath: string): Promise<KBChunk[]> {
  const chunks: KBChunk[] = [];

  try {
    const { PDFParse } = await import("pdf-parse");
    const dataBuffer = fs.readFileSync(pdfPath);
    const data = new Uint8Array(dataBuffer);
    const parser = new PDFParse({ data });
    const result = await parser.getText();

    for (const page of result.pages) {
      const pageNum = page.num;
      if (!page.text.trim()) continue;

      const paragraphs = page.text.split("\n\n");

      for (let paraIdx = 0; paraIdx < paragraphs.length; paraIdx++) {
        const paragraph = paragraphs[paraIdx].trim();
        if (paragraph.length > 50) {
          chunks.push({
            id: `page_${pageNum}_para_${paraIdx}`,
            text: paragraph,
            page: pageNum,
            paragraph: paraIdx,
            source: "DnD_BasicRules_2018.pdf",
          });
        }
      }
    }
  } catch (e) {
    console.error(`Error reading PDF: ${e}`);
    return [];
  }

  return chunks;
}

async function createKnowledgeBase(pdfPath: string, dbPath: string) {
  console.log("Extracting text from PDF...");
  const chunks = await extractTextFromPdf(pdfPath);

  if (chunks.length === 0) {
    console.log("No text chunks extracted from PDF");
    return;
  }

  console.log(`Extracted ${chunks.length} text chunks`);

  const extractor = await createEmbedder();

  console.log("Generating embeddings and storing in LanceDB...");
  const db = await lancedb.connect(dbPath);

  const batchSize = 50;
  const allRecords: LanceRecord[] = [];

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const texts = batch.map((c) => c.text);
    const vectors = await embedTexts(extractor, texts);

    for (let j = 0; j < batch.length; j++) {
      allRecords.push({ ...batch[j], vector: vectors[j] });
    }

    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(chunks.length / batchSize);
    console.log(`Embedded batch ${batchNum}/${totalBatches}`);
  }

  await db.createTable(
    "dnd_basic_rules",
    allRecords as unknown as Record<string, unknown>[],
    { mode: "overwrite" },
  );

  console.log(`Knowledge base created successfully at: ${dbPath}`);
  console.log(`Total documents: ${allRecords.length}`);
}

// Main
const pdfFile = path.join(__dirname, "DnD_BasicRules_2018.pdf");

if (!fs.existsSync(pdfFile)) {
  console.log(`PDF file '${pdfFile}' not found!`);
  console.log("Please place DnD_BasicRules_2018.pdf in the utils/ directory.");
  process.exit(1);
}

const outputPath = path.join(__dirname, "dnd_knowledge_base");
await createKnowledgeBase(pdfFile, outputPath);
console.log("Knowledge base creation complete!");
```

5. Run the indexer:

   ```bash
   npx tsx src/dnd-knowledge-base/create-knowledge-base.ts
   ```

This script extracts text from the PDF, generates embeddings using the local `all-MiniLM-L6-v2` model (~80 MB, downloaded automatically on first run), and writes a LanceDB vector database to `src/dnd_knowledge_base/`. No external services or API keys needed.

When complete, you'll see `Knowledge base creation complete!` and a `dnd_basic_rules.lance` file inside the output folder.

### Wire up the agent

In `rules_agent.ts`:

```typescript
import { Agent, tool } from "@strands-agents/sdk";
import { BedrockModel } from "@strands-agents/sdk/models/bedrock";
import { A2AExpressServer } from "@strands-agents/sdk/a2a/express";
import z from "zod";
import * as path from "path";
import { fileURLToPath } from "url";
import {
  pipeline,
  type FeatureExtractionPipeline,
} from "@huggingface/transformers";
import * as lancedb from "@lancedb/lancedb";
import type { Table } from "@lancedb/lancedb";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class RulesKnowledgeBase {
  private dbPath: string;
  private table: Table | null = null;
  private extractor: FeatureExtractionPipeline | null = null;

  constructor() {
    const chapterRoot = path.resolve(__dirname, "..", "..");
    this.dbPath = path.join(chapterRoot, "utils", "dnd_knowledge_base");
    console.log(`KB path: ${this.dbPath}`);
  }

  private async init(): Promise<Table | null> {
    if (this.table) return this.table;
    try {
      console.log("Loading embedding model...");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pipelineFn = pipeline as (
        ...args: unknown[]
      ) => Promise<FeatureExtractionPipeline>;
      this.extractor = await pipelineFn(
        "feature-extraction",
        "Xenova/all-MiniLM-L6-v2",
      );
      console.log("Connecting to LanceDB...");
      const db = await lancedb.connect(this.dbPath);
      this.table = await db.openTable("dnd_basic_rules");
      console.log("Knowledge base ready");
      return this.table;
    } catch (e) {
      console.error(`Error connecting to KB: ${e}`);
      return null;
    }
  }

  async quickQuery(query: string): Promise<string> {
    console.log(`Querying KB with: ${query}`);
    const table = await this.init();
    if (!table || !this.extractor) return "KB unavailable";

    try {
      const output = await this.extractor(query, {
        pooling: "mean",
        normalize: true,
      });
      const queryVec = Array.from(output.data as Float32Array);
      const results = await table.vectorSearch(queryVec).limit(1).toArray();

      if (results.length > 0) {
        const doc = results[0] as { text: string; page: number };
        return `Page ${doc.page}: ${doc.text.slice(0, 100)}...`;
      }
      return "No rules found";
    } catch {
      return "KB error";
    }
  }
}

const rulesKb = new RulesKnowledgeBase();

const queryDndRules = tool({
  name: "query_dnd_rules",
  description: "Fast D&D rule lookup. Returns brief rule with page reference.",
  inputSchema: z.object({
    query: z.string().describe("The D&D rule query to look up"),
  }),
  callback: async (input) => {
    return rulesKb.quickQuery(input.query);
  },
});

const DESCRIPTION = `Specialized D&D 5e rules lookup agent that provides fast, authoritative rule clarifications from the Basic Rules.
Queries the LanceDB knowledge base containing indexed D&D content and returns brief, page-referenced rule explanations.
Designed for quick consultation by other agents or players during gameplay.`;

const SYSTEM_PROMPT = `You are a D&D rules expert. When asked about rules, use the query_dnd_rules tool once to find the relevant rule,
then provide a clear, concise answer with the page reference. Keep responses brief and focused on the specific rule requested.`;

const agent = new Agent({
  model: new BedrockModel({
    modelId: "global.anthropic.claude-haiku-4-5-20251001-v1:0",
  }),
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

In `src/character_agent.ts`:

```typescript
import { Agent, tool } from "@strands-agents/sdk";
import { BedrockModel } from "@strands-agents/sdk/models/bedrock";
import { A2AExpressServer } from "@strands-agents/sdk/a2a/express";
import z from "zod";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Stats {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

interface InventoryItem {
  item_name: string;
  quantity: number;
}

interface Character {
  character_id: string;
  name: string;
  character_class: string;
  race: string;
  gender: string;
  level: number;
  experience: number;
  stats: Stats;
  inventory: InventoryItem[];
  created_at: string;
}

interface CharactersDB {
  _default: Record<string, Character>;
}

const DB_PATH = path.join(__dirname, "characters.json");

function readDB(): CharactersDB {
  if (!fs.existsSync(DB_PATH)) {
    return { _default: {} };
  }
  return JSON.parse(fs.readFileSync(DB_PATH, "utf-8")) as CharactersDB;
}

function writeDB(db: CharactersDB): void {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

const findCharacterByName = tool({
  name: "find_character_by_name",
  description: "Find a character by name",
  inputSchema: z.object({
    name: z.string().describe("The character's name to search for"),
  }),
  callback: (input) => {
    console.log(`🔍 Searching for character with name: '${input.name}'`);
    const db = readDB();
    const entries = Object.values(db._default);
    const found = entries.find((c) => c.name === input.name);

    if (!found) {
      console.log(`❌ Character with name '${input.name}' not found`);
      return `❌ Character with name '${input.name}' not found`;
    }

    console.log(
      `✅ Found character: ${found.name} (ID: ${found.character_id}, ${found.character_class} ${found.race})`,
    );
    return JSON.stringify(found);
  },
});

const listAllCharacters = tool({
  name: "list_all_characters",
  description: "List all characters in the database",
  inputSchema: z.object({}),
  callback: () => {
    console.log("📋 Listing all characters in database");
    const db = readDB();
    const allChars = Object.values(db._default);

    if (allChars.length === 0) {
      console.log("❌ No characters found in database");
      return "📜 No characters found in the database";
    }

    console.log(`✅ Found ${allChars.length} character(s) in database`);
    for (const char of allChars) {
      console.log(`  - ${char.name} (${char.character_class} ${char.race})`);
    }
    return JSON.stringify(allChars);
  },
});

const createCharacter = tool({
  name: "create_character",
  description: `Character details respecting the GameCharacters object fields.
Roll a dice to generate the stats (ability scores).
When rolling ability scores, remember the traditional method: roll 4d6, drop the lowest die.`,
  inputSchema: z.object({
    name: z.string().describe("Character's name"),
    character_class: z.string().describe("D&D class (Fighter, Wizard, etc.)"),
    race: z.string().describe("D&D race (Human, Elf, etc.)"),
    gender: z.string().describe("Character's gender"),
    stats_dict: z
      .object({
        strength: z.number(),
        dexterity: z.number(),
        constitution: z.number(),
        intelligence: z.number(),
        wisdom: z.number(),
        charisma: z.number(),
      })
      .describe(
        "Dictionary with strength, dexterity, constitution, intelligence, wisdom, charisma",
      ),
  }),
  callback: (input) => {
    const characterId = randomUUID();
    console.log(characterId);

    const stats: Stats = {
      strength: input.stats_dict.strength ?? 10,
      dexterity: input.stats_dict.dexterity ?? 10,
      constitution: input.stats_dict.constitution ?? 10,
      intelligence: input.stats_dict.intelligence ?? 10,
      wisdom: input.stats_dict.wisdom ?? 10,
      charisma: input.stats_dict.charisma ?? 10,
    };
    console.log(stats);

    const character: Character = {
      character_id: characterId,
      name: input.name,
      character_class: input.character_class,
      race: input.race,
      gender: input.gender,
      level: 1,
      experience: 0,
      stats,
      inventory: [
        { item_name: "Starting Equipment Pack", quantity: 1 },
        { item_name: "Gold Pieces", quantity: 100 },
      ],
      created_at: new Date().toISOString(),
    };
    console.log(character);

    const db = readDB();
    const nextKey = String(Object.keys(db._default).length + 1);
    db._default[nextKey] = character;
    writeDB(db);
    console.log("Inserted");

    return JSON.stringify(character);
  },
});

const DESCRIPTION = `Specialized D&D character management agent that handles character creation, storage, and retrieval.
Creates new characters with proper ability score generation (4d6 drop lowest), manages character data in persistent storage,
and provides character lookup services. Maintains complete character profiles including stats, inventory, and progression data for D&D campaigns.`;

const SYSTEM_PROMPT = `You are a D&D character management specialist. When creating characters, always roll ability scores using the traditional
method: roll 4d6 and drop the lowest die for each of the six abilities (Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma).
Use the appropriate tools to create, find, or list characters as requested. Provide clear confirmations when characters are created and
helpful summaries when characters are found. Keep responses focused and include relevant character details like class, race, and key stats.`;

const agent = new Agent({
  // TODO: Configure the Character Agent with:
  model: new BedrockModel({
    modelId: "global.anthropic.claude-haiku-4-5-20251001-v1:0",
  }),
  tools: [findCharacterByName, listAllCharacters, createCharacter],
  // - systemPrompt: SYSTEM_PROMPT
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
import { BedrockModel } from "@strands-agents/sdk/models/bedrock";
import { A2AAgent } from "@strands-agents/sdk/a2a";
import express from "express";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import z from "zod";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "healthy" });
});

// Connect to the MCP server at http://localhost:8080/mcp
const mcpClient = new McpClient({
  transport: new StreamableHTTPClientTransport(
    new URL("http://localhost:8080/mcp"),
  ),
});

// System prompt for the agent
const SYSTEM_PROMPT = `You are a D&D Game Master orchestrator with access to specialized agents and tools.

Available agents:
- Rules Agent (http://127.0.0.1:8000) - For D&D mechanics and rules
- Character Agent (http://127.0.0.1:8001) - For character creation and management

To communicate with agents, use the A2A protocol.

Available D&D dice types:
- d4 (4-sided die) - Used for damage rolls of small weapons like daggers
- d6 (6-sided die) - Used for damage rolls of weapons like shortswords, spell damage
- d8 (8-sided die) - Used for damage rolls of weapons like longswords, rapiers
- d10 (10-sided die) - Used for damage rolls of heavy weapons, percentile rolls
- d12 (12-sided die) - Used for damage rolls of great weapons like greataxes
- d20 (20-sided die) - Used for ability checks, attack rolls, saving throws
- d100 (percentile die) - Used for random tables, wild magic surges

When you reply, please reply with a JSON (and ONLY A JSON, no text other than the json).
Always respond in JSON format:
{
    "response": "Your narrative response as Game Master",
    "actions_suggestions": ["Action 1", "Action 2", "Action 3"],
    "details": "Brief summary of tools/agents used",
    "dices_rolls": [{"dice_type": "d20", "result": 15, "reason": "attack roll"}]
}

Be creative, engaging, and use your available tools to enhance the D&D experience.

Remember, the response should ONLY be a PURE json with no markdown or text around it.
`;

const rulesAgent = new A2AAgent({ url: "http://127.0.0.1:8000" });
const characterAgent = new A2AAgent({ url: "http://127.0.0.1:8001" });

const askRulesAgent = tool({
  name: "ask_rules_agent",
  description: "Ask the Rules Agent about D&D mechanics and rules",
  inputSchema: z.object({
    question: z.string().describe("The D&D rules question to ask"),
  }),
  callback: async (input) => {
    const result = await rulesAgent.invoke(input.question);
    return String(result);
  },
});

const askCharacterAgent = tool({
  name: "ask_character_agent",
  description: "Ask the Character Agent about available characters",
  inputSchema: z.object({
    question: z.string().describe("The D&D rules characters to ask"),
  }),
  callback: async (input) => {
    const result = await characterAgent.invoke(input.question);
    return String(result);
  },
});

const agent = new Agent({
  model: new BedrockModel({
    modelId: "global.anthropic.claude-haiku-4-5-20251001-v1:0",
  }),
  tools: [askRulesAgent, askCharacterAgent, mcpClient],
  systemPrompt: SYSTEM_PROMPT,
});

app.get("/user/:name", async (req, res) => {
  const { name } = req.params;
  console.log(`Looking up character: ${name}`);
  try {
    const result = await characterAgent.invoke(
      `Find the character named "${name}" and return ONLY the raw JSON data from the find_character_by_name tool, nothing else.`,
    );
    const text = String(result);
    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      res.json(JSON.parse(jsonMatch[0]));
    } else {
      res.status(404).json({ error: "Character not found" });
    }
  } catch (e) {
    console.error(`Error fetching character: ${e}`);
    res.status(500).json({ error: "Failed to fetch character" });
  }
});

app.post("/inquire", async (req, res) => {
  console.log("Processing request...");
  try {
    const { question } = req.body as { question: string };

    // TODO: Process the request using the gamemaster agent
    const response = await agent.invoke(question);
    const content = String(response);

    res.json({ response: content });
  } catch (e) {
    console.error(`Error occurred: ${e}`);
    res.status(500).json({ error: "Internal server error" });
  }
});

const PORT = 8009;
app.listen(PORT, () => {
  console.log(`🏰 D&D Game Master API running on http://localhost:${PORT}`);
});
```

The orchestrator then exposes a thin Express API on port 8009 (`POST /inquire`, `GET /user/:name`, `GET /health`) that the rest of the world can call.

See the [A2A "as a tool" pattern](https://strandsagents.com/latest/documentation/docs/user-guide/concepts/multi-agent/agent-to-agent/#as-a-tool).

---

## Running the full fellowship

You'll need **four terminals**:

```bash
# Terminal 1 — Dice MCP server (Chapter 4)
npx tsx mcp-server/server.ts

# Terminal 2 — Rules Agent
npx tsx src/rules_agent.ts

# Terminal 3 — Character Agent
npx tsx src/character-agent.ts

# Terminal 4 — Gamemaster Orchestrator
npx tsx src/gamemaster_orchestrator.ts
```

## Try it

You can curl to see the impact directly:

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
