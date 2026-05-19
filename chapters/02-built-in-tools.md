# Chapter 2 — The Adventurer's Arsenal: Built-in Tools

[← Chapter 1](01-strands-basics.md) · [Back to README](../README.md) · [Next: Chapter 3 →](03-custom-tools.md)

---

![Chapter 2](../assets/header_2.png)

## Quest objective

Tools are the primary way to extend agent capabilities — they let the agent fetch data, run shell commands, and edit files. In this chapter you'll equip a Strands agent with the built-in `httpRequest` tool so it can read web pages and answer questions about them.

## Built-in (vended) tools

Strands ships with a library of vended tools you can import directly:

- `httpRequest` — fetch web pages and call HTTP APIs
- `bash` — execute shell commands
- `fileEditor` — read and write files

```typescript
import { httpRequest } from "@strands-agents/sdk/vended-tools/http-request";
import { bash } from "@strands-agents/sdk/vended-tools/bash";
import { fileEditor } from "@strands-agents/sdk/vended-tools/file-editor";
```

See the full list in the [community-tools docs](https://strandsagents.com/latest/documentation/docs/user-guide/concepts/tools/community-tools-package/).

## Step 1 — Import the HTTP tool

```typescript
import { httpRequest } from "@strands-agents/sdk/vended-tools/http-request";
```

## Step 2 — Equip the agent

Pass the tool in the `tools` array:

```typescript
const agent = new Agent({
  tools: [httpRequest],
});
```

## Step 3 — Run it

Invoke the agent.

```ts
await agent.invoke(`
  Using the website https://en.wikipedia.org/wiki/Dungeons_%26_Dragons tell me the name of the designers of
  Dungeons and Dragons.
`);
```

and run it.

```bash
npx tsx src/agent.ts
```

The agent will:

1. Receive the prompt about D&D's creators
2. Decide on its own to call `httpRequest`
3. Fetch the Wikipedia page
4. Extract the relevant designers' names from the HTML
5. Reply with the answer

You can verify it against the [Wikipedia page](https://en.wikipedia.org/wiki/Dungeons_%26_Dragons).

## Reference solution

```typescript
import { Agent } from "@strands-agents/sdk";
import { httpRequest } from "@strands-agents/sdk/vended-tools/http-request";

const agent = new Agent({
  tools: [httpRequest],
});

await agent.invoke(`
  Using the website https://en.wikipedia.org/wiki/Dungeons_%26_Dragons tell me the name of the designers of
  Dungeons and Dragons.
`);
```

## Bonus quest — Fibonacci scroll

A more advanced challenge lives in `2_built_in_tools/bonus_quest.ts`. Build an agent equipped with `bash` and `fileEditor` that:

1. Generates a TypeScript file containing a Fibonacci sequence implementation
2. Executes it
3. Demonstrates the result

> **Important** — `bash` and `fileEditor` ask for explicit permission before each action. Run with debug logging so you see the consent prompts:
>
> ```bash
> STRANDS_LOG_LEVEL=debug npx tsx src/agent.ts
> ```
>
> Type `y` and press Enter to approve each step.

```typescript
import { Agent } from "@strands-agents/sdk";
import { bash } from "@strands-agents/sdk/vended-tools/bash";
import { fileEditor } from "@strands-agents/sdk/vended-tools/file-editor";

const arcaneScribe = new Agent({
  tools: [fileEditor, bash],
  systemPrompt: `You are Kiro the Grey Hat, a wizard who specializes in the ancient art of code magic.
    When asked to create spells (code), you inscribe them on parchment (files) in the current working directory and then cast them to demonstrate their power.`,
});

const response = await arcaneScribe.invoke(
  "Create a magical scroll that generates the first 10 numbers of the Fibonacci sequence and demonstrate its power!",
);
console.log(response);
```

Once it finishes, check the project root for the generated Fibonacci file.

## Tool consent

Powerful tools (`bash`, `fileEditor`) prompt for permission before each call. To bypass for testing only:

```bash
export BYPASS_TOOL_CONSENT=true
```

Use this with caution — it removes a guardrail that's there to protect your system.

## What you learned

- How to import and wire up vended tools
- How agents autonomously decide when to invoke a tool
- The consent model for filesystem / shell tools

---

[← Chapter 1](01-strands-basics.md) · [Back to README](../README.md) · [Next: Chapter 3 →](03-custom-tools.md)
