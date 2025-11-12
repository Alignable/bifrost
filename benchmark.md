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

Previously, jsdom got ~250 req/s.

```
Bombarding http://localhost:5050/custom?page=%7B%22title%22:%22b%22%7D for 10s using 125 connection(s)
Statistics        Avg      Stdev        Max
  Reqs/sec      1145.73     682.67    2501.49
  Latency      108.91ms    12.41ms   306.31ms
  HTTP codes:
    1xx - 0, 2xx - 11510, 3xx - 0, 4xx - 0, 5xx - 0
    others - 0
  Throughput:     4.61MB/s
```
