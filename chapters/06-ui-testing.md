# Chapter 6 — Testing Your Game Master with the Web UI

[← Chapter 5](05-a2a-integration.md) · [Back to README](../README.md) · [Next: Chapter 7 →](07-stretch-goals.md)

---

![Chapter 6](../assets/header_6.png)

## Quest objective

Connect your locally-running orchestrator (port 8009 from Chapter 5) to a hosted web UI so you can chat with your Game Master through a browser instead of curl.

## Why we need a tunnel

The hosted UI uses HTTPS, so it can't talk directly to `http://localhost:8009`. You need an HTTPS-tunnel that forwards public traffic to your local port.

### Step 1 — Connect via the web UI

Open the [hosted Game Master UI](https://github.com/salihgueler/game-master-frontend) and:

1. Paste your tunnel URL into the **Server URL** field
2. Click **Connect**
3. Start chatting

![UI home](../assets/ui-home.png)

The UI provides:

- A chat interface for D&D conversations
- Real-time streaming of orchestrator responses
- A nicer surface than raw curl

Watch your terminal logs — the orchestrator prints debug info as each request flows through.

## Customization ideas

- Tweak the orchestrator's `SYSTEM_PROMPT` to change voice and tone
- Add new custom tools for campaign-specific mechanics
- Bolt on additional MCP servers

## Troubleshooting

| Problem                | Fix                                                                           |
| ---------------------- | ----------------------------------------------------------------------------- |
| **Connection refused** | Confirm the orchestrator is running on port 8009 and the SSH tunnel is up     |
| **Invalid Server URL** | Make sure you're using the _HTTPS_ URL printed by `localhost.run`, no typos   |
| **Slow responses**     | Check your local CPU/RAM; consider a smaller model in the orchestrator config |
| **Tunnel drops**       | Re-run the `ssh -R` command — `localhost.run` rotates URLs each session       |

---

[← Chapter 5](05-a2a-integration.md) · [Back to README](../README.md) · [Next: Chapter 7 →](07-stretch-goals.md)
