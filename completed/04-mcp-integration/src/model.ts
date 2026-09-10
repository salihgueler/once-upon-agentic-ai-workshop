/**
 * Model selection for the workshop.
 *
 * `createModel()` returns a Strands model provider based on environment
 * configuration. It is LOCAL-FIRST: with nothing configured it talks to a
 * local Ollama instance through Strands' OpenAI Chat Completions provider.
 * Set `MODEL_PROVIDER=bedrock` (and `BEDROCK_MODEL_ID`) to use Amazon Bedrock.
 *
 * APIs are grounded in the Strands TypeScript SDK:
 *   - `BedrockModel` — `@strands-agents/sdk`
 *   - `OpenAIModel`  — `@strands-agents/sdk/models/openai`
 */
import { BedrockModel } from "@strands-agents/sdk";
import { OpenAIModel } from "@strands-agents/sdk/models/openai";

/** The concrete provider types this factory can return. */
export type WorkshopModel = OpenAIModel | BedrockModel;

const DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434/v1";
const DEFAULT_OLLAMA_MODEL_ID = "gemma4:latest";

/**
 * Reads a trimmed, non-empty environment variable, or `undefined`.
 */
function env(name: string): string | undefined {
  const value = process.env[name];
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Build a local Ollama-backed model via the OpenAI Chat Completions provider.
 *
 * Ollama exposes an OpenAI-compatible API at `/v1`. The OpenAI client requires
 * *some* API key string, but Ollama ignores it — so we pass a harmless
 * placeholder unless the user overrides it.
 */
function createOllamaModel(): OpenAIModel {
  const baseURL = env("OLLAMA_BASE_URL") ?? DEFAULT_OLLAMA_BASE_URL;
  const modelId = env("OLLAMA_MODEL_ID") ?? DEFAULT_OLLAMA_MODEL_ID;
  const apiKey = env("OLLAMA_API_KEY") ?? "ollama";

  return new OpenAIModel({
    api: "chat",
    modelId,
    apiKey,
    clientConfig: { baseURL },
  });
}

/**
 * Build an Amazon Bedrock-backed model.
 *
 * Unlike the local default, Bedrock has no built-in workshop default model, so
 * `BEDROCK_MODEL_ID` is required. Standard AWS credentials (SigV4) are used
 * unless `BEDROCK_API_KEY` is provided for bearer-token auth.
 */
function createBedrockModel(): BedrockModel {
  const modelId = env("BEDROCK_MODEL_ID");
  if (modelId === undefined) {
    throw new Error(
      "MODEL_PROVIDER=bedrock requires BEDROCK_MODEL_ID to be set to an " +
        "inference profile available in your AWS account. See .env.example.",
    );
  }

  const region = env("AWS_REGION") ?? env("AWS_DEFAULT_REGION") ?? "us-east-1";
  const apiKey = env("BEDROCK_API_KEY");

  return new BedrockModel({
    modelId,
    region,
    maxTokens: 4096,
    temperature: 0.7,
    ...(apiKey !== undefined ? { apiKey } : {}),
  });
}

/**
 * Create the model provider selected by the environment.
 *
 * @returns An {@link OpenAIModel} (Ollama, the default) or a {@link BedrockModel}.
 * @throws If `MODEL_PROVIDER` is an unknown value, or Bedrock is selected
 *   without `BEDROCK_MODEL_ID`.
 */
export function createModel(): WorkshopModel {
  const provider = (env("MODEL_PROVIDER") ?? "ollama").toLowerCase();

  switch (provider) {
    case "ollama":
      return createOllamaModel();
    case "bedrock":
      return createBedrockModel();
    default:
      throw new Error(
        `Unknown MODEL_PROVIDER "${provider}". Use "ollama" (default) or "bedrock".`,
      );
  }
}
