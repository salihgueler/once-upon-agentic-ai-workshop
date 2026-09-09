import { Agent, tool } from "@strands-agents/sdk";
import { A2AExpressServer } from "@strands-agents/sdk/a2a/express";
import { z } from "zod";
import { createModel } from "./model.js";
import { findCharacter, listCharacters, saveCharacter } from "./character-store.js";

const PORT = 8001;

const statsSchema = z.object({
  strength: z.number(),
  dexterity: z.number(),
  constitution: z.number(),
  intelligence: z.number(),
  wisdom: z.number(),
  charisma: z.number(),
});

const findCharacterByName = tool({
  name: "find_character_by_name",
  description: "Find a stored character by name.",
  inputSchema: z.object({ name: z.string().describe("The character's name") }),
  callback: (input) => {
    const found = findCharacter(input.name);
    return found
      ? JSON.stringify(found)
      : `❌ Character '${input.name}' not found`;
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

const createCharacter = tool({
  name: "create_character",
  description:
    "Create a character. Roll ability scores with 4d6-drop-lowest before calling this.",
  inputSchema: z.object({
    name: z.string(),
    character_class: z.string().describe("Fighter, Wizard, etc."),
    race: z.string().describe("Human, Elf, etc."),
    gender: z.string(),
    stats: statsSchema,
  }),
  callback: (input) => JSON.stringify(saveCharacter(input)),
});

const DESCRIPTION = `Specialized D&D character-management agent. Creates characters with
proper 4d6-drop-lowest ability scores, persists them to storage, and looks them up by
name or lists the full roster.`;

const SYSTEM_PROMPT = `You are a D&D character-management specialist. When creating a
character, roll ability scores with 4d6 drop lowest for each of the six abilities. Use
the tools to create, find, or list characters, and confirm results with class, race,
and key stats.`;

const agent = new Agent({
  model: createModel(),
  tools: [findCharacterByName, listAllCharacters, createCharacter],
  systemPrompt: SYSTEM_PROMPT,
});

const server = new A2AExpressServer({
  agent,
  name: "Character Creator Agent",
  description: DESCRIPTION,
  host: "127.0.0.1",
  port: PORT,
});

await server.serve();
console.log(`⚔️  Character Agent running on http://127.0.0.1:${PORT}`);
