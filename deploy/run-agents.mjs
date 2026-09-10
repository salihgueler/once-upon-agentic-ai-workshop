import { spawn } from "node:child_process";

const serviceEntrypoints = [
  "dist/mcp-server/server.js",
  "dist/rules-agent.js",
  "dist/character-agent.js",
  "dist/gamemaster-orchestrator.js",
];

const children = new Set();
let stopping = false;
let exitCode = 0;
let resolveAllExited;
const allExited = new Promise((resolve) => {
  resolveAllExited = resolve;
});

function stopChildren(signal) {
  for (const child of children) {
    child.kill(signal);
  }
}

function beginShutdown(signal, code) {
  if (stopping) return;
  stopping = true;
  exitCode = code;
  stopChildren(signal);

  const forceTimer = setTimeout(() => {
    stopChildren("SIGKILL");
  }, 10_000);
  forceTimer.unref();
}

for (const entrypoint of serviceEntrypoints) {
  const child = spawn(process.execPath, [entrypoint], {
    env: process.env,
    stdio: "inherit",
  });
  children.add(child);

  child.once("error", (error) => {
    console.error(`Failed to start ${entrypoint}: ${String(error)}`);
    beginShutdown("SIGTERM", 1);
  });

  child.once("exit", (code, signal) => {
    children.delete(child);
    if (!stopping) {
      console.error(
        `${entrypoint} exited unexpectedly (code=${String(code)}, signal=${String(signal)})`,
      );
      beginShutdown("SIGTERM", code ?? 1);
    }
    if (children.size === 0) resolveAllExited();
  });
}

process.once("SIGTERM", () => beginShutdown("SIGTERM", 0));
process.once("SIGINT", () => beginShutdown("SIGINT", 0));

await allExited;
process.exitCode = exitCode;
