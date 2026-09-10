# Chapter 1 — The Art of Agent Summoning

[← Chapter 0](00-prerequisites.md) · [Back to README](../README.md) · [Next: Chapter 2 →](02-built-in-tools.md)

---

![Chapter 1](../assets/header_1.png)

## Quest objective

Build your first agent and run it successfully — against a model running locally on your own machine.

You already installed the Strands SDK in [Chapter 0](00-prerequisites.md) (`npm ci`). The dependency is pinned in `package.json`:

```jsonc
"@strands-agents/sdk": "1.17.0"
```

Create `src/agent.ts` in this chapter. The shared `src/model.ts` helper is already provided; you import it but do not need to implement model-provider setup yourself.

> **Create:** `src/agent.ts`<br>
> **Reference after attempting the exercise:** [`completed/01-strands-basics/src/agent.ts`](../completed/01-strands-basics/src/agent.ts)

## Step 1 — Choose a model with `createModel()`

Rather than hard-coding a provider in every chapter, the workshop centralizes model selection in `src/model.ts`. It returns a local Ollama model by default (via Strands' OpenAI Chat Completions provider), or an Amazon Bedrock model when `MODEL_PROVIDER=bedrock`.

```typescript
import { createModel } from "./model.js";

const model = createModel(); // OpenAIModel (Ollama) by default
```

> Note the `.js` extension on the import. This project is native ESM (`"type": "module"`), and TypeScript's `NodeNext` resolution requires the compiled extension in relative import paths.

## Step 2 — Enable debug logging

Strands log verbosity is controlled by the `STRANDS_LOG_LEVEL` environment variable. Levels: `debug`, `info`, `warn`, `error`. Start with `info`; dial up to `debug` to watch what the agent does under the hood:

```bash
npm run agent:debug     # runs with STRANDS_LOG_LEVEL=debug
```

## Step 3 — Create the agent

Construct the agent with `new Agent({ ... })`. Pass the `model` from `createModel()`, and a `systemPrompt` to shape its personality:

```typescript
import { Agent } from "@strands-agents/sdk";
import { createModel } from "./model.js";

const agent = new Agent({
  model: createModel(),
  systemPrompt: "You are a game master for a Dungeons & Dragons game.",
});
```

See the docs on [system prompts](https://strandsagents.com/).

## Step 4 — Invoke the agent

`invoke()` is async — await it:

```typescript
const result = await agent.invoke(
  "Hi, I am an adventurer ready for adventure!",
);

console.log(result);
```

## Step 5 — Run it

Make sure Ollama is running (`ollama serve`) and you've pulled the model (`ollama pull gemma4`), then:

```bash
npm run agent
```

If the script returns enthusiastic flavor-text from a Game Master, you've successfully summoned an agent.

## Reference solution

After you have attempted the exercise, compare your file with
[`completed/01-strands-basics/src/agent.ts`](../completed/01-strands-basics/src/agent.ts).
The complete expected contents are also shown here:

```typescript
import { Agent } from "@strands-agents/sdk";
import { createModel } from "./model.js";

const agent = new Agent({
  model: createModel(),
  systemPrompt: "You are a game master for a Dungeons & Dragons game.",
});

const result = await agent.invoke(
  "Hi, I am an adventurer ready for adventure!",
);

console.log(result);
```

## What you learned

- How the `createModel()` seam decouples your agent from a specific provider
- How to set log level via `STRANDS_LOG_LEVEL`
- How to build an agent with a `model` and a `systemPrompt`
- How to `invoke()` an agent and get a result back

---

[← Chapter 0](00-prerequisites.md) · [Back to README](../README.md) · [Next: Chapter 2 →](02-built-in-tools.md)
