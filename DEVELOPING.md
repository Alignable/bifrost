# Setup

```
npm install
```

## Build

`npm run build` in root directory builds `bifrost` and `bifrost-fastify` packages.

## Tests

`npm run test` in root directory runs test in `tests/e2e` pacakage.

The tests run against the Fastify server in `tests/vite/server/index.ts`. To run them against the Hono or srvx server instead, build `tests/vite`, start it on port 5555 (`PORT=5555 npm run -w=tests-vite start:hono`, or `start:srvx`), then run the tests: Playwright reuses it.

## Dev

Easiest way to continuously rebuild pacakges and run sample server is with [Overmind](https://github.com/DarthSim/overmind)

```
overmind start -f Procfile.dev
```

This starts the server on http://localhost:5050 and rebuilds bifrost on changes. Playwright will reuse the dev server for tests.

## Benchmarks

`npm run bench` (server under HTTP load) and `npm run bench:micro`. See [tests/bench/README.md](tests/bench/README.md) for the optimize/compare/profile workflow.
