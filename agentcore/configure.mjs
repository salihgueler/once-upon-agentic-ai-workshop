import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const modelId = process.argv[2]?.trim();
if (modelId === undefined || modelId.length === 0) {
  throw new Error("Usage: node agentcore/configure.mjs <bedrock-inference-profile-id>");
}

const directory = path.dirname(fileURLToPath(import.meta.url));
const templatePath = path.join(directory, "agentcore.template.json");
const configPath = path.join(directory, "agentcore.json");
const targetsPath = path.join(directory, "aws-targets.json");

const template = fs.readFileSync(templatePath, "utf8");
if (!template.includes("__BEDROCK_MODEL_ID__")) {
  throw new Error("AgentCore template is missing the model placeholder");
}

fs.writeFileSync(
  configPath,
  template.replace("__BEDROCK_MODEL_ID__", modelId),
  "utf8",
);
if (!fs.existsSync(targetsPath)) {
  fs.writeFileSync(targetsPath, "[]\n", "utf8");
}

console.log(`Wrote ${configPath}`);
console.log(`Configured BEDROCK_MODEL_ID=${modelId}`);
