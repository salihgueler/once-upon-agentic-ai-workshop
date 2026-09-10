# Chapter 2 — The Adventurer's Arsenal: Built-in Tools

[← Chapter 1](01-strands-basics.md) · [Back to README](../README.md) · [Next: Chapter 3 →](03-custom-tools.md)

---

![Chapter 2](../assets/header_2.png)

## Quest objective

Tools are the primary way to extend an agent's capabilities — they let it fetch data, run shell commands, and edit files. In this chapter you'll replace the Chapter 1 implementation in `src/agent.ts` with an agent equipped with the built-in `httpRequest` tool.

> **Replace:** `src/agent.ts`<br>
> **Reference after attempting the exercise:** [`completed/02-built-in-tools/src/agent.ts`](../completed/02-built-in-tools/src/agent.ts)

> **Local models and tool use** — Tool calling requires a model trained for it. `gemma4:latest` is the workshop default because it was verified with Strands custom, HTTP, and MCP tools. If you swap models and tool calls appear as plain JSON text instead of executing, that is a model-compatibility failure—not a successful tool call.

## Built-in (vended) tools

Strands ships a library of vended tools you import from dedicated subpaths of `@strands-agents/sdk`:

- `httpRequest` — fetch web pages and call HTTP APIs
- `bash` — execute shell commands on the host
- `fileEditor` — read and write files

```typescript
import { httpRequest } from "@strands-agents/sdk/vended-tools/http-request";
import { bash } from "@strands-agents/sdk/vended-tools/bash";
import { fileEditor } from "@strands-agents/sdk/vended-tools/file-editor";
```

Each tool lives under its own subpath (`@strands-agents/sdk/vended-tools/<name>`) so you only pull in what you use.

## Step 1 — Import the HTTP tool

```typescript
import { httpRequest } from "@strands-agents/sdk/vended-tools/http-request";
```

## Step 2 — Equip the agent

Pass tools in the `tools` array. Keep using `createModel()` so this still runs locally:

```typescript
import { Agent } from "@strands-agents/sdk";
import { httpRequest } from "@strands-agents/sdk/vended-tools/http-request";
import { createModel } from "./model.js";

const agent = new Agent({
  model: createModel(),
  tools: [httpRequest],
});
```

## Step 3 — Run it

Ask a question that requires fetching a page:

```typescript
const result = await agent.invoke(`
  Use the HTTP tool to fetch https://www.dnd5eapi.co/api/2014/classes
  and name the first three classes in the JSON response.
`);
console.log(result);
```

```bash
npm run agent
```

The agent will:

1. Receive the request for D&D class data
2. Call `httpRequest` instead of inventing an answer
3. Fetch the small JSON response from the D&D 5e API
4. Read the first three class names
5. Reply with `Barbarian`, `Bard`, and `Cleric`

A successful run prints a real tool announcement before the answer. Plain-text JSON that merely *describes* a tool call is not success.

## Reference solution

```typescript
import { Agent } from "@strands-agents/sdk";
import { httpRequest } from "@strands-agents/sdk/vended-tools/http-request";
import { createModel } from "./model.js";

const agent = new Agent({
  model: createModel(),
  tools: [httpRequest],
});

const result = await agent.invoke(`
  Use the HTTP tool to fetch https://www.dnd5eapi.co/api/2014/classes
  and name the first three classes in the JSON response.
`);
console.log(result);
```

## Bonus quest — Fibonacci scroll

Try an agent equipped with `bash` and `fileEditor` that generates a TypeScript file containing a Fibonacci implementation, executes it, and shows the result.

> **Consent** — `bash` and `fileEditor` can change your system, so run with debug logging to see what's happening: `npm run agent:debug`.

```typescript
import { Agent } from "@strands-agents/sdk";
import { bash } from "@strands-agents/sdk/vended-tools/bash";
import { fileEditor } from "@strands-agents/sdk/vended-tools/file-editor";
import { createModel } from "./model.js";

const arcaneScribe = new Agent({
  model: createModel(),
  tools: [fileEditor, bash],
  systemPrompt: `You are Kiro the Grey Hat, a wizard who specializes in the ancient art of code magic.
    When asked to create spells (code), you inscribe them on parchment (files) in the current working
    directory and then cast them to demonstrate their power.`,
});

const response = await arcaneScribe.invoke(
  "Create a magical scroll that generates the first 10 numbers of the Fibonacci sequence and demonstrate its power!",
);
console.log(response);
```

Once it finishes, check the project root for the generated Fibonacci file.

## What you learned

- How to import and wire up vended tools from their subpaths
- How agents autonomously decide when to invoke a tool
- That tool use depends on a tool-capable model — including your local one

---

[← Chapter 1](01-strands-basics.md) · [Back to README](../README.md) · [Next: Chapter 3 →](03-custom-tools.md)
