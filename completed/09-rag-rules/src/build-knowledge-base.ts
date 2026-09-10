/**
 * Rebuild the committed rules vector store (optional Chapter 9).
 *
 * The workshop ships a pre-built store, so you do NOT need to run this to
 * complete the chapter. Run it only if you want to re-index the PDF or point the
 * pipeline at your own source material:
 *
 *   npm run kb:build
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import {
  pipeline,
  type FeatureExtractionPipeline,
} from "@huggingface/transformers";
import * as lancedb from "@lancedb/lancedb";
import { EMBEDDING_MODEL, KB_PATH, KB_TABLE } from "./rules-knowledge-base.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PDF_PATH = path.resolve(
  __dirname,
  "..",
  "knowledge",
  "DnD_BasicRules_2018.pdf",
);

const MIN_PARAGRAPH_LENGTH = 50;
const BATCH_SIZE = 50;
const TARGET_CHUNK_LENGTH = 550;

/** Legal footer and page furniture repeated on nearly every page. */
const BOILERPLATE =
  /D&D Basic Rules \(Version [\d.]+\)\.?|Not for resale\.?|Permission granted to print and photocopy this document for personal use only\.?/gi;

interface Chunk {
  id: string;
  text: string;
  page: number;
  paragraph: number;
  source: string;
}

interface LanceRecord extends Chunk {
  vector: number[];
}

type PipelineFactory = (...args: unknown[]) => Promise<FeatureExtractionPipeline>;

/** Strip repeated furniture and collapse whitespace so chunks carry only rules text. */
function cleanPageText(raw: string): string {
  return raw
    .replace(BOILERPLATE, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Split cleaned page text into retrieval-sized passages.
 *
 * The PDF's paragraph breaks survive extraction poorly, so we pack sentences up
 * to `TARGET_CHUNK_LENGTH`. Smaller passages score far more precisely than
 * whole-page blobs.
 */
function toPassages(pageText: string): string[] {
  const sentences = pageText.split(/(?<=[.!?])\s+/);
  const passages: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    const candidate = current.length === 0 ? sentence : `${current} ${sentence}`;
    if (candidate.length >= TARGET_CHUNK_LENGTH) {
      passages.push(candidate.trim());
      current = "";
    } else {
      current = candidate;
    }
  }
  if (current.trim().length > 0) passages.push(current.trim());

  return passages.filter((passage) => passage.length > MIN_PARAGRAPH_LENGTH);
}

/** Split every PDF page into paragraph-sized chunks worth embedding. */
async function extractChunks(pdfPath: string): Promise<Chunk[]> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(fs.readFileSync(pdfPath)) });
  const parsed = await parser.getText();

  const chunks: Chunk[] = [];
  for (const page of parsed.pages) {
    const cleaned = cleanPageText(page.text);
    if (cleaned.length === 0) continue;

    const passages = toPassages(cleaned);
    for (let index = 0; index < passages.length; index += 1) {
      const passage = passages[index];
      if (passage === undefined) continue;
      chunks.push({
        id: `page_${String(page.num)}_para_${String(index)}`,
        text: passage,
        page: page.num,
        paragraph: index,
        source: path.basename(pdfPath),
      });
    }
  }
  return chunks;
}

async function main(): Promise<void> {
  if (!fs.existsSync(PDF_PATH)) {
    console.error(`Source PDF not found: ${PDF_PATH}`);
    process.exit(1);
  }

  console.log("Extracting text from the Basic Rules PDF...");
  const chunks = await extractChunks(PDF_PATH);
  if (chunks.length === 0) {
    console.error("No text chunks were extracted; aborting.");
    process.exit(1);
  }
  console.log(`Extracted ${String(chunks.length)} chunks`);

  console.log(`Loading the local embedding model (${EMBEDDING_MODEL})...`);
  const createPipeline = pipeline as unknown as PipelineFactory;
  const extractor = await createPipeline("feature-extraction", EMBEDDING_MODEL);

  const records: LanceRecord[] = [];
  const totalBatches = Math.ceil(chunks.length / BATCH_SIZE);

  for (let start = 0; start < chunks.length; start += BATCH_SIZE) {
    const batch = chunks.slice(start, start + BATCH_SIZE);
    for (const chunk of batch) {
      const output = await extractor(chunk.text, {
        pooling: "mean",
        normalize: true,
      });
      records.push({ ...chunk, vector: Array.from(output.data as Float32Array) });
    }
    const batchNumber = Math.floor(start / BATCH_SIZE) + 1;
    console.log(`Embedded batch ${String(batchNumber)}/${String(totalBatches)}`);
  }

  const db = await lancedb.connect(KB_PATH);
  await db.createTable(
    KB_TABLE,
    records as unknown as Record<string, unknown>[],
    { mode: "overwrite" },
  );

  console.log(`Wrote ${String(records.length)} passages to ${KB_PATH}`);
}

await main();
