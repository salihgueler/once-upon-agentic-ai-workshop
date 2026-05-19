# Chapter 1 — The Art of Agent Summoning

[← Chapter 0](00-prerequisites.md) · [Back to README](../README.md) · [Next: Chapter 2 →](02-built-in-tools.md)

---

![Chapter 1](../assets/header_1.png)

## Quest objective

Open `1_strands_basics/simple_agent.ts` and turn the `TODO` comments into a working agent — your first AI Game Master.

```bash
cd sample-once-upon-agentic-ai-typescript
```

## Step 1 — Enable debug logging

In the TypeScript SDK, log verbosity is controlled by the `STRANDS_LOG_LEVEL` environment variable. Set it before running the script:

```bash
STRANDS_LOG_LEVEL=debug npx tsx 1_strands_basics/simple_agent.ts
```

Levels: `debug`, `info`, `warn`, `error`. Start with `info` and dial up to `debug` when you want to see what the agent is doing under the hood.

## Step 2 — Create the agent

Create the agent with `new Agent({ ... })`. The `systemPrompt` shapes its personality:

```typescript
import { Agent } from "@strands-agents/sdk";

const agent = new Agent({
  systemPrompt: "You are a game master for a Dungeon & Dragon game",
});
```

See the docs on [system prompts](https://strandsagents.com/latest/documentation/docs/user-guide/concepts/agents/prompts/).

## Step 3 — Invoke the agent

Agents are awaited:

```typescript
const result = await agent.invoke(
  "Hi, I am an adventurer ready for adventure!"
);
```

See the [TypeScript quickstart](https://strandsagents.com/latest/documentation/docs/user-guide/quickstart/typescript/).

## Step 4 — Run it

```bash
npx tsx 1_strands_basics/simple_agent.ts
```

If the script returns enthusiastic flavor-text from a Game Master, you've successfully summoned an agent.

## Reference solution

```typescript
import { Agent } from "@strands-agents/sdk";

const agent = new Agent({
  systemPrompt: "You are a game master for a Dungeon & Dragon game",
});

const result = await agent.invoke(
  "Hi, I am an adventurer ready for adventure!"
);
```

## What you learned

- How to set log level via `STRANDS_LOG_LEVEL`
- How to build an agent with a system prompt
- How to invoke an agent and get a result back

---

[← Chapter 0](00-prerequisites.md) · [Back to README](../README.md) · [Next: Chapter 2 →](02-built-in-tools.md)
