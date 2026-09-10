# Chapter 8 — Optional: Deploy the Agents with Amazon Bedrock AgentCore

[← Chapter 7](07-cleanup.md) · [Optional Chapter 9 →](09-rag-vector-store.md) · [Back to README](../README.md)

---

This optional extension deploys the **agent backend only** to Amazon Bedrock
AgentCore Runtime. The React application stays on your machine and reaches the
runtime through a small local SigV4 proxy. Chapters 0–7 remain Ollama-first and
require no AWS account.

> **This chapter creates billable AWS resources.** AgentCore Runtime and Amazon
> Bedrock charge for usage. Review current pricing and run the cleanup step when
> you finish.

## Architecture

```text
Local React app
    │ /api/* (same-origin Vite proxy)
    ▼
Local SigV4 proxy on 127.0.0.1:8009
    │ InvokeAgentRuntime (AWS IAM)
    ▼
AgentCore Runtime — Node.js 22 CodeZip
    ├── Game Master invocation handler :8080
    ├── Rules A2A Agent              127.0.0.1:8000
    ├── Character A2A Agent          127.0.0.1:8001
    └── Dice MCP server              127.0.0.1:8081
         └── AgentCore session storage: /mnt/session/characters.json
```

The existing MCP and A2A services still communicate over loopback, preserving the
contracts built in Chapters 4 and 5. AgentCore exposes only its required `/ping`
and `/invocations` endpoints. No frontend files, load balancer, Fargate service,
EFS file system, or Docker image are deployed.

AgentCore CLI uses esbuild to compile TypeScript and bundle runtime dependencies
into a small CodeZip archive. The validated workshop bundle is approximately
0.70 MB; it does **not** vendor the full `node_modules` directory.

## Included files

- `agentcore/runtime/main.ts` — AgentCore HTTP adapter and service startup.
- `agentcore/local-proxy.ts` — local SigV4 bridge for the unchanged React API.
- `agentcore/agentcore.template.json` — account-neutral runtime configuration.
- `agentcore/configure.mjs` — writes a git-ignored config with your model ID.
- `agentcore/init.mjs` — asks your installed CLI to generate its version-matched
  deployment support files locally.

Account IDs, runtime ARNs, deployment state, generated CDK files, and CodeZip
archives are git-ignored.

## Prerequisites

You need Node.js 22 or newer, AWS CLI credentials for a non-production workshop
account, AgentCore deployment permissions, and access to a Bedrock inference
profile in your chosen region.

Install the current AgentCore CLI as documented by AWS:

```bash
npm install --global @aws/agentcore@latest
agentcore --version
```

Select and verify your account before creating anything:

```bash
export AWS_PROFILE=<your-workshop-profile>
export AWS_REGION=<your-bedrock-region>

aws sts get-caller-identity --profile "$AWS_PROFILE"
aws bedrock list-inference-profiles \
  --profile "$AWS_PROFILE" \
  --region "$AWS_REGION"

export BEDROCK_MODEL_ID=<your-inference-profile-id>
```

Confirm the STS account is the intended workshop account. Never put credentials,
API keys, or account-specific runtime state in the repository.

## 1. Install and configure

From the repository root:

```bash
npm ci
npm run agentcore:configure -- "$BEDROCK_MODEL_ID"
npm run agentcore:init
```

`agentcore:configure` creates git-ignored `agentcore/agentcore.json` and
`agentcore/aws-targets.json`. `agentcore:init` generates the CLI-managed CDK
support directory using the installed CLI version; that directory is also ignored.

## 2. Validate and package without deploying

```bash
npm run build
npm run agentcore:type-check
agentcore validate
agentcore package --runtime GameMaster
```

Expected packaging output includes a generated `agentcore/GameMaster.zip`. The
archive is ignored and may be deleted after validation.

### AgentCore CLI 0.28.1 packaging issue

If packaging fails with `The esbuild JavaScript API cannot be bundled`, you have
hit [agentcore-cli PR #2126](https://github.com/aws/agentcore-cli/pull/2126).
Upgrade once a release containing that fix is available. For affected installations,
point the CLI at its installed binary for this command:

```bash
ESBUILD_BINARY_PATH="$(npm root --global)/@aws/agentcore/node_modules/esbuild/bin/esbuild" \
  agentcore package --runtime GameMaster
```

This workaround produced the validated 0.70 MB bundle. It does not change or
publish AWS resources.

## 3. Preview and deploy

Preview first:

```bash
agentcore deploy --dry-run
agentcore deploy --diff
```

The CLI may prompt you to configure the default AWS target on first use. Recheck
the account and region shown in the preview. Then deploy:

```bash
agentcore deploy
```

The CLI compiles the TypeScript runtime, uploads the CodeZip asset, and creates the
AgentCore runtime, IAM role, logging, and session-storage configuration. It does not
build a Docker image.

## 4. Verify the deployed agents

```bash
agentcore status
agentcore invoke --runtime GameMaster "Roll a d20 for initiative."
agentcore logs --runtime GameMaster
```

A successful response should contain a structured `dice_rolls` entry produced by
the loopback MCP service. Use a unique character name for a second invocation to
exercise the Character Agent.

## 5. Connect the local React app

Copy the Game Master runtime ARN from `agentcore status`, then start the local
SigV4 proxy:

```bash
export AGENTCORE_RUNTIME_ARN=<game-master-runtime-arn>
npm run agentcore:proxy
```

In another terminal, start the unchanged frontend:

```bash
npm run web:dev
```

Open `http://127.0.0.1:5173`. Vite proxies `/api/*` to the local process on port
8009; that process signs `InvokeAgentRuntime` requests with your configured AWS
credentials. Credentials are never sent to the browser.

The proxy reuses one AgentCore session ID, so character data remains available
while that session is active. AgentCore session storage is not a permanent database;
use DynamoDB or another durable store before treating this as a production service.

## Security and production boundaries

- Inbound runtime authentication uses AWS IAM and SigV4.
- Only AgentCore's HTTP contract is exposed; MCP and A2A listeners stay on loopback.
- The local proxy binds explicitly to `127.0.0.1`.
- The model ID is written only to a git-ignored generated configuration.
- Do not submit secrets, personal data, proprietary content, or internal material.
- Add durable storage, authorization, quotas, budgets, alarms, and evaluation before
  production use.

## 6. Teardown

> **A deployed AgentCore runtime keeps costing money until you remove it.** Complete
> this section in order in the same session in which you deployed — do not leave it
> for later.

### 6.1 Stop the local processes

Step 5 started two local processes. Return to each terminal and press `Ctrl+C`:

- the SigV4 proxy (`npm run agentcore:proxy`)
- the Vite dev server (`npm run web:dev`)

If you are unsure whether something is still bound, check those specific ports and
stop only the PIDs you find:

```bash
lsof -i :8009
lsof -i :5173
kill <pid>
```

### 6.2 Remove the cloud resources

Confirm you are pointed at the workshop account before you remove anything:

```bash
aws sts get-caller-identity
```

Then ask the CLI to remove the project resources and deploy that removal plan:

```bash
agentcore remove all
agentcore deploy
```

Review the removal diff and confirm it targets the account you just verified before
approving it. This deletes the deployed runtime and the supporting resources the CLI
created for it.

### 6.3 Verify nothing is left running

```bash
agentcore status
```

The status output should list no deployed runtime resources. If it still shows a
runtime, re-run `agentcore deploy` and re-read the diff — do not stop here, because a
runtime that survives teardown continues to bill.

Two things the CLI does not remove for you:

- **CloudWatch log groups** for the runtime persist after the runtime is gone. They
  are cheap but not free, and they retain your invocation logs. List and delete the
  ones belonging to this workshop:

  ```bash
  aws logs describe-log-groups --query "logGroups[?contains(logGroupName, 'GameMaster')].logGroupName"
  aws logs delete-log-group --log-group-name <log-group-name>
  ```

- **Bedrock model access** stays enabled on your account. It costs nothing when idle,
  so there is no action required.

### 6.4 Remove the generated local files

```bash
rm agentcore/agentcore.json
rm agentcore/aws-targets.json
rm -r agentcore/cdk
rm -r agentcore/.cli
rm -r agentcore/GameMaster
```

Remove only these named paths. Do not delete the tracked template, runtime adapter,
proxy, or configuration scripts — they are the workshop source.

### 6.5 Confirm the bill

AgentCore charges accrue per runtime and per invocation, so a successful teardown
should flatten your costs within a day. Check the next day in
[Cost Explorer](https://console.aws.amazon.com/cost-management/home) or the
[Billing console](https://console.aws.amazon.com/billing/home), filtered to Bedrock,
and confirm that charges stop after your teardown timestamp. If they do not, a
resource survived removal — return to step 6.3.

Local processes, generated data, and Ollama are covered separately in
[Chapter 7](07-cleanup.md).

## Official references

- [AgentCore CLI for TypeScript](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-get-started-cli-typescript.html)
- [Direct code deployment for Node.js](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-get-started-code-deploy-node.html)
- [Strands deployment to AgentCore Runtime](https://strandsagents.com/docs/user-guide/deploy/deploy_to_bedrock_agentcore/)
- [AgentCore A2A protocol](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-a2a.html)
- [AgentCore MCP protocol](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-mcp.html)

---

[← Chapter 7](07-cleanup.md) · [Optional Chapter 9 →](09-rag-vector-store.md) · [Back to README](../README.md)
