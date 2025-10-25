import react from "@vitejs/plugin-react";
import ssr from "vike/plugin";
import { UserConfig } from "vite";

const config: UserConfig = {
  plugins: [
    react(),
    ssr({
      baseAssets: "/bifrost-assets",
    }),
  ],
  build: {
    outDir: "./dist/vite",
  },
};

export default config;
