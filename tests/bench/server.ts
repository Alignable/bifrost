// HTTP benchmark of the Bifrost server against a fixture backend. See README.md.
import autocannon from "autocannon";
import type { ChildProcess } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { cpus } from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
import {
  BACKEND,
  BIFROST,
  RESULTS_DIR,
  build,
  formatDelta,
  gitInfo,
  median,
  request,
  startBackend,
  startBifrost,
  stop,
} from "./harness";
import { summarizeProfile } from "./profile";

// No accept-encoding: tests-vite registers @fastify/compress, but Alignable compresses at the edge.
const BROWSER_HEADERS = {
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "accept-language": "en-US,en;q=0.9",
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
  cookie: "_bench_session=0123456789abcdef; remember_biz_user_token=abcdef",
};

type Scenario = {
  name: string;
  description: string;
  path: string;
  headers?: Record<string, string>;
  /** Benchmark the fixture backend directly, as a floor for the proxied scenarios. */
  direct?: boolean;
  /** Requests reach the backend, so --backend-latency applies. */
  callsBackend?: boolean;
  validate(res: Response, body: string): Promise<void> | void;
};

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function backendBody(scenario: Scenario) {
  const res = await fetch(BACKEND + scenario.path, { headers: { ...BROWSER_HEADERS, ...scenario.headers } });
  return res.text();
}

const SCENARIOS: Scenario[] = [
  {
    name: "wrapped",
    callsBackend: true,
    description: "Initial load of a wrapped page (sign-in): proxy, parse backend HTML, React SSR of layout, ~39KB pageContext",
    path: "/bench/sign-in",
    validate(res, body) {
      check(res.headers.get("x-test-proxymode") === '"wrapped"', "expected wrapped proxy mode");
      check(!res.headers.has("x-react-layout"), "layout headers must be stripped");
      const headEnd = body.indexOf("</head>");
      check(body.indexOf('name="page-details"') < headEnd, "backend <head> content missing from <head>");
      check(/<body[^>]*class="website_v3 biz-sessions/.test(body), "backend body attributes not copied");
      check(body.includes('<div id="proxied-body">') && body.includes("login__content"), "proxied body missing");
      check(body.includes("Join Millions of Members"), "layout footer missing");
      check(body.includes('"benchSsrState"'), "pageContext not serialized");
    },
  },
  {
    name: "wrapped-client-nav",
    callsBackend: true,
    description: "Client navigation to a wrapped page: route, then stream the backend response through",
    path: "/bench/sign-in",
    headers: { accept: "text/html", "x-vite-proxy": "1" },
    async validate(res, body) {
      check(res.headers.get("x-react-layout") === "visitor_layout", "layout header should reach the client");
      check(body === (await backendBody(this)), "body differs from backend");
    },
  },
  {
    name: "passthru",
    callsBackend: true,
    description: "Page without layout header (business profile, ~78KB): wrapped route falls back to passthru",
    path: "/bench/business/kitchen-supply",
    async validate(res, body) {
      check(res.headers.get("x-test-proxymode") === '"passthru"', "expected passthru proxy mode");
      check(body === (await backendBody(this)), "body differs from backend");
    },
  },
  {
    name: "native",
    description: "Vike page (events listing): React SSR of ~700 elements, ~160KB pageContext",
    path: "/bench/events",
    validate(res, body) {
      check(res.headers.get("x-test-pageid") === "/pages/bench/native", "expected native page");
      check(body.split('data-testid="event-card"').length - 1 === 18, "expected 18 event cards");
      check(body.includes("Join Millions of Members"), "layout footer missing");
      check(body.includes('"benchSsrState"') && body.includes('"attendees"'), "pageContext not serialized");
    },
  },
  {
    name: "native-client-nav",
    description: "Client navigation to a Vike page: index.pageContext.json with ~160KB of data",
    path: "/bench/events/index.pageContext.json",
    headers: { accept: "*/*" },
    validate(res, body) {
      check(res.headers.get("content-type")?.includes("json"), "expected JSON");
      check(body.includes('"attendees"'), "data missing");
    },
  },
  {
    name: "backend-direct",
    callsBackend: true,
    description: "Reference: business profile straight from the fixture backend, no Bifrost",
    path: "/bench/business/kitchen-supply",
    direct: true,
    validate(_res, body) {
      check(body.length > 70_000, "unexpected backend body");
    },
  },
];

const { values: args } = parseArgs({
  options: {
    scenario: { type: "string", short: "s", multiple: true },
    connections: { type: "string", short: "c", default: "1,10,100" },
    "backend-latency": { type: "string", short: "l", default: "0" },
    duration: { type: "string", short: "d", default: "5" },
    rounds: { type: "string", short: "r", default: "3" },
    warmup: { type: "string", short: "w", default: "20" },
    out: { type: "string", short: "o" },
    compare: { type: "string" },
    profile: { type: "boolean", default: false },
    "skip-build": { type: "boolean", default: false },
    verbose: { type: "boolean", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
});

if (args.help) {
  console.log(`Usage: npm run bench -- [options]

  -s, --scenario <name>         Run only these scenarios (repeatable): ${SCENARIOS.map((s) => s.name).join(", ")}
  -c, --connections <list>      Concurrent connection levels to measure (default 1,10,100)
  -l, --backend-latency <ms>    Delay backend page responses to simulate Rails render time (default 0)
  -d, --duration <sec>          Seconds per measured round (default 5)
  -r, --rounds <n>              Measured rounds per level; medians are reported (default 3)
  -w, --warmup <sec>            Warmup before measuring; wrapped SSR needs ~25s to reach steady state (default 20)
  -o, --out <file>              Write JSON results (default results/latest.json)
      --compare <file>          Show deltas against a previous JSON result
      --profile                 CPU-profile one round at the highest connection level and print hot functions
      --skip-build              Don't rebuild bifrost, bifrost-fastify and tests/vite first
      --verbose                 Show server logs`);
  process.exit(0);
}

const selected = args.scenario?.length
  ? args.scenario.flatMap((s) => s.split(",")).map((name) => {
      const scenario = SCENARIOS.find((s) => s.name === name);
      if (!scenario) throw new Error(`Unknown scenario ${name}`);
      return scenario;
    })
  : SCENARIOS;
const connectionLevels = args.connections.split(",").map(Number);
const backendLatency = Number(args["backend-latency"]);
const duration = Number(args.duration);
const rounds = Number(args.rounds);
const warmup = Number(args.warmup);
/** Lets the server adjust to a new connection level before measuring. */
const SETTLE_SECONDS = 2;

type Stats = {
  cpu: NodeJS.CpuUsage;
  memory: NodeJS.MemoryUsage;
  elu: { idle: number; active: number };
};

/** Closed-loop load: each connection sends its next request as soon as the previous response arrives. */
async function load(scenario: Scenario, seconds: number, connections: number) {
  const latencies: number[] = [];
  const result = await new Promise<autocannon.Result>((resolve, reject) => {
    const instance = autocannon(
      {
        url: (scenario.direct ? BACKEND : BIFROST) + scenario.path,
        headers: { ...BROWSER_HEADERS, ...scenario.headers },
        duration: seconds,
        connections,
      },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    // autocannon's own histogram has 1ms resolution; response events carry fractional milliseconds.
    instance.on("response", (_client, _status, _bytes, responseTime) => latencies.push(responseTime));
  });
  latencies.sort((a, b) => a - b);
  const at = (p: number) => latencies[Math.min(latencies.length - 1, Math.floor(p * latencies.length))] ?? 0;
  return {
    total: result.requests.total,
    rps: result.requests.average,
    p50: at(0.5),
    p99: at(0.99),
    errors: result.errors + result.timeouts + result.non2xx,
  };
}

const spread = (xs: number[]) => (xs.length > 1 ? (Math.max(...xs) - Math.min(...xs)) / median(xs) : 0);

async function measureLevel(scenario: Scenario, server: ChildProcess | null, connections: number, profile: boolean) {
  await load(scenario, SETTLE_SECONDS, connections);
  const rounds_: { rps: number; p50: number; p99: number; cpuMsPerReq: number | null; errors: number }[] = [];
  let profileSummary: ReturnType<typeof summarizeProfile> | undefined;
  for (let i = 0; i < (profile ? 1 : rounds); i++) {
    if (profile && server) await request(server, { type: "profile:start" });
    const before = server && (await request<Stats>(server, { type: "stats" }));
    const result = await load(scenario, duration, connections);
    const after = server && (await request<Stats>(server, { type: "stats" }));
    if (profile && server) {
      const file = path.join(RESULTS_DIR, "profiles", `${scenario.name}.cpuprofile`);
      mkdirSync(path.dirname(file), { recursive: true });
      await request(server, { type: "profile:stop", path: file });
      profileSummary = summarizeProfile(JSON.parse(readFileSync(file, "utf8")));
      console.log(`\n${scenario.name}: CPU profile at ${connections} connections written to ${path.relative(process.cwd(), file)}`);
      console.table(profileSummary.packages);
      console.table(profileSummary.functions);
    }
    const cpuMs = before && after ? (after.cpu.user - before.cpu.user + after.cpu.system - before.cpu.system) / 1000 : null;
    rounds_.push({ ...result, cpuMsPerReq: cpuMs === null ? null : cpuMs / result.total });
  }
  const cpu = rounds_.map((r) => r.cpuMsPerReq).filter((x): x is number => x !== null);
  return {
    connections,
    cpuMsPerReq: cpu.length ? median(cpu) : null,
    cpuSpread: cpu.length ? spread(cpu) : null,
    rps: median(rounds_.map((r) => r.rps)),
    p50Ms: median(rounds_.map((r) => r.p50)),
    p99Ms: median(rounds_.map((r) => r.p99)),
    errors: rounds_.reduce((sum, r) => sum + r.errors, 0),
    profile: profileSummary,
    rounds: rounds_,
  };
}

async function runScenario(scenario: Scenario) {
  const server = scenario.direct ? null : await startBifrost(args.verbose);
  try {
    const res = await fetch((scenario.direct ? BACKEND : BIFROST) + scenario.path, {
      headers: { ...BROWSER_HEADERS, ...scenario.headers },
    });
    const body = await res.text();
    check(res.status === 200, `${scenario.name}: expected 200, got ${res.status}`);
    try {
      await scenario.validate(res, body);
    } catch (e) {
      throw new Error(`${scenario.name}: response validation failed: ${(e as Error).message}`);
    }

    const maxConnections = Math.max(...connectionLevels);
    await load(scenario, warmup, maxConnections);
    const levels = [];
    for (const connections of connectionLevels) {
      levels.push(await measureLevel(scenario, server, connections, args.profile && connections === maxConnections));
    }
    const memory = server && (await request<Stats>(server, { type: "stats" })).memory;
    return {
      description: scenario.description,
      responseBytes: Buffer.byteLength(body),
      rssMB: memory ? memory.rss / 2 ** 20 : null,
      levels,
    };
  } finally {
    if (server) await stop(server);
  }
}

type ScenarioResult = Awaited<ReturnType<typeof runScenario>>;

function report(scenarios: Record<string, ScenarioResult>, baseline?: Record<string, ScenarioResult>) {
  const rows: Record<string, Record<string, string | number>> = {};
  for (const [name, r] of Object.entries(scenarios)) {
    const backendMs = SCENARIOS.find((s) => s.name === name)!.callsBackend ? backendLatency : 0;
    for (const level of r.levels) {
      const row: Record<string, string | number> = {
        "cpu ms/req": level.cpuMsPerReq === null ? "-" : level.cpuMsPerReq.toFixed(3),
        "cpu spread": level.cpuSpread === null ? "-" : `${(level.cpuSpread * 100).toFixed(1)}%`,
        "req/s": Math.round(level.rps),
        "p50 ms": +level.p50Ms.toFixed(2),
        "p99 ms": +level.p99Ms.toFixed(2),
        "p50 - backend": +(level.p50Ms - backendMs).toFixed(2),
        errors: level.errors,
      };
      const base = baseline?.[name]?.levels.find((l) => l.connections === level.connections);
      if (base) {
        if (level.cpuMsPerReq !== null && base.cpuMsPerReq !== null) row["Δ cpu/req"] = formatDelta(level.cpuMsPerReq, base.cpuMsPerReq);
        row["Δ req/s"] = formatDelta(level.rps, base.rps);
        row["Δ p50"] = formatDelta(level.p50Ms, base.p50Ms);
      }
      rows[`${name} c=${level.connections}`] = row;
    }
  }
  console.table(rows);
}

async function main() {
  if (!args["skip-build"]) build(args.verbose);
  const baseline = args.compare ? JSON.parse(readFileSync(args.compare, "utf8")).scenarios : undefined;
  const backend = await startBackend(backendLatency);
  const scenarios: Record<string, ScenarioResult> = {};
  try {
    for (const scenario of selected) {
      process.stdout.write(`Running ${scenario.name}... `);
      scenarios[scenario.name] = await runScenario(scenario);
      console.log("done");
    }
  } finally {
    await stop(backend);
  }

  console.log(
    `\nconnections=${connectionLevels.join(",")} backend latency=${backendLatency}ms duration=${duration}s rounds=${args.profile ? 1 : rounds} warmup=${warmup}s` +
      (args.profile ? "\nProfiling was on: numbers at the profiled level are inflated by the profiler." : "")
  );
  report(scenarios, baseline);

  const out = args.out ?? path.join(RESULTS_DIR, "latest.json");
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(
    out,
    JSON.stringify(
      {
        meta: {
          date: new Date().toISOString(),
          ...gitInfo(),
          node: process.version,
          cpu: cpus()[0]?.model,
          options: { connections: connectionLevels, backendLatency, duration, rounds, warmup, profile: args.profile },
        },
        scenarios,
      },
      null,
      2
    )
  );
  console.log(`Results written to ${path.relative(process.cwd(), out)}`);
}

await main();
