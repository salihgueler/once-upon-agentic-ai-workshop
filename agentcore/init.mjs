import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const directory = path.dirname(fileURLToPath(import.meta.url));
const cdkDirectory = path.join(directory, "cdk");
if (fs.existsSync(cdkDirectory)) {
  console.log(`${cdkDirectory} already exists`);
  process.exit(0);
}

const scaffoldRoot = path.join(directory, ".scaffold");
const projectName = "OnceUponAgenticAI";
const generatedProject = path.join(scaffoldRoot, projectName);
fs.rmSync(scaffoldRoot, { recursive: true, force: true });
fs.mkdirSync(scaffoldRoot, { recursive: true });

const result = spawnSync(
  "agentcore",
  ["create", "--project-name", projectName, "--no-agent"],
  {
    cwd: scaffoldRoot,
    env: { ...process.env, INIT_CWD: scaffoldRoot },
    stdio: "inherit",
  },
);
if (result.error !== undefined || result.status !== 0) {
  fs.rmSync(scaffoldRoot, { recursive: true, force: true });
  throw result.error ?? new Error(`agentcore create exited with ${String(result.status)}`);
}

fs.cpSync(path.join(generatedProject, "agentcore", "cdk"), cdkDirectory, {
  recursive: true,
});
fs.rmSync(scaffoldRoot, { recursive: true, force: true });
console.log(`Generated ${cdkDirectory}`);
