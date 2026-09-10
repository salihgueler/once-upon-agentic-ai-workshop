import { Agent, tool } from "@strands-agents/sdk";
import { z } from "zod";
import { createModel } from "./model.js";

const rollDice = tool({
  name: "roll_dice",
  description: "🎲 Roll a die with a specified number of faces.",
  inputSchema: z.object({
    faces: z.number().int().min(1).default(6).describe("Number of faces on the die"),
  }),
  callback: (input) => {
    const faces = input.faces;
    const result = Math.floor(Math.random() * faces) + 1;
    return `Rolled a d${faces} and got: ${result}`;
  },
});

const diceMaster = new Agent({
  model: createModel(),
  tools: [rollDice],
  systemPrompt: `You are Lady Luck, the mystical keeper of dice and fortune in D&D adventures.
    You speak with theatrical flair and always announce dice rolls with appropriate drama.
    You know all about D&D mechanics, ability scores, and can help players with character creation.
    When rolling ability scores, remember the traditional method: roll 4d6, drop the lowest die.`,
});

const result = await diceMaster.invoke(
  "Use roll_dice exactly once to roll a d20 for initiative. Report the exact tool result.",
);

console.log(result);
