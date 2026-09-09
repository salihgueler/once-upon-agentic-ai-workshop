# Once Upon Agentic AI — A Developer's Epic Journey (TypeScript)

![Header](assets/header.jpeg)

A hands-on workshop that takes you from your first AI agent to a production-style multi-agent system using the [Strands Agents TypeScript SDK](https://github.com/strands-agents/harness-sdk/tree/main/strands-ts).

> _"Roll for Initiative... in TypeScript!"_

This is a **self-contained, local-first** workshop. Everything you need lives in this repository: each chapter is a standalone `.md` file in `chapters/`, and you build the source code yourself as you go — there is no separate companion repository to clone. It runs entirely on your machine with a local model by default (**Ollama**); Amazon Bedrock is an **optional** cloud provider you can switch to if you prefer.

---

## Workshop format

- **Workshop content** lives here, in `chapters/`. Each chapter walks you through writing the corresponding source files, then running them locally.
- **You build the code** step by step. By the end you will have a small backend of agents plus a web UI, all assembled from the chapters — no external source download required.

## Table of contents

| #   | Chapter                                                     | What you'll build                                             |
| :-- | :---------------------------------------------------------- | :------------------------------------------------------------ |
| 0   | [An Unexpected Adventure](chapters/00-prerequisites.md)     | Local environment: Node 22+, Ollama (default), optional Bedrock |
| 1   | [The Art of Agent Summoning](chapters/01-strands-basics.md) | Your first Strands agent                                      |
| 2   | [The Adventurer's Arsenal](chapters/02-built-in-tools.md)   | Built-in vended tools (`httpRequest`, `bash`, `fileEditor`)   |
| 3   | [Forging Custom Tools](chapters/03-custom-tools.md)         | A custom dice-rolling tool with Zod schemas                   |
| 4   | [Planar Portals: MCP](chapters/04-mcp-integration.md)       | An MCP server + client for distributed tools                  |
| 5   | [The Grand Alliance: A2A](chapters/05-a2a-integration.md)   | Three agents collaborating via Agent-to-Agent                 |
| 6   | [Web UI Testing](chapters/06-ui-testing.md)                 | Connect your local Game Master to a web UI                    |
| 7   | [Cleanup](chapters/07-cleanup.md)                           | Tidy up local processes, generated data, Ollama, and optional Bedrock |

> Complete chapters in order — each one builds on the previous.

## Prerequisites

- **Node.js 22+** ([download](https://nodejs.org/en/download/))
- **[Ollama](https://ollama.com/download)** for the default local model (no cloud account required)
- _Optional:_ Amazon Bedrock access if you want to run against a cloud model instead
- Basic TypeScript knowledge
- A terminal

Full setup instructions: [Chapter 0](chapters/00-prerequisites.md).

## Quick start

Clone this workshop repository, install the exact locked dependencies, and pull the local model:

```bash
git clone https://github.com/salihgueler/once-upon-agentic-ai-workshop.git
cd once-upon-agentic-ai-workshop
npm ci
npm --prefix web ci
ollama pull gemma4
```

Then open [Chapter 0](chapters/00-prerequisites.md) and follow the chapters in order.

## Project layout you'll build

By the end of the workshop the project you assemble looks roughly like this — a
backend of agents at the root under `src/`, plus a small React web client under
`web/`:

```
once-upon-agentic-ai-workshop/
├── src/
│   ├── agent.ts
│   ├── model.ts
│   ├── mcp-server/
│   ├── mcp-client/
│   ├── rules-agent.ts
│   ├── character-agent.ts
│   └── gamemaster-orchestrator.ts
├── web/
│   ├── src/
│   ├── package.json
│   └── package-lock.json
├── chapters/
├── package.json
└── package-lock.json
```

The chapters explain each file in the order you build and run it.

## What is Strands?

Strands is an open-source SDK (Python and TypeScript) for building AI agents and multi-agent systems. It gives you:

- **Agent creation** — single-call agent construction with system prompts and tools
- **Tool integration** — built-in vended tools, custom tools via the `tool()` factory
- **Model flexibility** — Ollama for local models, Amazon Bedrock, and other providers
- **MCP support** — talk to remote tool servers using the Model Context Protocol
- **A2A** — wrap agents as tools so they can call each other

Glossary:

| Term               | Meaning                                             |
| ------------------ | --------------------------------------------------- |
| **Agent**          | An LLM-driven worker that can reason and call tools |
| **Tool**           | A callable function the agent can invoke            |
| **System prompt**  | The instructions that shape an agent's behavior     |
| **Model provider** | Ollama (local), Bedrock, OpenAI, etc.               |
| **MCP**            | Model Context Protocol — for remote tool servers    |
| **A2A**            | Agent-to-Agent — for agents that call other agents  |

## Learning objectives

By the end:

- Build, configure, and run agents against a local model
- Use built-in tools and write your own
- Connect agents to remote services with MCP
- Orchestrate multiple cooperating agents with A2A
- Wire it all into a real application with a React web UI

## Reference: the talks demo repository

While building the workshop yourself, you may want a finished implementation to
compare against. [`salihgueler/code-sample-game-master`](https://github.com/salihgueler/code-sample-game-master)
is the **separate demo / reference** used in conference talks — it is **not** the
attendee source for this workshop. Treat it as a worked example to peek at if you
get stuck; the workshop chapters remain self-contained on their own.

## Resources

- [Strands documentation](https://strandsagents.com/latest/documentation/docs/)
- [Strands TypeScript SDK source (harness-sdk)](https://github.com/strands-agents/harness-sdk/tree/main/strands-ts)
- [Strands example projects](https://strandsagents.com/latest/documentation/docs/examples/)
- [Ollama](https://ollama.com/)

## License

MIT

---

[Start with Chapter 0 →](chapters/00-prerequisites.md)
