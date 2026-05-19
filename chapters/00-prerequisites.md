# Chapter 0 — An Unexpected Adventure

[← Back to README](../README.md) · [Next: Chapter 1 →](01-strands-basics.md)

---

![Chapter 0](../assets/header_0.jpeg)

## What is Strands?

[Strands](https://strandsagents.com/latest/) is an open-source Python & TypeScript SDK for building AI agents and multi-agent systems. It provides a clean framework for creating agents that can reason, use tools, and call external services.

This workshop uses the TypeScript SDK throughout.

## Prerequisites

- **Node.js 20+** — install from [nodejs.org](https://nodejs.org/en/download/)
- **AWS credentials** configured for Amazon Bedrock (or an alternative model provider)
- Model access enabled in the [Bedrock Console](https://console.aws.amazon.com/bedrock)
- Basic TypeScript familiarity
- A terminal and a text editor / IDE

## Setup

### 1. Create a folder

Create a folder in your computer to hold all the steps. You can call it `game-master-strands`.

```bash
mkdir my-agent
cd my-agent
npm init -y
npm pkg set type=module
```

### 2. Verify Node.js

```bash
node --version  # v20.x or higher
npm --version
```

### 3. Install dependencies

```bash
npm install
```

### 4. Creating The Amazon Bedrock API Key

- Go to AWS Console.
- Search for Amazon Bedrock and go to the service
- Create a long term API Key (for 5 days only)
- Copy and paste the export like described in your terminal

## What you'll need per chapter

| Chapter | Concept                            |
| ------- | ---------------------------------- |
| 1       | Creating your first agent          |
| 2       | Built-in (vended) tools            |
| 3       | Custom tools with Zod schemas      |
| 4       | Model Context Protocol (MCP)       |
| 5       | Agent-to-Agent (A2A) orchestration |
| 6       | Web UI for your Game Master        |
| 7       | Stretch goals & enhancements       |
| 8       | Cleanup                            |

---

[← Back to README](../README.md) · [Next: Chapter 1 →](01-strands-basics.md)
