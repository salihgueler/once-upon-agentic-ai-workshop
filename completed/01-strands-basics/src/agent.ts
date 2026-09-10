/**
 * Chapter 1 — your first Strands agent.
 *
 * Run it with the local Ollama default:
 *   npm run agent
 * or with debug logging:
 *   npm run agent:debug
 */
import { Agent } from "@strands-agents/sdk";
import { createModel } from "./model.js";

const agent = new Agent({
  model: createModel(),
  systemPrompt: "You are a game master for a Dungeons & Dragons game.",
});

const result = await agent.invoke(
  "Hi, I am an adventurer ready for adventure!",
);

console.log(result);
