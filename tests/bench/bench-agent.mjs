// Preloaded into the Bifrost server (node --import) so the harness can read CPU usage and capture CPU profiles over IPC.
import { Session } from "node:inspector/promises";
import { writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";

let session;

process.on("message", async (msg) => {
  if (!msg?.benchId) return;
  const reply = (data = {}) => process.send({ benchId: msg.benchId, ...data });
  switch (msg.type) {
    case "stats":
      return reply({
        cpu: process.cpuUsage(),
        memory: process.memoryUsage(),
        elu: performance.eventLoopUtilization(),
      });
    case "profile:start":
      session = new Session();
      session.connect();
      await session.post("Profiler.enable");
      await session.post("Profiler.setSamplingInterval", { interval: 100 });
      await session.post("Profiler.start");
      return reply();
    case "profile:stop": {
      const { profile } = await session.post("Profiler.stop");
      await writeFile(msg.path, JSON.stringify(profile));
      session.disconnect();
      return reply();
    }
  }
});
