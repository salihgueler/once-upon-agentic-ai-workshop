# Chapter 0 — An Unexpected Adventure

[← Back to README](../README.md) · [Next: Chapter 1 →](01-strands-basics.md)

---

![Chapter 0](../assets/header_0.jpeg)

## What is Strands?

[Strands](https://strandsagents.com/) is an open-source SDK for building AI agents and multi-agent systems, available for both Python and TypeScript. It gives you a clean, model-driven framework for creating agents that can reason, use tools, and call external services.

This workshop uses the **TypeScript SDK** (`@strands-agents/sdk`) throughout.

## Local-first by default

This workshop runs **entirely on your machine by default** using [Ollama](https://ollama.com/) — no cloud account, no API key, no bill. Strands talks to Ollama through its OpenAI-compatible endpoint.

If you'd rather use Amazon Bedrock, that's a one-line switch — see [Optional: use Amazon Bedrock](#optional--use-amazon-bedrock) below.

## Prerequisites

- **Node.js 22+** — install from [nodejs.org](https://nodejs.org/en/download/). (The repo pins this via `.node-version`.)
- **[Ollama](https://ollama.com/download)** installed and running (for the local default).
- Basic TypeScript familiarity.
- A terminal and a text editor / IDE.

Verify Node:

```bash
node --version   # v22.x or higher
npm --version
```

## Setup

### 1. Get the workshop project

This repository **is** the project — the exercise source lives in `src/` and the chapters walk you through it.

```bash
git clone <this-repo-url>
cd once-upon-agentic-ai-workshop
npm install
```

`npm install` reads the committed `package-lock.json`, so everyone gets the exact same dependency versions (Strands `@strands-agents/sdk` `1.17.0`, `zod` `4.1.12`, and friends).

### 2. Start Ollama and pull a model

In a separate terminal:

```bash
ollama serve                 # start the local Ollama server (if not already running)
ollama pull gemma4            # download the default workshop model (~9.6 GB, one time)
```

`gemma4:latest` is the workshop's verified local default: it successfully invokes Strands custom and MCP tools through Ollama's OpenAI-compatible API at `http://localhost:11434/v1`.

### 3. Configure your environment (optional)

Copy the example env file. The defaults already point at local Ollama, so you can skip editing it entirely:

```bash
cp .env.example .env
```

| Variable          | Default                       | Purpose                                        |
| ----------------- | ----------------------------- | ---------------------------------------------- |
| `MODEL_PROVIDER`  | `ollama`                      | `ollama` (local) or `bedrock` (cloud)          |
| `OLLAMA_BASE_URL` | `http://localhost:11434/v1`   | Ollama's OpenAI-compatible endpoint            |
| `OLLAMA_MODEL_ID` | `gemma4:latest`                 | The local model tag you pulled                 |
| `STRANDS_LOG_LEVEL` | `info`                      | `debug` \| `info` \| `warn` \| `error`         |

> The project loads these from your shell environment. To auto-load a `.env` file, either `export` the values, or use Node's built-in support: `node --env-file=.env ...`.

### 4. Run your first agent

```bash
npm run agent
```

This runs `src/agent.ts`. If a Game Master replies with enthusiastic flavor text, your local setup works. On to Chapter 1.

## Optional — use Amazon Bedrock

Prefer a hosted model? Set two variables and you're done — no code changes:

```bash
export MODEL_PROVIDER=bedrock
export BEDROCK_MODEL_ID=<your-claude-sonnet-5-inference-profile-id>
export AWS_REGION=<your-aws-region>
```


Replace the angle-bracket placeholders with the inference-profile ID and AWS region enabled in your account. The workshop intentionally does not guess a Bedrock model ID.
Bedrock requires:

- **AWS credentials** configured in your environment (standard SigV4 — e.g. via `aws configure`, SSO, or an assumed role). Alternatively set `BEDROCK_API_KEY` for bearer-token auth.
- **Model access** enabled for your chosen model in the [Bedrock Console](https://console.aws.amazon.com/bedrock).

Unlike the local default, Bedrock has **no built-in default model**, so `BEDROCK_MODEL_ID` is required — the app will tell you if it's missing.

## How model selection works

Every chapter's agent gets its model from a single helper, `createModel()` in `src/model.ts`. It reads `MODEL_PROVIDER` and returns either:

- an `OpenAIModel` (Chat Completions API) pointed at your local Ollama, **or**
- a `BedrockModel`.

Because the whole workshop shares this one seam, switching providers is a config change — never a code change.

## What you'll build per chapter

| Chapter | Concept                            |
| ------- | ---------------------------------- |
| 1       | Creating your first agent          |
| 2       | Built-in (vended) tools            |
| 3       | Custom tools with Zod schemas      |
| 4       | Model Context Protocol (MCP)       |
| 5       | Agent-to-Agent (A2A) orchestration |
| 6       | Web UI for your Game Master        |
| 7       | Cleanup                            |

---

[← Back to README](../README.md) · [Next: Chapter 1 →](01-strands-basics.md)
