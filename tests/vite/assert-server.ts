import type { Plugin } from "vite";
import path from "path";

const PLUGIN_NAME = "assert-server";

export default function assertServer(): Plugin {
  return {
    name: PLUGIN_NAME,
    enforce: "pre",
    resolveId(src, importer, options) {
      if (src.endsWith(".server") && !options?.ssr) {
        const fullPath = path.join(importer || "", src);
        this.error({
          plugin: PLUGIN_NAME,
          pluginCode: "SERVER_FILE_IN_CLIENT_BUNDLE",
          message: `${fullPath} included in client bundle. Imported by ${importer}`,
        });
      }
      if (src.endsWith(".client") && options?.ssr) {
        const fullPath = path.join(importer || "", src);
        this.error({
          plugin: PLUGIN_NAME,
          pluginCode: "CLIENT_FILE_IN_BUNDLE",
          message: `${fullPath} included in server bundle. Imported by ${importer}`,
        });
      }
    },
  };
}
