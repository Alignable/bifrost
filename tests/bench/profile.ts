// Summarizes a V8 .cpuprofile into self-time tables, so profiles are readable without DevTools.

type ProfileNode = {
  id: number;
  callFrame: { functionName: string; url: string; lineNumber: number; columnNumber: number };
  hitCount?: number;
};
type CpuProfile = { nodes: ProfileNode[]; startTime: number; endTime: number; samples: number[] };

function packageOf(url: string): string {
  if (!url) return "(native/vm)";
  const nm = url.lastIndexOf("/node_modules/");
  if (nm >= 0) {
    const rest = url.slice(nm + "/node_modules/".length).split("/");
    return rest[0].startsWith("@") ? `${rest[0]}/${rest[1]}` : rest[0];
  }
  if (url.includes("/bifrost-fastify/")) return "@alignable/bifrost-fastify";
  if (url.includes("/bifrost/dist/")) return "@alignable/bifrost";
  if (url.includes("/tests/vite/")) return "tests-vite (app)";
  if (url.startsWith("node:")) return "node:internal";
  return url.replace(/^file:\/\//, "");
}

export function summarizeProfile(profile: CpuProfile, top = 25) {
  const totalUs = profile.endTime - profile.startTime;
  const sampleUs = totalUs / profile.samples.length;
  const byFunction = new Map<string, { selfMs: number; pkg: string }>();
  const byPackage = new Map<string, number>();
  let idleMs = 0;
  for (const node of profile.nodes) {
    const selfMs = ((node.hitCount ?? 0) * sampleUs) / 1000;
    if (!selfMs) continue;
    const { functionName, url, lineNumber } = node.callFrame;
    if (functionName === "(idle)") {
      idleMs += selfMs;
      continue;
    }
    const pkg = functionName.startsWith("(") ? functionName : packageOf(url);
    const file = url.split("/").slice(-1)[0];
    const key = `${functionName || "(anonymous)"} ${file ? `${file}:${lineNumber + 1}` : ""}`.trim();
    const entry = byFunction.get(key) ?? { selfMs: 0, pkg };
    entry.selfMs += selfMs;
    byFunction.set(key, entry);
    byPackage.set(pkg, (byPackage.get(pkg) ?? 0) + selfMs);
  }
  const busyMs = totalUs / 1000 - idleMs;
  const pct = (ms: number) => `${((ms / busyMs) * 100).toFixed(1)}%`;
  return {
    busyMs,
    packages: [...byPackage.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([pkg, ms]) => ({ package: pkg, selfMs: +ms.toFixed(1), share: pct(ms) })),
    functions: [...byFunction.entries()]
      .sort((a, b) => b[1].selfMs - a[1].selfMs)
      .slice(0, top)
      .map(([fn, { selfMs, pkg }]) => ({ function: fn, package: pkg, selfMs: +selfMs.toFixed(1), share: pct(selfMs) })),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { readFileSync } = await import("node:fs");
  for (const file of process.argv.slice(2)) {
    const summary = summarizeProfile(JSON.parse(readFileSync(file, "utf8")));
    console.log(`\n${file} (busy ${summary.busyMs.toFixed(0)}ms)`);
    console.table(summary.packages);
    console.table(summary.functions);
  }
}
