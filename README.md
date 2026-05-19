# Once Upon Agentic AI — A Developer's Epic Journey (TypeScript)

![Header](assets/header.jpeg)

A hands-on workshop that takes you from your first AI agent to a production-style multi-agent system using the [Strands Agents TypeScript SDK](https://github.com/strands-agents/sdk-typescript).

> _"Roll for Initiative... in TypeScript!"_

This is a markdown-only port of the original AWS Workshop Studio version, designed to be shared as a single GitHub link. Every chapter is a standalone `.md` file you can read in order.

---

## Workshop format

- **Source code** lives in the [aws-samples/sample-once-upon-agentic-ai-typescript](https://github.com/aws-samples/sample-once-upon-agentic-ai-typescript) repository — clone it once at the start of Chapter 0.
- **Workshop content** lives here, in `chapters/`. Each chapter walks you through editing the corresponding files in the source repo, then running them.
- **No Workshop Studio infrastructure** — no `contentspec.yaml`, no `weight` ordering, no static-site generator. Just markdown.

## Table of contents

| # | Chapter | What you'll build |
| - | --- | --- |
| 0 | [An Unexpected Adventure](chapters/00-prerequisites.md) | Local environment, Bedrock model access |
| 1 | [The Art of Agent Summoning](chapters/01-strands-basics.md) | Your first Strands agent |
| 2 | [The Adventurer's Arsenal](chapters/02-built-in-tools.md) | Built-in vended tools (`httpRequest`, `bash`, `fileEditor`) |
| 3 | [Forging Custom Tools](chapters/03-custom-tools.md) | A custom dice-rolling tool with Zod schemas |
| 4 | [Planar Portals: MCP](chapters/04-mcp-integration.md) | An MCP server + client for distributed tools |
| 5 | [The Grand Alliance: A2A](chapters/05-a2a-integration.md) | Three agents collaborating via Agent-to-Agent |
| 6 | [Web UI Testing](chapters/06-ui-testing.md) | Connect your local Game Master to a hosted UI |
| 7 | [Stretch Goals](chapters/07-stretch-goals.md) | Visual storytelling, NPCs, world generation |
| 8 | [Cleanup](chapters/08-cleanup.md) | Tidy up local + AWS resources |

> Complete chapters in order — each one builds on the previous.

## Prerequisites

- **Node.js 20+** ([download](https://nodejs.org/en/download/))
- AWS credentials with [Bedrock model access enabled](https://console.aws.amazon.com/bedrock) (or another supported model provider)
- Basic TypeScript knowledge
- A terminal

Full setup instructions: [Chapter 0](chapters/00-prerequisites.md).

## Quick start

```bash
# 1. Get the source code for the exercises
git clone https://github.com/aws-samples/sample-once-upon-agentic-ai-typescript.git
cd sample-once-upon-agentic-ai-typescript
npm install

# 2. Open Chapter 0 in this workshop and follow along
```

## What is Strands?

Strands is an open-source SDK (Python and TypeScript) for building AI agents and multi-agent systems. It gives you:

- **Agent creation** — single-call agent construction with system prompts and tools
- **Tool integration** — built-in vended tools, custom tools via the `tool()` factory
- **Model flexibility** — Bedrock, plus other providers
- **MCP support** — talk to remote tool servers using the Model Context Protocol
- **A2A** — wrap agents as tools so they can call each other

Glossary:

| Term | Meaning |
| --- | --- |
| **Agent** | An LLM-driven worker that can reason and call tools |
| **Tool** | A callable function the agent can invoke |
| **System prompt** | The instructions that shape an agent's behavior |
| **Model provider** | Bedrock, OpenAI, Anthropic, etc. |
| **MCP** | Model Context Protocol — for remote tool servers |
| **A2A** | Agent-to-Agent — for agents that call other agents |

## Learning objectives

By the end:

- Build, configure, and run agents
- Use built-in tools and write your own
- Connect agents to remote services with MCP
- Orchestrate multiple cooperating agents with A2A
- Wire it all into a real application with a web UI

## Resources

- [Strands documentation](https://strandsagents.com/latest/documentation/docs/)
- [Strands TypeScript SDK on GitHub](https://github.com/strands-agents/sdk-typescript)
- [Strands example projects](https://strandsagents.com/latest/documentation/docs/examples/)
- [Original Python workshop (reference)](https://github.com/aws-samples/sample-once-upon-agentic-ai)
- [TypeScript port (source code for this workshop)](https://github.com/aws-samples/sample-once-upon-agentic-ai-typescript)

## License

Workshop content is provided as-is. The underlying code samples follow the license of the [aws-samples TypeScript repository](https://github.com/aws-samples/sample-once-upon-agentic-ai-typescript).

---

[Start with Chapter 0 →](chapters/00-prerequisites.md)
