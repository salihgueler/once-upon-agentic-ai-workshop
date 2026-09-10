#!/usr/bin/env node
import { App } from "aws-cdk-lib";
import { AgentsStack } from "../lib/agents-stack.js";

const app = new App();
const bedrockModelId = app.node.tryGetContext("bedrockModelId") as unknown;

if (typeof bedrockModelId !== "string" || bedrockModelId.trim().length === 0) {
  throw new Error(
    "Pass -c bedrockModelId=<inference-profile-id> when running CDK commands.",
  );
}

new AgentsStack(app, "OnceUponAgenticAiAgents", {
  bedrockModelId: bedrockModelId.trim(),
  env: {
    account: process.env["CDK_DEFAULT_ACCOUNT"],
    region: process.env["CDK_DEFAULT_REGION"] ?? process.env["AWS_REGION"] ?? "us-east-1",
  },
});
