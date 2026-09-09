import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import { z } from "zod";
import { rollDice } from "./dice.js";

const PORT = 8080;

/** Build a fresh server with the dice tool registered. */
function createServer(): McpServer {
  const server = new McpServer({
    name: "D&D Dice Roll Service",
    version: "1.0.0",
  });

  server.registerTool(
    "roll_dice",
    {
      description: "Roll one or more dice for D&D (e.g. 4d6, a single d20).",
      inputSchema: {
        faces: z.number().int().min(1).default(6).describe("Sides per die"),
        count: z.number().int().min(1).default(1).describe("Number of dice"),
      },
    },
    async ({ faces, count }) => {
      const result = rollDice(faces, count);
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  );

  return server;
}

const app = express();
app.use(express.json());

// Stateless: every request gets its own server + transport, then both close.
// No session id is generated, so the server keeps no per-client state.
app.post("/mcp", async (req, res) => {
  const server = createServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  res.on("close", () => {
    void transport.close();
    void server.close();
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

// Stateless transport does not support server-initiated streams or sessions.
const methodNotAllowed = (_req: express.Request, res: express.Response) => {
  res.status(405).json({ error: "Method not allowed" });
};
app.get("/mcp", methodNotAllowed);
app.delete("/mcp", methodNotAllowed);

app.listen(PORT, "127.0.0.1", () => {
  console.log(
    `🎲 D&D Dice Roll MCP Server running on http://127.0.0.1:${PORT}/mcp`,
  );
});
