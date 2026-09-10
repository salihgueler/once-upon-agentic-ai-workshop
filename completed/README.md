# Completed chapter references

This directory contains reference implementations for the workshop exercises. The
repository root is the attendee workspace: build and modify files under `src/` as
you follow the chapters. Do not copy a completed snapshot before attempting the
exercise.

| Directory | Expected state |
| --- | --- |
| `01-strands-basics/` | First standalone Strands agent |
| `02-built-in-tools/` | The agent updated to use `httpRequest` |
| `03-custom-tools/` | The agent updated with a Zod-backed dice tool |
| `04-mcp-integration/` | Cumulative agent plus MCP server and client |
| `05-a2a-integration/` | Cumulative multi-agent backend |
| `final/` | Complete backend expected before Chapters 6–8 |

Each snapshot preserves the same `src/` paths used in the attendee workspace, so
you can compare files directly. The canonical React frontend remains in the root
[`web/`](../web) directory because Chapter 6 integrates with that provided UI
rather than rebuilding it.

From the repository root, validate all reference snapshots with:

```bash
npm run completed:type-check
```
