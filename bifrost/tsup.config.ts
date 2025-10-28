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
  entry: ["./index.ts", "./renderer/**/*.ts?(x)", "./proxy/**/*.ts?(x)"],
  format: "esm",
  clean: true,
  sourcemap: true,
  dts: true,
  async onSuccess() {
    for await (const f of getFiles("./dist")) {
      const parsed = parse(f);
      if (parsed.base.startsWith("_") && parsed.ext === ".ts") {
        const newname = format({
          ...parsed,
          base: parsed.base.replace("_", "+"),
        });
        await rename(f, newname);
      }
    }
  },
});
