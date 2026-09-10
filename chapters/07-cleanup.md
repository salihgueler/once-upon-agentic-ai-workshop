# Chapter 7 — Cleanup

[← Chapter 6](06-ui-testing.md) · [Optional Chapter 8 →](08-aws-agents-deployment.md) · [Back to README](../README.md)

---

![Chapter 7](../assets/header_8.png)

You've built and run the whole Game Master locally. This chapter tidies up the
processes and files the workshop created so nothing keeps running in the
background — and, if you used the optional cloud path, confirms there's nothing
left to bill you for.

## Local cleanup

### 1. Stop running processes

Return to each terminal and press `Ctrl+C` to stop it:

- Dice MCP server
- Rules Agent
- Character Agent
- Gamemaster Orchestrator
- The React web dev server (Chapter 6)
- Any tunnel you started for the web UI

If you're unsure whether something is still listening, check the ports the workshop
used and stop only those specific processes:

```bash
# See what (if anything) is bound to the orchestrator port
lsof -i :8009

# Stop a specific process by its PID (from the lsof output)
kill <pid>
```

> Prefer stopping processes by their specific PID or port. Avoid broad
> `pkill node`-style commands — they can kill unrelated Node processes you care
> about.

### 2. Remove generated data

The workshop writes a few local files as you run the exercises. Delete the ones you
no longer need, **one path at a time** so you can see exactly what's going away:

```bash
# Generated Fibonacci files from Chapter 2 (adjust names to what you created)
rm src/fibonacci.ts

# The character store
rm src/characters.json
```

If you're finished with the project entirely, you can remove the installed
dependencies for the backend and the web client:

```bash
rm -r node_modules/
rm -r web/node_modules/
```

> Remove specific, named paths inside the project only. Do **not** run blanket or
> recursive deletes from a parent directory (for example `rm -rf *` or
> `rm -rf ~/...`) — those can wipe files far beyond this workshop.

### 3. Ollama (default local model)

Ollama keeps pulled models on disk and runs a background service. If you want the
disk space back:

```bash
# List the models Ollama has stored
ollama list

# Remove the model this workshop used (delete only what you pulled)
ollama rm gemma4:latest
```

To stop the Ollama background service:

- **macOS:** quit Ollama from the menu-bar icon (or `Applications` → Quit).
- **Linux (systemd):** `sudo systemctl stop ollama`

Leaving Ollama installed costs nothing but disk; remove models you no longer use to
reclaim space.

## Optional: Amazon Bedrock

Only relevant if you chose the **optional** Bedrock provider instead of Ollama.

- **Usage charges** are per token (input/output). Once you stop calling models, the
  charges stop — there's nothing running to shut down.
- **Model access** stays enabled on your account but costs nothing when idle, so
  there's no cleanup required to avoid charges.
- If you created a **temporary Bedrock API key** for the workshop, let it expire or
  delete it in the Bedrock console so it can't be used later.

There are no other AWS resources to tear down if you only selected Bedrock as the
model provider. If you continue to [Chapter 8](08-aws-agents-deployment.md), use
that chapter's AgentCore removal workflow to delete the runtime and its supporting
resources.

## Where to next

- Try the [optional agents-only AWS deployment](08-aws-agents-deployment.md) — package
  the four backend services with AgentCore CodeZip while keeping React local.
- Apply these patterns to your own project — pick a domain you care about and design
  the agents the same way.
- Read the [Strands documentation](https://strandsagents.com/latest/documentation/docs/)
  for advanced topics: streaming, structured outputs, model fallbacks, observability.
- Browse the [Strands TypeScript SDK source](https://github.com/strands-agents/harness-sdk/tree/main/strands-ts)
  for examples and internals.

---

[← Chapter 6](06-ui-testing.md) · [Optional Chapter 8 →](08-aws-agents-deployment.md) · [Back to README](../README.md)
