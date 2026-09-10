import express from "express";
import { z } from "zod";

process.env["MODEL_PROVIDER"] = "bedrock";
process.env["MCP_PORT"] ??= "8081";
process.env["MCP_SERVER_URL"] ??= "http://127.0.0.1:8081/mcp";
process.env["CHARACTER_STORE_PATH"] ??= "/mnt/session/characters.json";

async function startServices() {
  await import("../../src/mcp-server/server.js");
  const [{ startRulesAgent }, { startCharacterAgent }] = await Promise.all([
    import("../../src/rules-agent.js"),
    import("../../src/character-agent.js"),
  ]);
  await Promise.all([startRulesAgent(), startCharacterAgent()]);
  return import("../../src/gamemaster-orchestrator.js");
}

const servicesPromise = startServices();

const requestSchema = z.union([
  z.object({ prompt: z.string().min(1) }),
  z.discriminatedUnion("action", [
    z.object({ action: z.literal("health") }),
    z.object({ action: z.literal("inquire"), question: z.string().min(1) }),
    z.object({ action: z.literal("user"), name: z.string().min(1) }),
  ]),
]);

const app = express();
app.use(express.json({ limit: "1mb" }));

app.get("/ping", (_req, res) => {
  res.json({
    status: "Healthy",
    time_of_last_update: Math.floor(Date.now() / 1000),
  });
});

app.post("/invocations", async (req, res) => {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid invocation payload" });
    return;
  }

  try {
    const { getCharacter, inquire } = await servicesPromise;
    if ("prompt" in parsed.data) {
      res.json(await inquire(parsed.data.prompt));
      return;
    }
    switch (parsed.data.action) {
      case "health":
        res.json({ status: "healthy" });
        return;
      case "inquire":
        res.json(await inquire(parsed.data.question));
        return;
      case "user": {
        const character = getCharacter(parsed.data.name);
        if (character === undefined) {
          res.status(404).json({ error: "Character not found" });
          return;
        }
        res.json(character);
        return;
      }
    }
  } catch (error) {
    console.error(`AgentCore invocation failed: ${String(error)}`);
    res.status(500).json({ error: "Internal server error" });
  }
});

const port = Number.parseInt(process.env["PORT"] ?? "8080", 10);
app.listen(port, "0.0.0.0", () => {
  console.log(`🏰 AgentCore Game Master listening on 0.0.0.0:${String(port)}`);
});
