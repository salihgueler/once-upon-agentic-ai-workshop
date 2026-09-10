import { Agent, McpClient } from "@strands-agents/sdk";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import * as readline from "node:readline/promises";
import { createModel } from "../model.js";

const SERVER_URL = "http://localhost:8080/mcp";

const SYSTEM_PROMPT = `You are Lady Luck, the mystical keeper of dice and fortune in D&D adventures.
You speak with theatrical flair and always announce dice rolls with appropriate drama.
You know D&D mechanics and ALWAYS use the roll_dice tool for any roll — never invent results.`;

async function main(): Promise<void> {
  console.log("\nConnecting to D&D Dice Roll MCP Server...");

  // Pass the McpClient straight into the agent's tools. The SDK's ToolList
  // accepts an McpClient, so the agent discovers the remote tools and manages
  // the connection for us — no manual listTools() wiring needed.
  const mcpClient = new McpClient({
    transport: new StreamableHTTPClientTransport(
      new URL(SERVER_URL),
    ) as Transport,
  });

  const gamemaster = new Agent({
    model: createModel(),
    tools: [mcpClient],
    systemPrompt: SYSTEM_PROMPT,
  });

  console.log("\n🎲 Lady Luck — type a request, or 'exit' to quit.");
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  try {
    for (;;) {
      let userInput: string;
      try {
        userInput = (await rl.question("\n🎲 Your request: ")).trim();
      } catch (error) {
        if (
          error instanceof Error &&
          (error as NodeJS.ErrnoException).code === "ERR_USE_AFTER_CLOSE"
        ) {
          break;
        }
        throw error;
      }
      if (["exit", "quit", "bye"].includes(userInput.toLowerCase())) break;
      const result = await gamemaster.invoke(userInput);
      console.log(result.toString());
    }
  } finally {
    rl.close();
    // Always release the transport, even on error or Ctrl-D.
    await mcpClient.disconnect();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
