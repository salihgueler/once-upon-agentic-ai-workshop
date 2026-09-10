import { Agent } from "@strands-agents/sdk";
import { httpRequest } from "@strands-agents/sdk/vended-tools/http-request";
import { createModel } from "./model.js";

const agent = new Agent({
  model: createModel(),
  tools: [httpRequest],
});

const result = await agent.invoke(`
  Use the HTTP tool to fetch https://www.dnd5eapi.co/api/2014/classes
  and name the first three classes in the JSON response.
`);

console.log(result);
