# Bifrost benchmarks

Reproducible server benchmarks for Bifrost. Fixtures are synthetic but shaped like real Alignable pages, so wins here should carry over to production.

```sh
npm run bench            # HTTP load against the production build (~6 min with defaults)
npm run bench -- -c 10   # one connection level only: the fast loop for optimizing (~4 min)
npm run bench:micro      # in-process: extractDomElements
```

`npm run bench` rebuilds `bifrost`, `bifrost-fastify` and `tests/vite` first, so it always measures your working tree. Pass `--skip-build` if you've already built. Add `--help` to see all options.

## Workflow for optimizing

1. Get a baseline: `npm run bench -- -c 10 -o results/before.json`. Paths are relative to `tests/bench`.
2. Make your change.
3. Compare: `npm run bench -- -c 10 --compare results/before.json`. This adds `Δ` columns.
4. Find hot spots: `npm run bench -- -s wrapped -c 10 --profile`. This prints self time by package and by function, and writes `results/profiles/<scenario>.cpuprofile`. Re-summarize a saved profile with `npx tsx tests/bench/profile.ts <file>`.

Before measuring, every scenario checks that its response is correct: layout rendered, backend `<head>` and body attributes merged, passthru bytes identical to the backend's, and so on. A broken optimization fails loudly instead of looking fast. Don't edit fixtures or checks to improve numbers. If you change a fixture on purpose, confirm it still matches the targets below with `npm run -w=tests-bench fixtures`. Pass it saved HTML files of real pages to print their stats alongside the fixtures.

Don't run benchmarks while other CPU-heavy work is going on, and don't run two benchmarks in parallel.

## How it measures

The server under test is the production build of `tests/vite` (Fastify + `viteProxyPlugin`), started fresh for each scenario. `backend.ts` stands in for Rails. It's a bare `node:http` server that serves pre-rendered fixtures in microseconds. `--backend-latency <ms>` delays its page responses to simulate Rails render time.

Bifrost is one Node process. Its JavaScript runs on a single main thread, so one process can use at most about one core; V8's GC threads and libuv's threadpool use a little extra. The load generator (autocannon) and the backend run in separate processes on other cores. Nothing is pinned to cores, because macOS doesn't support pinning.

Each scenario warms up for 20s at the highest connection level. Wrapped SSR keeps getting cheaper for about 25s, likely while V8 optimizes the hot paths. It then measures each level in `--connections` (default `1,10,100`). A level is 2s of settling followed by 3 rounds of 5s, and medians are reported. Load is closed-loop: each connection sends its next request as soon as the previous response arrives.

### Reading the table

- **`cpu ms/req`** is the number to optimize. It's the Bifrost process's user+system CPU time divided by requests served, sampled over IPC (`bench-agent.mjs`). It counts all of the process's threads. Use the saturated level, `c=10`, where it repeats within ~3% between runs. `cpu spread` is (max − min) / median across rounds; above ~5%, re-run.
- **Throughput and latency come from different levels.**
  - `req/s` at a saturated level (`c=10` and up) is the capacity of one process.
  - `p50`/`p99` at `c=1` is Bifrost's latency with no queueing. At higher levels latency is mostly time spent waiting behind other requests: at saturation, p50 ≈ connections × cpu ms/req.
  - `p50 - backend` subtracts `--backend-latency` for scenarios that call the backend.
- **Low-load CPU numbers aren't meaningful.** With `--backend-latency`, `c=1` and `c=10` run at only ~4–40 req/s. Each request then runs on cold CPU caches, often on slower cores/clocks, and a round has too few samples. `cpu ms/req` comes out 2–5x higher with huge spread. Idle background CPU is negligible (~0.06ms/s), so that isn't the cause.

### Effect of Rails latency

Measured with `-s wrapped,wrapped-client-nav,passthru -l 250` against `-l 0`:

- **CPU per request doesn't change once there's enough load.** At `c=100` with 250ms latency: wrapped 3.59 vs 3.60 cpu ms/req, passthru 1.09 vs 1.15.
- **Capacity per process is the same, but needs more requests in flight.** By Little's law, in-flight requests = rate × latency. Wrapped at ~300 req/s with 250ms Rails latency means ~75 concurrent requests per process, each holding its buffered backend HTML. With 10 connections it only reaches ~34–38 req/s.
- **Bifrost adds a few ms to what users wait.** With no queueing, it adds ~4–10ms to wrapped pages and ~1–4ms to passthru and client navigation. That grows with queueing as load approaches capacity, exactly as it does without Rails latency.

## Scenarios

| scenario | request | Bifrost work |
| --- | --- | --- |
| `wrapped` | initial load of `/bench/sign-in` | Vike route, proxy to backend, buffer + parse HTML, `renderPage` with React SSR of the layout, serialize pageContext |
| `wrapped-client-nav` | `/bench/sign-in` with `X-VITE-PROXY: 1` (what the browser sends on client navigation) | Vike route, then stream the backend response |
| `passthru` | `/bench/business/...` | wrapped route, backend returns no layout header, so Bifrost falls back to streaming. This is how Alignable serves most Rails pages |
| `native` | `/bench/events` | Vike page with `+data`, React SSR, serialize pageContext |
| `native-client-nav` | `/bench/events/index.pageContext.json` | Vike `+data` + serialization |
| `backend-direct` | fixture backend, no Bifrost | reference floor |

### Fixtures vs. the Alignable pages they model

Production measurements were taken from the dev environment.

| | real page | fixture |
| --- | --- | --- |
| **Wrapped**: `/biz_users/sign_in` Rails body (`X-VITE-PROXY`) | 8.3KB, 63 elements, depth 15 | `fixtures/signIn.ts`: 7.5KB, 72 elements, depth 15 |
| Wrapped page as served by Bifrost | 80.7KB, 275 elements, depth 20, ~35KB pageContext | 84.6KB, 286 elements, depth 20, ~39KB pageContext |
| **Passthru**: `/acton-ma/kitchen-outfitters` | 79.8KB, 495 elements, depth 21, 59KB of attributes | `fixtures/businessProfile.ts`: 76KB, 492 elements, depth 22, 53KB of attributes |
| **Native**: `/networking-events/near-me` | 328KB, 625 elements, ~166KB pageContext | 341KB, 694 elements, ~160KB pageContext |

- The wrapped layout (`tests/vite/layouts/BenchVisitorLayout.tsx`) mirrors the CMS-driven visitor layout: desktop and mobile nav, dropdowns, inline SVG logos, footer, and long Tailwind class strings.
- `pages/bench/+onAfterRenderHtml.ts` puts the dehydrated query state into pageContext, as the app does.
- The wrapped route uses `injectScriptsAt: "HTML_BEGIN"`, like Alignable's.
- Fixtures come from a seeded PRNG (`fixtures/rand.ts`), so every run is byte-identical.

## Baseline and starting points

Measured on an Apple M1 Pro (2026-10-04), no backend latency:

| scenario | cpu ms/req (c=10) | req/s (c=10) | p50 ms (c=1) |
| --- | --- | --- | --- |
| wrapped | 3.30 | 331 | 4.2 |
| wrapped-client-nav | 1.04 | 1059 | 1.0 |
| passthru | 1.09 | 1019 | 1.1 |
| native | 5.41 | 201 | ~6 |
| native-client-nav | 2.30 | 457 | ~2 |

Native costs the most CPU because Bifrost renders the whole page in Node. For wrapped and passthru, Rails builds the page body, and that time isn't counted here. Native's CPU goes mostly to serialization: ~46% of its CPU turns ~200KB of pageContext into JSON (`@brillout/json-serializer` plus vike's replacer). The real page passes a ~166KB relay store, so this cost is representative.

Optimization opportunities, each measured by experiment (c=10, cpu ms/req):

1. **vike `catchInfiniteLoop`** (`vike/dist/utils/catchInfiniteLoop.js`) keeps a tracker per `renderPage` call for 5s and loops over all of them on every call. Cost grows with requests per second per process. Making it a no-op saved 24% on wrapped, 54% on wrapped-client-nav, 52% on passthru, 11% on native-client-nav and 3% on native. This regressed in vike#3029, the fix for vike#3028 (false infinite-loop errors above ~20 req/s): keying trackers per request made every call scan every live request. It's still unchanged in vike 0.4.267 and on `main` (2026-10-04). Fix upstream, e.g. delete the request's tracker when `renderPage` returns, or sweep on a timer; or patch it in the meantime.
2. **Routing-only `renderPage` in `preHandler`.** Proxied requests run a full `renderPage` just to read `proxyMode`; wrapped runs a second one to render. In-process it costs ~0.3ms CPU. That's ~60% of passthru and client-nav once (1) is fixed, and ~10% of wrapped. Replace it with routing alone (vike exports a semi-private `route()` from `vike/__internal`), or restructure so each request makes one `renderPage`. Unreleased vike (`pageContext.content`, vike#3551) lets a render hook return a raw body or stream, which would make the single-`renderPage` design possible for passthru too.
3. **pageContext serialization** (app-level, in `dehydrateStores`). vike's serializer costs ~640µs for the wrapped page's ~39KB state and ~1.7ms for native's ~160KB. Passing the state pre-stringified cuts that to 180µs / 744µs (~14% of wrapped, ~18% of native), at the cost of double-escaped HTML. Plain `JSON.stringify` in a separate `<script>` costs 68µs / 284µs.
4. **Smaller:** `extractDomElements` (htmlparser2) is ~3% of wrapped, React SSR of the layout ~8%, and react-streaming's `isDebugEnabled` ~1.4%. Fastify's `MaxListenersExceededWarning` on proxied responses is noise-level.

Upstream as of 2026-10-04:

- vike 0.4.267 benchmarks the same as the pinned 0.4.259 commit (all scenarios within ±5%) and passes the e2e suite. Its serializer change (`htmlScriptSafe`, json-serializer 0.5.27) is only 13–17% faster on our payloads.
- The next vike release requires Vite 7.1+ (vike#3565). Alignable is on Vite 8, but this repo's test app is on Vite 6.3.

Tested and not worth it: a fast-path `objectAssign` in vike. The profiler shows it at 8–22%, but replacing it saved only ~2%.

## Files

- `server.ts`: HTTP benchmark (autocannon) and scenario definitions with their correctness checks.
- `micro.ts`: tinybench microbenchmarks.
- `harness.ts`: build, start and stop of the backend and the Bifrost server.
- `bench-agent.mjs`: preloaded into the Bifrost server to report CPU usage and record CPU profiles over IPC.
- `profile.ts`: `.cpuprofile` summarizer.
- `backend.ts`: fixture backend. Run it standalone with `npx tsx tests/bench/backend.ts`; `BACKEND_LATENCY_MS` sets its delay.
- `fixtures/`: page generators and shape stats.
- `results/` (gitignored): JSON results and profiles.

The Vike side lives in `tests/vite/pages/bench/` and `tests/vite/layouts/BenchVisitorLayout.tsx`.
