import { Agent, McpClient, tool } from "@strands-agents/sdk";
import { A2AAgent } from "@strands-agents/sdk/a2a";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import express from "express";
import { z } from "zod";
import { findCharacter } from "./character-store.js";
import { createModel } from "./model.js";
import { gameMasterSchema, type GameMasterResponse } from "./game-master-schema.js";

const PORT = 8009;

// Remote specialists, wrapped as tools the orchestrator can call.
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

// The dice MCP server, passed straight in as a tool provider.
const diceMcp = new McpClient({
  transport: new StreamableHTTPClientTransport(
    new URL("http://localhost:8080/mcp"),
  ) as Transport,
});

const SYSTEM_PROMPT = `You are a D&D Game Master orchestrating specialists and tools.
- Use ask_rules_agent for D&D mechanics and rules.
- Use ask_character_agent for character creation, lookup, and listing.
- Use the roll_dice tool for every dice roll — never invent a result.
Narrate with flair. Populate dice_rolls with every roll you made, and
action_suggestions with a few things the player could do next.`;

// structuredOutputSchema makes the SDK validate and return a typed object —
// we never parse JSON or strip markdown fences from the model's text.
const gamemaster = new Agent({
  model: createModel(),
  tools: [askRulesAgent, askCharacterAgent, diceMcp],
  systemPrompt: SYSTEM_PROMPT,
  structuredOutputSchema: gameMasterSchema,
});

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "healthy" });
});

app.post("/inquire", async (req, res) => {
  const { question } = req.body as { question?: string };
  if (!question) {
    res.status(400).json({ error: "Missing 'question'" });
    return;
  }
  try {
    const result = await gamemaster.invoke(question);
    // Typed, already-validated output. No JSON.parse, no fence stripping.
    const structured = result.structuredOutput as GameMasterResponse | undefined;
    res.json(structured ?? { response: result.toString(), action_suggestions: [], details: "", dice_rolls: [] });
  } catch (e) {
    console.error(`Error handling /inquire: ${String(e)}`);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/user/:name", (req, res) => {
  const character = findCharacter(req.params.name);
  if (!character) {
    res.status(404).json({ error: "Character not found" });
    return;
  }
  res.json(character);
});

app.listen(PORT, "127.0.0.1", () => {
  console.log(`🏰 D&D Game Master API running on http://127.0.0.1:${PORT}`);
});
