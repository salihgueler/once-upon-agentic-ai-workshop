# Chapter 9 — Optional: Real Retrieval with a Vector Store

[← Chapter 8](08-aws-agents-deployment.md) · [Back to README](../README.md)

---

## Quest objective

Upgrade the Rules Agent from keyword matching to **real semantic retrieval** over the
D&D Basic Rules, using a local embedding model and a vector database.

In [Chapter 5](05-a2a-integration.md) the Rules Agent looked answers up in
`src/local-rules.ts` — six hand-written rules scored by keyword overlap. It kept the
workshop runnable with zero downloads, and it deliberately left a seam:

> The Rules Agent only depends on the `lookupRule(query)` signature, not on where the
> data comes from.

This chapter cashes in that seam. You change **one import and one callback**, and the
agent starts answering from 1,251 passages indexed out of the real rulebook.

Everything still runs on your machine. The embedding model executes in-process via
Transformers.js — there is no cloud call, no API key, and no cost.

> **This chapter is optional** and independent of [Chapter 8](08-aws-agents-deployment.md).
> You can do it straight after Chapter 5, 6, or 7.

## What is already provided

| Path | Purpose |
| :-- | :-- |
| `knowledge/dnd_knowledge_base/` | **Pre-built LanceDB vector store** (1,251 passages) — committed, so there is no ingestion step |
| `knowledge/DnD_BasicRules_2018.pdf` | The source rulebook, only needed if you re-index |
| `src/rules-knowledge-base.ts` | Provided retrieval module — embeds a query and runs the vector search |
| `src/build-knowledge-base.ts` | Provided ingestion script, for re-indexing |

The two new dependencies are already pinned in `package.json`:

```jsonc
"@huggingface/transformers": "4.0.1",
"@lancedb/lancedb": "0.27.2"
```

> **Create:** none — you **modify** `src/rules-agent.ts`<br>
> **Reference after attempting the exercise:** [`completed/09-rag-rules/src/rules-agent.ts`](../completed/09-rag-rules/src/rules-agent.ts)

## How the retrieval works

Two ideas do all the work.

**1. An embedding turns text into a vector.** `all-MiniLM-L6-v2` maps a string to 384
numbers positioned so that semantically similar text lands nearby. "How does advantage
work?" ends up near a passage about advantage even though they share few words — which
is exactly what keyword scoring cannot do.

**2. A vector database finds nearest neighbours.** LanceDB stores each passage with its
vector and answers "which rows are closest to this query vector?" quickly.

`src/rules-knowledge-base.ts` wires those together and exposes one function with the
same contract as the keyword lookup — a page-referenced string, or `null`:

```typescript
export async function lookupRuleSemantic(query: string): Promise<string | null>;
```

The model loads once on the first query (a few seconds) and stays warm afterwards.

## Step 1 — Point the tool at semantic retrieval

Open `src/rules-agent.ts`. Replace the keyword import:

```diff
-import { lookupRule } from "./local-rules.js";
+import { lookupRuleSemantic } from "./rules-knowledge-base.js";
```

Then make the tool callback `async` and await the lookup:

```typescript
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
```

That is the entire change. The tool name, its schema, the system prompt, the
`A2AExpressServer` wiring, and the orchestrator all stay exactly as they were — which
is the point of having built against a seam.

`src/local-rules.ts` is now unused by the agent. Leave it in place so you can switch
back and compare the two strategies.

## Step 2 — Run it

Start the Rules Agent on its own first:

```bash
npm run agent:rules
```

Ask it something the keyword dataset never covered, through the full stack. In separate
terminals start the other three services, exactly as in Chapter 5:

```bash
npm run mcp:server
npm run agent:characters
npm run game-master
```

Then:

```bash
curl -X POST http://127.0.0.1:8009/inquire \
  -H "Content-Type: application/json" \
  -d '{"question": "How does grappling work?"}'
```

Grappling is **not** one of the six hand-written rules, so before this chapter the
agent could only say "No matching rule found." Now it retrieves the real passage and
cites its page.

Good queries to contrast the two approaches:

| Query | Keyword lookup | Vector search |
| :-- | :-- | :-- |
| `dexterity check` | Works — the word is a keyword | Works |
| `How does grappling work?` | No match | Retrieves the grappling rules |
| `What happens when I drop to 0 hit points?` | Wrong match — scores "Attack Rolls" on the word "roll" | Retrieves the relevant passage |

## Step 3 — Optional: re-index the rulebook

You do not need this — the store is committed. Run it only to re-index, or to point the
pipeline at your own material:

```bash
npm run kb:build
```

It extracts text from the PDF, strips the repeated page furniture, packs sentences into
~550-character passages, embeds each one, and overwrites the LanceDB table. On a laptop
this takes a few minutes and downloads the ~23MB embedding model on first run.

To index your own source, drop a PDF in `knowledge/`, update `PDF_PATH` in
`src/build-knowledge-base.ts`, and re-run. Nothing else changes — the agent does not
know or care where the passages came from.

## Retrieval quality is a design choice, not a given

The first version of this store split on PDF paragraph breaks and produced 180
page-sized chunks. Retrieval was poor: passages opened with legal boilerplate, and
"dexterity saving throw" returned a passage about falling unconscious.

Two changes fixed it, and both are worth remembering when you build your own:

- **Strip repeated furniture.** Headers, footers, and "Not for resale" appeared on
  nearly every page, so they diluted every embedding.
- **Match chunk size to the question.** Whole-page chunks average away the specific
  rule you asked about. ~550-character passages score far more precisely.

Same model, same database, same query — an order of magnitude better answers. In a RAG
system, ingestion quality usually matters more than model choice.

## Where this is still a workshop, not production

- Retrieval returns the single nearest passage. Production systems retrieve several and
  re-rank them.
- There is no evaluation set, so "better" here is a judgement call rather than a
  measurement.
- The store is a committed file read from disk. A real deployment would host it, version
  it, and re-index on a schedule.
- Chunking is sentence-packing. Structure-aware chunking that respects headings and
  tables does better on a rulebook.

## What you learned

- How an embedding model plus a vector database replace keyword matching
- Why building against a narrow seam (`lookupRule`) made a substantial upgrade a
  two-line change
- That local embeddings via Transformers.js keep RAG entirely on your machine
- How chunking and cleanup dominate retrieval quality

---

[← Chapter 8](08-aws-agents-deployment.md) · [Back to README](../README.md)
