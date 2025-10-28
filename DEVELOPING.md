# Setup

```
npm install
```

## Build

`npm run build` in root directory builds `bifrost` and `bifrost-fastify` packages.

## Tests

`npm run test` in root directory runs test in `tests/e2e` pacakage.

## Dev

Easiest way to continuously rebuild pacakges and run sample server is with [Overmind](https://github.com/DarthSim/overmind)

```
overmind start -f Procfile.dev
```

This starts the server on http://localhost:5050 and rebuilds bifrost on changes. Playwright will reuse the dev server for tests.
