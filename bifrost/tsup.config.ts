import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["./index.ts", "./renderer/**/*.ts?(x)", "./proxy/**/*.ts?(x)"],
  format: "esm",
  clean: true,
  sourcemap: true,
  dts: true,
});
