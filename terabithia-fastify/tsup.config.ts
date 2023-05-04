import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    './index.ts',
  ],
  format: 'esm',
  clean: true,
  sourcemap: true,
  dts: true
})