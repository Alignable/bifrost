# Run

1. `npm run build` in root
2. `npm run build` in tests/vite
3. `overmind start -f Procfile.start`
4. Bench with [bombardier](https://github.com/codesenberg/bombardier)

# Results

## Baseline fake-backend

fake-backend is about the simplest node server possible.

```
Bombarding http://localhost:5050/custom-direct?page=%7B%22title%22:%22b%22%7D for 10s using 125 connection(s)
Statistics        Avg      Stdev        Max
  Reqs/sec     13350.83    1440.63   16009.51
  Latency        9.36ms     3.40ms   230.77ms
  HTTP codes:
    1xx - 0, 2xx - 133578, 3xx - 0, 4xx - 0, 5xx - 0
    others - 0
  Throughput:    22.13MB/s
```

## Passthru proxy

Passthru proxy adds overhead of

- Fastify proxying
- Vike routing
- a call to Vike renderPage(), rendering nothing (required to run router)

```
Bombarding http://localhost:5050/custom-incorrect?page=%7B%22title%22:%22b%22%7D for 10s using 125 connection(s)
Statistics        Avg      Stdev        Max
  Reqs/sec      2060.36     543.72    3319.26
  Latency       60.53ms    72.36ms      2.13s
  HTTP codes:
    1xx - 0, 2xx - 20694, 3xx - 0, 4xx - 0, 5xx - 0
    others - 0
  Throughput:     3.55MB/s
```

## Wrapped proxy

Wrapped proxy adds on top of passthru proxy:

- dom parsing
- vike renderPage
- rendering react

Flamegraph showed ~30% of time spent is on JSDOM. We can replace JSDOM with faster parser and do not need to construct a DOM.

```
Bombarding http://localhost:5050/custom?page=%7B%22title%22:%22b%22%7D for 10s using 125 connection(s)
Statistics        Avg      Stdev        Max
  Reqs/sec       264.68     101.11     456.45
  Latency      462.75ms      0.95s      8.42s
  HTTP codes:
    1xx - 0, 2xx - 2752, 3xx - 0, 4xx - 0, 5xx - 0
    others - 0
  Throughput:     1.06MB/s
```
