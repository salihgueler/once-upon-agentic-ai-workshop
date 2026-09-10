/**
 * Vector-backed rules retrieval (optional Chapter 9).
 *
 * Drop-in companion to `local-rules.ts`. That module scores keywords; this one
 * embeds the query with a local all-MiniLM-L6-v2 model and runs a vector search
 * against a committed LanceDB store. Both answer the same question, so the Rules
 * Agent only swaps which lookup it calls.
 *
 * Embeddings run in-process via Transformers.js — no cloud calls.
 */
import * as path from "node:path";
import {
  pipeline,
  type FeatureExtractionPipeline,
} from "@huggingface/transformers";
import * as lancedb from "@lancedb/lancedb";
import type { Table } from "@lancedb/lancedb";

/**
 * Committed vector store built from the D&D Basic Rules PDF.
 *
 * Resolved from the current working directory rather than this file's location, so
 * the module behaves identically whether it stays in `knowledge/` or you copy it
 * into `src/` as Chapter 9 instructs. Run npm scripts from the repository root.
 */
export const KB_PATH = path.resolve(
  process.cwd(),
  "knowledge",
  "dnd_knowledge_base",
);
export const KB_TABLE = "dnd_basic_rules";
export const EMBEDDING_MODEL = "Xenova/all-MiniLM-L6-v2";

/** One retrieved passage. */
export interface RulePassage {
  page: number;
  text: string;
}

type PipelineFactory = (...args: unknown[]) => Promise<FeatureExtractionPipeline>;

/**
 * Lazily-initialized embedder + LanceDB table.
 *
 * The model loads once on first query (a few seconds), then stays warm for the
 * lifetime of the process.
 */
export class RulesKnowledgeBase {
  private table: Table | null = null;
  private extractor: FeatureExtractionPipeline | null = null;

  private async init(): Promise<boolean> {
    if (this.table !== null && this.extractor !== null) return true;

    const createPipeline = pipeline as unknown as PipelineFactory;
    this.extractor = await createPipeline("feature-extraction", EMBEDDING_MODEL);

    const db = await lancedb.connect(KB_PATH);
    this.table = await db.openTable(KB_TABLE);
    return true;
  }

  /** Embed `text` into a normalized mean-pooled vector. */
  private async embed(text: string): Promise<number[]> {
    const extractor = this.extractor;
    if (extractor === null) throw new Error("Embedder not initialized");
    const output = await extractor(text, { pooling: "mean", normalize: true });
    return Array.from(output.data as Float32Array);
  }

  /** Return the best-matching passages, nearest first. */
  async search(query: string, limit = 1): Promise<RulePassage[]> {
    await this.init();
    const table = this.table;
    if (table === null) return [];

    const queryVector = await this.embed(query);
    const rows = await table.vectorSearch(queryVector).limit(limit).toArray();

    const passages: RulePassage[] = [];
    for (const row of rows) {
      const record = row as { page?: unknown; text?: unknown };
      if (typeof record.text !== "string") continue;
      const page = typeof record.page === "number" ? record.page : 0;
      passages.push({ page, text: record.text });
    }
    return passages;
  }
}

const knowledgeBase = new RulesKnowledgeBase();

/**
 * Semantic counterpart to `lookupRule` from `local-rules.ts`.
 *
 * Returns a page-referenced snippet, or `null` when nothing relevant is found —
 * the same contract the keyword lookup offers, so the agent's tool is unchanged.
 */
export async function lookupRuleSemantic(query: string): Promise<string | null> {
  const [best] = await knowledgeBase.search(query, 1);
  if (best === undefined) return null;
  const snippet = best.text.replace(/\s+/g, " ").trim().slice(0, 400);
  return `Basic Rules (p.${String(best.page)}): ${snippet}`;
}
