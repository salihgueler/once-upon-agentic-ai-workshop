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

### 1. Clone the source repository

The hands-on code lives in the [aws-samples TypeScript port](https://github.com/aws-samples/sample-once-upon-agentic-ai-typescript). Clone it and use it as your working directory throughout the workshop:

```bash
git clone https://github.com/aws-samples/sample-once-upon-agentic-ai-typescript.git
cd sample-once-upon-agentic-ai-typescript
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

### 4. Verify `tsx`

`tsx` is included as a dev dependency and lets you run `.ts` files directly without a separate compile step:

```bash
npx tsx --version
```

That's it — there's no virtualenv to activate. `node_modules/` handles isolation.

## What you'll need per chapter

| Chapter | Concept |
| --- | --- |
| 1 | Creating your first agent |
| 2 | Built-in (vended) tools |
| 3 | Custom tools with Zod schemas |
| 4 | Model Context Protocol (MCP) |
| 5 | Agent-to-Agent (A2A) orchestration |
| 6 | Web UI for your Game Master |
| 7 | Stretch goals & enhancements |
| 8 | Cleanup |

---

[← Back to README](../README.md) · [Next: Chapter 1 →](01-strands-basics.md)
