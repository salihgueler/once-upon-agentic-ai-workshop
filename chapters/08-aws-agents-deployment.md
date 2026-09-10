# Chapter 8 — Optional: Deploy the Agents to AWS

[← Chapter 7](07-cleanup.md) · [Back to README](../README.md)

---

This optional extension moves the **agent backend only** to AWS. The React app is
not deployed: it keeps running on your machine and reaches the cloud Game Master
through the Vite proxy you used in Chapter 6.

The local-first path remains the default. Complete Chapters 0–7 with Ollama before
using this chapter.

> **This chapter creates billable AWS resources.** Fargate, an Application Load
> Balancer, EFS, CloudFront, CloudWatch Logs, and Amazon Bedrock can all incur
> charges. Costs vary by region and usage and do not scale completely to zero.
> Run the teardown at the end when you finish.

## What gets deployed

```text
Local React app
    │  Vite proxy: /api/* → AGENTS_URL
    ▼
CloudFront HTTPS endpoint (API traffic only; no frontend files)
    │  CloudFront VPC origin
    ▼
Private Application Load Balancer
    │  port 8009
    ▼
One ECS Fargate task
    ├── Game Master API       0.0.0.0:8009
    ├── Dice MCP server       127.0.0.1:8080
    ├── Rules Agent           127.0.0.1:8000
    └── Character Agent       127.0.0.1:8001
         │
         ├── Amazon Bedrock through the ECS task role
         └── Encrypted EFS character store
```

All four Node.js processes run in one container because the workshop agents already
communicate over loopback. Only the Game Master port is reachable from the load
balancer. The load balancer is private; CloudFront is its VPC origin and provides
the public HTTPS endpoint.

The task runs in a public subnet with a public IP for outbound Bedrock calls, but
its security group accepts inbound traffic only from the private load balancer.
This avoids the fixed hourly cost of a NAT gateway in a short-lived workshop stack.

### Why Fargate instead of AgentCore Runtime?

The official Strands deployment guides support both options. AgentCore Runtime is
the purpose-built, usage-based agent platform and supports HTTP, MCP, and A2A. Its
TypeScript HTTP contract requires `/ping` and `/invocations`; deploying the Rules,
Character, MCP, and Game Master services as separate AgentCore runtimes would also
change service discovery, runtime authentication, persistence, and how the local
Vite proxy invokes the Game Master.

This extension deliberately preserves the Chapter 4–6 contracts: `/mcp`, A2A agent
cards, `/health`, `/inquire`, and `/user/:name`. The official Strands Fargate guide
uses the same core pattern used here—Docker, a TypeScript CDK stack, an ECS task role
for Bedrock, health checks, and a load balancer. AgentCore is an excellent follow-on
exercise when you are ready to redesign each service around its runtime protocol
and managed identity model.

Official references:

- [Strands: TypeScript deployment to AgentCore Runtime](https://strandsagents.com/docs/user-guide/deploy/deploy_to_bedrock_agentcore/typescript/)
- [Strands: deployment to AWS Fargate](https://strandsagents.com/docs/user-guide/deploy/deploy_to_aws_fargate/)
- [AWS: AgentCore CLI for TypeScript](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-get-started-cli-typescript.html)

## What the reference implementation adds

The `deploy/` directory contains:

- `Dockerfile` — backend-only, multi-stage Node.js image.
- `run-agents.mjs` — starts and supervises all four services.
- `bin/agents-app.ts` — CDK application entrypoint.
- `lib/agents-stack.ts` — Fargate, EFS, private ALB, CloudFront, IAM, and logs.
- Exact dependency versions in `package-lock.json`.

Two existing runtime settings make the same source work locally and in AWS:

- `HOST` defaults to `127.0.0.1`; the cloud task sets it to `0.0.0.0` only for the
  Game Master listener.
- `CHARACTER_STORE_PATH` defaults to `src/characters.json`; the cloud task points
  it at the EFS mount.

## Prerequisites

You need:

- The completed local workshop.
- Node.js 22 or newer.
- Docker Desktop or another working Docker engine.
- AWS CLI credentials for a **non-production workshop account**.
- Permission to deploy CDK/CloudFormation, ECS, ECR assets, EC2 networking, EFS,
  Elastic Load Balancing, CloudFront, CloudWatch Logs, and IAM roles.
- Amazon Bedrock model access in your selected region.
- An inference-profile ID compatible with the selected region.

Use a least-privilege deployment role where your environment provides one. Do not
paste credentials or API keys into source files, CDK context, or shell history.
The running task uses its ECS IAM role; no AWS credential is baked into the image.

## 1. Select and verify the AWS account

Set the profile and region in your own terminal:

```bash
export AWS_PROFILE=<your-workshop-profile>
export AWS_REGION=<your-bedrock-region>

aws sts get-caller-identity --profile "$AWS_PROFILE"
aws bedrock list-inference-profiles \
  --profile "$AWS_PROFILE" \
  --region "$AWS_REGION"
```

Read the account ID returned by STS and confirm it is the intended workshop account.
Copy an enabled inference-profile ID from the Bedrock response:

```bash
export BEDROCK_MODEL_ID=<your-inference-profile-id>
```

The profile name stays in your local AWS configuration. `BEDROCK_MODEL_ID` is not a
secret, but keeping it in an environment variable avoids committing account-specific
configuration.

## 2. Install and validate locally

From the repository root:

```bash
npm ci
npm --prefix deploy ci
npm run build
npm --prefix deploy run type-check
npm --prefix deploy run synth -- \
  -c bedrockModelId="$BEDROCK_MODEL_ID"
```

Strict synthesis validates the CloudFormation graph but creates no AWS resources.
The Strands deployment guides recommend testing the image locally before deployment.
Build exactly the backend-only image CDK will publish:

```bash
docker build \
  --platform linux/arm64 \
  --file deploy/Dockerfile \
  --tag once-upon-agentic-ai-agents:local \
  .
```

The image intentionally excludes `web/`; no frontend bundle is built or copied.

## 3. Bootstrap and review the change set

CDK needs a bootstrap stack in each account and region used for container assets:

```bash
AWS_ACCOUNT_ID=$(aws sts get-caller-identity \
  --profile "$AWS_PROFILE" \
  --query Account \
  --output text)

npm --prefix deploy run cdk -- bootstrap \
  "aws://$AWS_ACCOUNT_ID/$AWS_REGION" \
  --profile "$AWS_PROFILE"
```

Always review the planned infrastructure before deployment:

```bash
npm --prefix deploy run diff -- \
  -c bedrockModelId="$BEDROCK_MODEL_ID" \
  --profile "$AWS_PROFILE"
```

Expect the diff to include a VPC, two public and two isolated subnets, ECS resources,
an EFS file system and access point, an internal ALB, a CloudFront distribution,
CloudWatch Logs, and IAM roles. Stop if the account, region, or resources differ from
what you intended.

## 4. Deploy the agent backend

```bash
npm --prefix deploy run deploy -- \
  -c bedrockModelId="$BEDROCK_MODEL_ID" \
  --profile "$AWS_PROFILE"
```

Approve the IAM/security changes only after reviewing the diff. CDK builds the
backend image, publishes it to the bootstrap ECR repository, and deploys the stack.
CloudFront and its VPC origin can take several minutes to become ready.

The deployment prints two outputs:

- `AgentsUrl` — the HTTPS Game Master endpoint.
- `LogGroupName` — the CloudWatch Logs group shared by the four processes.

Retrieve them later with read-only CloudFormation calls:

```bash
export AGENTS_URL=$(aws cloudformation describe-stacks \
  --stack-name OnceUponAgenticAiAgents \
  --profile "$AWS_PROFILE" \
  --region "$AWS_REGION" \
  --query 'Stacks[0].Outputs[?OutputKey==`AgentsUrl`].OutputValue' \
  --output text)

export AGENTS_LOG_GROUP=$(aws cloudformation describe-stacks \
  --stack-name OnceUponAgenticAiAgents \
  --profile "$AWS_PROFILE" \
  --region "$AWS_REGION" \
  --query 'Stacks[0].Outputs[?OutputKey==`LogGroupName`].OutputValue' \
  --output text)
```

## 5. Verify the cloud agents

Start with the health endpoint:

```bash
curl --fail --silent --show-error "$AGENTS_URL/health"
```

Expected response:

```json
{"status":"healthy"}
```

Then exercise an actual Bedrock-backed orchestration:

```bash
curl --fail --silent --show-error \
  --request POST "$AGENTS_URL/inquire" \
  --header 'Content-Type: application/json' \
  --data '{"question":"Ask the rules agent how initiative works."}'
```

Finally verify MCP delegation:

```bash
curl --fail --silent --show-error \
  --request POST "$AGENTS_URL/inquire" \
  --header 'Content-Type: application/json' \
  --data '{"question":"Roll a d20 for initiative."}'
```

The response should contain a validated `dice_rolls` entry. If a request fails,
stream the container logs:

```bash
aws logs tail "$AGENTS_LOG_GROUP" \
  --follow \
  --profile "$AWS_PROFILE" \
  --region "$AWS_REGION"
```

## 6. Use the local React app with the cloud agents

The React app still runs locally. Point its existing Vite proxy at the HTTPS output:

```bash
GM_ORCHESTRATOR_URL="$AGENTS_URL" npm run web:dev
```

Open `http://127.0.0.1:5173`. The browser continues to call same-origin `/api/*`;
Vite forwards those requests to AWS. There is no editable server field and no
frontend deployment.

Create a uniquely named character and verify that you can refresh the game route and
retrieve the character again. The JSON store lives on encrypted EFS, so it survives
task replacement. The stack deliberately runs one task because the workshop's JSON
file store is not safe for concurrent writers.

## Security and production boundaries

This stack is a learning deployment, not a production service:

- The CloudFront URL is public and has **no authentication**. Do not submit secrets,
  personal data, proprietary rules, or internal content.
- CloudFront redirects HTTP viewers to HTTPS and reaches a private ALB through a VPC
  origin. The ALB has no public endpoint.
- The ECS role grants only Bedrock invoke actions plus EFS client access, but allows
  foundation-model and inference-profile resources so attendees can select a model.
  Narrow those ARNs for a long-lived environment.
- Fargate uses public subnets only for outbound internet/Bedrock access. Its security
  group does not accept public inbound connections.
- One task is intentional. Replace the JSON/EFS store with DynamoDB before adding
  horizontal scaling.
- Add authentication, authorization, WAF/rate limits, alarms, request validation,
  budgets, and a custom domain/certificate before treating this as production.
- Agent calls can be slow. Fargate preserves the long-running HTTP processes used by
  A2A and MCP rather than forcing this workshop into short Lambda integrations.

Review regional pricing in the AWS Pricing Calculator before leaving the stack
running. Bedrock token charges are separate from the continuously provisioned
Fargate, ALB, and EFS resources.

## 7. Tear everything down

Destroy the stack as soon as you finish:

```bash
npm --prefix deploy run destroy -- \
  -c bedrockModelId="$BEDROCK_MODEL_ID" \
  --profile "$AWS_PROFILE"
```

Confirm the stack no longer exists:

```bash
aws cloudformation describe-stacks \
  --stack-name OnceUponAgenticAiAgents \
  --profile "$AWS_PROFILE" \
  --region "$AWS_REGION"
```

A `ValidationError` saying the stack does not exist is the expected final state.
The stack uses deletion policies for the EFS character data and workshop log group,
so `cdk destroy` removes them. The shared CDK bootstrap stack and its cached container
asset remain for future CDK deployments; they are account-level tooling, not this
workshop service.

If deletion fails, inspect the first failed CloudFormation event rather than retrying
blindly:

```bash
aws cloudformation describe-stack-events \
  --stack-name OnceUponAgenticAiAgents \
  --profile "$AWS_PROFILE" \
  --region "$AWS_REGION"
```

Do not manually delete individual resources unless you understand the dependency and
have confirmed that the stack cannot finish cleanup.

---

[← Chapter 7](07-cleanup.md) · [Back to README](../README.md)
