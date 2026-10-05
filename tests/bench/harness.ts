// Building and process management for the benchmarks.
import { execSync, fork, type ChildProcess } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const BENCH_DIR = path.dirname(fileURLToPath(import.meta.url));
export const REPO = path.resolve(BENCH_DIR, "../..");
export const RESULTS_DIR = path.join(BENCH_DIR, "results");
const VITE_APP = path.join(REPO, "tests/vite");
const BACKEND_PORT = 5657;
const BIFROST_PORT = 5655;
export const BIFROST = `http://127.0.0.1:${BIFROST_PORT}`;
export const BACKEND = `http://127.0.0.1:${BACKEND_PORT}`;

export function build(verbose: boolean) {
  console.log("Building bifrost, bifrost-fastify and tests/vite (--skip-build to skip)...");
  const stdio = verbose ? "inherit" : "pipe";
  execSync("npm run build", { cwd: REPO, stdio });
  execSync("npm run -w=tests-vite build", { cwd: REPO, stdio });
}

export function gitInfo() {
  const git = (cmd: string) => execSync(`git ${cmd}`, { cwd: REPO }).toString().trim();
  return { commit: git("rev-parse --short HEAD"), dirty: git("status --porcelain") !== "" };
}

async function waitForServer(url: string, child: ChildProcess) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`server exited with ${child.exitCode}`);
    try {
      await fetch(url);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  throw new Error(`timed out waiting for ${url}`);
}

/** Production build of tests/vite, with bench-agent.mjs preloaded for CPU stats and profiling over IPC. */
export async function startBifrost(verbose: boolean) {
  const child = fork(path.join(VITE_APP, "dist/server/index.js"), [], {
    cwd: VITE_APP,
    execArgv: ["--import", path.join(BENCH_DIR, "bench-agent.mjs")],
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: String(BIFROST_PORT),
      UPSTREAM_URL: BACKEND,
      PUBLIC_URL: BIFROST,
      LOG_LEVEL: verbose ? "info" : "error",
    },
    stdio: ["ignore", verbose ? "inherit" : "ignore", "inherit", "ipc"],
  });
  await waitForServer(BIFROST + "/bench/events", child);
  return child;
}

export async function startBackend(latencyMs: number) {
  const child = fork(path.join(BENCH_DIR, "backend.ts"), [], {
    execArgv: ["--import", "tsx"],
    env: { ...process.env, PORT: String(BACKEND_PORT), BACKEND_LATENCY_MS: String(latencyMs) },
    stdio: ["ignore", "ignore", "inherit", "ipc"],
  });
  await waitForServer(BACKEND + "/assets/ready.js", child);
  return child;
}

export function stop(child: ChildProcess) {
  return new Promise<void>((resolve) => {
    if (child.exitCode !== null) return resolve();
    child.once("exit", () => resolve());
    child.kill("SIGTERM");
  });
}

let nextMessageId = 0;
export function request<T>(child: ChildProcess, message: Record<string, unknown>): Promise<T> {
  const benchId = ++nextMessageId;
  return new Promise((resolve) => {
    const onMessage = (reply: any) => {
      if (reply?.benchId !== benchId) return;
      child.off("message", onMessage);
      resolve(reply);
    };
    child.on("message", onMessage);
    child.send({ ...message, benchId });
  });
}

export const median = (xs: number[]) => {
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

export const formatDelta = (now: number, before: number) => {
  if (!before) return "-";
  const delta = ((now - before) / before) * 100;
  return `${delta > 0 ? "+" : ""}${delta.toFixed(1)}%`;
};
