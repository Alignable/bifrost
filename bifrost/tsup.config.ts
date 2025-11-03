import { defineConfig } from "tsup";
import { resolve, parse, format } from "path";
import { readdir, rename } from "fs/promises";

async function* getFiles(dir: string): AsyncGenerator<string> {
  const dirents = await readdir(dir, { withFileTypes: true });
  for (const dirent of dirents) {
    const res = resolve(dir, dirent.name);
    if (dirent.isDirectory()) {
      yield* getFiles(res);
    } else {
      yield res;
    }
  }
}

export default defineConfig({
  entry: [
    "./index.ts",
    "./renderer/config.ts",
    "./renderer/Head.tsx",
    "./renderer/onBeforeRenderClient.ts",
    "./renderer/onAfterRenderClient.ts",
    "./renderer/onBeforeRenderHtml.ts",
    "./renderer/onBeforeRoute.ts",
    "./renderer/wrapped/Page.tsx",
  ],
  format: "esm",
  clean: true,
  sourcemap: true,
  dts: true,
  async onSuccess() {
    // Rename config.js to +config.js
    // the plus sign in +config.js is required by vite to understand the import as a "pointer": https://github.com/vikejs/vike/blob/e78cc65993c4aa9af3666ecde118cf28c135af5f/packages/vike/node/vite/shared/resolveVikeConfigInternal/transpileAndExecuteFile.ts#L238
    // However, config.d.ts must remain without plus sign or typescript can't find it, even with typesVersions in package.json
    await rename("./dist/renderer/config.js", "./dist/renderer/+config.js");
  },
});
