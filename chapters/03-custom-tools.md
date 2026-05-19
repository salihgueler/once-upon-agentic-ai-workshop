# Chapter 3 — Forging Custom Tools

[← Chapter 2](02-built-in-tools.md) · [Back to README](../README.md) · [Next: Chapter 4 →](04-mcp-integration.md)

---

![Chapter 3](../assets/header_3.png)

## Quest objective

Build the legendary **Dice of Destiny** — a custom tool that rolls a die with a configurable number of faces, exposed to the agent so it can roll dice itself.

## How custom tools work

A Strands custom tool is built with the `tool()` factory:

| Field         | Purpose                                                                 |
| ------------- | ----------------------------------------------------------------------- |
| `name`        | The identifier the agent uses to invoke the tool                        |
| `description` | Tells the agent _when_ and _how_ to use the tool                        |
| `inputSchema` | A [Zod](https://zod.dev/) schema (or JSON Schema) describing parameters |
| `callback`    | The function executed when the tool is called                           |

See the [custom tools docs](https://strandsagents.com/latest/documentation/docs/user-guide/concepts/tools/custom-tools/).

## Step 1 — Imports

```typescript
import { Agent, tool } from "@strands-agents/sdk";
import z from "zod";
```

## Step 2 — Define the input schema

`.description` is read by the agent and helps it reason about the parameter:

```typescript
const rollDice = tool({
  name: "roll_dice",
  description: "🎲 Roll a dice with a specified number of faces.",
  inputSchema: z.object({
    faces: z.number().default(6).describe("Number of faces on the dice"),
  }),
});
```

## Step 3 — Implement the callback

```typescript
const rollDice = tool({
  name: "roll_dice",
  description: "🎲 Roll a dice with a specified number of faces.",
  inputSchema: z.object({
    faces: z.number().default(6).describe("Number of faces on the dice"),
  }),
  callback: (input) => {
    const faces = input.faces;
    if (faces < 1) throw new Error("Dice must have at least 1 face");
    const result = Math.floor(Math.random() * faces) + 1;
    return `Rolled a d${faces} and got: ${result}`;
  },
});
```

## Step 4 — Equip the agent

The agent can only call tools listed in its `tools` array:

```typescript
const diceMaster = new Agent({
  tools: [rollDice],
  systemPrompt: "...",
});
```

## Step 5 — Run it

```bash
npx tsx src/agent.ts
```

Watch the agent:

1. Read the character-creation request
2. Plan how many rolls it needs (4 abilities × 4d6 each)
3. Call `roll_dice` repeatedly
4. Apply the "drop the lowest die" rule
5. Present the final ability scores

## Reference solution

```typescript
import { Agent, tool } from "@strands-agents/sdk";
import z from "zod";

const rollDice = tool({
  name: "roll_dice",
  description: "🎲 Roll a dice with a specified number of faces.",
  inputSchema: z.object({
    faces: z.number().default(6).describe("Number of faces on the dice"),
  }),
  callback: (input) => {
    const faces = input.faces;
    if (faces < 1) throw new Error("Dice must have at least 1 face");
    const result = Math.floor(Math.random() * faces) + 1;
    return `Rolled a d${faces} and got: ${result}`;
  },
});

const diceMaster = new Agent({
  tools: [rollDice],
  systemPrompt: `You are Lady Luck, the mystical keeper of dice and fortune in D&D adventures.
    You speak with theatrical flair and always announce dice rolls with appropriate drama.
    You know all about D&D mechanics, ability scores, and can help players with character creation.
    When rolling ability scores, remember the traditional method: roll 4d6, drop the lowest die.`,
});

await diceMaster.invoke(
  "Help me create a new D&D character! Roll the strength, wisdom, charisma and intelligence abilities scores using 4d6 drop lowest method.",
);
```

## What you learned

- The four parts of a Strands custom tool
- How Zod schemas double as both validation and agent-facing documentation
- Why a tool only fires if it's in the agent's `tools` array

---

[← Chapter 2](02-built-in-tools.md) · [Back to README](../README.md) · [Next: Chapter 4 →](04-mcp-integration.md)
