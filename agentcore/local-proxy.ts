import { randomUUID } from "node:crypto";
import {
  BedrockAgentCoreClient,
  InvokeAgentRuntimeCommand,
} from "@aws-sdk/client-bedrock-agentcore";
import express from "express";

const runtimeArn = process.env["AGENTCORE_RUNTIME_ARN"]?.trim();
if (runtimeArn === undefined || runtimeArn.length === 0) {
  throw new Error("AGENTCORE_RUNTIME_ARN is required. Run 'agentcore status' to find it.");
}

const region =
  process.env["AWS_REGION"]?.trim() ||
  process.env["AWS_DEFAULT_REGION"]?.trim() ||
  "us-east-1";
const sessionId = process.env["AGENTCORE_SESSION_ID"]?.trim() || randomUUID();
const client = new BedrockAgentCoreClient({ region });

type InvocationPayload =
  | { action: "health" }
  | { action: "inquire"; question: string }
  | { action: "user"; name: string };

async function invoke(payload: InvocationPayload): Promise<unknown> {
  const response = await client.send(
    new InvokeAgentRuntimeCommand({
      agentRuntimeArn: runtimeArn,
      runtimeSessionId: sessionId,
      payload: JSON.stringify(payload),
      contentType: "application/json",
      qualifier: "DEFAULT",
    }),
  );
  const body = await response.response?.transformToString();
  if (body === undefined || body.length === 0) {
    throw new Error("AgentCore returned an empty response");
  }
  return JSON.parse(body) as unknown;
}

const app = express();
app.use(express.json({ limit: "1mb" }));

app.get("/health", async (_req, res) => {
  try {
    res.json(await invoke({ action: "health" }));
  } catch (error) {
    console.error(`AgentCore health check failed: ${String(error)}`);
    res.status(502).json({ error: "AgentCore request failed" });
  }
});

app.post("/inquire", async (req, res) => {
  const question = (req.body as { question?: unknown }).question;
  if (typeof question !== "string" || question.trim().length === 0) {
    res.status(400).json({ error: "Missing 'question'" });
    return;
  }
  try {
    res.json(await invoke({ action: "inquire", question: question.trim() }));
  } catch (error) {
    console.error(`AgentCore inquiry failed: ${String(error)}`);
    res.status(502).json({ error: "AgentCore request failed" });
  }
});

app.get("/user/:name", async (req, res) => {
  try {
    res.json(await invoke({ action: "user", name: req.params.name }));
  } catch (error) {
    console.error(`AgentCore character lookup failed: ${String(error)}`);
    res.status(502).json({ error: "AgentCore request failed" });
  }
});

const port = Number.parseInt(process.env["AGENTCORE_PROXY_PORT"] ?? "8009", 10);
app.listen(port, "127.0.0.1", () => {
  console.log(`🔐 Local AgentCore proxy running on http://127.0.0.1:${String(port)}`);
  console.log(`Session: ${sessionId}`);
});
