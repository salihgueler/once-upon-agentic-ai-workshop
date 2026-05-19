# Chapter 8 — Cleanup

[← Chapter 7](07-stretch-goals.md) · [Back to README](../README.md)

---

![Chapter 8](../assets/header_8.png)

If you ran this workshop in your own AWS account, follow these steps to avoid future charges.

## Bedrock

There's no specific cleanup required for Amazon Bedrock itself.

- **Usage charges** are per token (input/output). Stop calling models and charges stop.
- **Model access** stays enabled but doesn't cost anything when idle.

## Local cleanup

1. **Stop running servers** — `Ctrl+C` in each terminal:
   - Dice MCP server
   - Rules Agent
   - Character Agent
   - Gamemaster Orchestrator
   - Any SSH tunnel

2. **Delete temp data** if you no longer need it:
   - Generated Fibonacci files from Chapter 2
   - `src/dnd_knowledge_base/` — the LanceDB index
   - `src/characters.json` — the character store
   - `node_modules/` if you're done with the project: `rm -rf node_modules`

## Where to next

- Apply these patterns to your own project — pick a domain you care about and design the agents the same way.
- Read the [Strands documentation](https://strandsagents.com/latest/documentation/docs/) for advanced topics: streaming, structured outputs, model fallbacks, observability.
- Browse the [Strands TypeScript SDK source](https://github.com/strands-agents/sdk-typescript) for examples and internals.

---

[← Chapter 7](07-stretch-goals.md) · [Back to README](../README.md)
