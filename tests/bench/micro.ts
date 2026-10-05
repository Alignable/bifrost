// In-process microbenchmarks of Bifrost's pure server-side helpers on the benchmark fixtures.
import { Bench } from "tinybench";
import { extractDomElements } from "../../bifrost-fastify/lib/extractDomElements";
import { signInHtml } from "./fixtures/signIn";
import { businessProfileHtml } from "./fixtures/businessProfile";

const signIn = signInHtml();
const businessProfile = businessProfileHtml();

const bench = new Bench({ time: 2000, warmupTime: 500 });
bench
  .add(`extractDomElements sign-in (${(signIn.length / 1024).toFixed(1)}KB)`, () => {
    extractDomElements(signIn);
  })
  .add(`extractDomElements business profile (${(businessProfile.length / 1024).toFixed(1)}KB)`, () => {
    extractDomElements(businessProfile);
  });

await bench.run();
console.table(
  bench.tasks.map(({ name, result }) => ({
    task: name,
    "mean µs": +(result!.latency.mean * 1000).toFixed(1),
    "p99 µs": +(result!.latency.p99! * 1000).toFixed(1),
    "±%": +result!.latency.rme.toFixed(2),
    samples: result!.latency.samples.length,
  }))
);
