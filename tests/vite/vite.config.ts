import react from "@vitejs/plugin-react";
import ssr from "vite-plugin-ssr/plugin";
import { UserConfig } from "vite";
import terabithiaConfig from "terabithia/vite-plugin-ssr.config.js";

const config: UserConfig = {
  plugins: [react(), ssr(terabithiaConfig)],
};

export default config;
