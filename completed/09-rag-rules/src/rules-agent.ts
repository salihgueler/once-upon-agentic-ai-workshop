import path from "node:path";
import { pathToFileURL } from "node:url";
import { Agent, tool } from "@strands-agents/sdk";
import { A2AExpressServer } from "@strands-agents/sdk/a2a/express";
import { z } from "zod";
import { createModel } from "./model.js";
import { lookupRuleSemantic } from "./rules-knowledge-base.js";

const PORT = 8000;

const queryDndRules = tool({
  name: "query_dnd_rules",
  description: "Fast D&D 5e rule lookup. Returns a brief rule with a page reference.",
  inputSchema: z.object({
    query: z.string().describe("The D&D rule to look up, e.g. 'dexterity check'"),
  }),
  callback: async (input) => {
    const passage = await lookupRuleSemantic(input.query);
    return passage ?? "No matching rule found in the Basic Rules.";
  },
});

const DESCRIPTION = `Specialized D&D 5e rules-lookup agent. Answers mechanics questions
with brief, page-referenced clarifications drawn from the Basic Rules. Designed for
quick consultation by other agents or players during play.`;

const SYSTEM_PROMPT = `You are a D&D rules expert. When asked about a rule, call the
query_dnd_rules tool once, then answer clearly and concisely, always citing the page
reference the tool returns. Keep answers focused on the specific rule requested.`;

const agent = new Agent({
  model: createModel(),
  tools: [queryDndRules],
  systemPrompt: SYSTEM_PROMPT,
});

const server = new A2AExpressServer({
  agent,
  name: "Rules Agent",
  description: DESCRIPTION,
  host: "127.0.0.1",
  port: PORT,
});

export async function startRulesAgent(): Promise<void> {
  await server.serve();
  console.log(`🧙 Rules Agent running on http://127.0.0.1:${String(PORT)}`);
}

const entrypoint = process.argv[1];
if (
  entrypoint !== undefined &&
  import.meta.url === pathToFileURL(path.resolve(entrypoint)).href
) {
  void startRulesAgent();
}
