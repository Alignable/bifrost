import { resolve, parse, format } from "path";
import { readdir, rename } from "fs/promises";

// ideally this would go in tsup.config.ts, but not possible yet: https://github.com/egoist/tsup/issues/700

async function* getFiles(dir) {
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

(async function moveFiles() {
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
})();
