import { Config } from "vite-plugin-ssr/types";
import { DocumentProps, Layout, LayoutMap } from "./types/internal";
import ProxyLibConfig from "./proxy/pages/+config";
import TerabithiaLibConfig from "./renderer/+config";
import { Turbolinks } from "./lib/turbolinks";
export { usePageContext } from "./renderer/usePageContext";

// ===========   Types   =========== //

export { LayoutMap, DocumentProps };

// Utility type to ensure exported type matches meta defined in library
type ConfigConstructor<
  LibConfig extends Config,
  T extends { [K in keyof LibConfig["meta"]]?: any }
> = Config & Partial<T>;

export type ProxyConfig<LayoutProps> = ConfigConstructor<
  typeof ProxyLibConfig,
  {
    layoutMap: LayoutMap<LayoutProps>;
  }
>;

export type TerabithiaConfig<LayoutProps> = ConfigConstructor<
  typeof TerabithiaLibConfig,
  {
    Layout: Layout<LayoutProps>;
    layoutProps: LayoutProps;
    documentProps: DocumentProps;
  }
>;

declare global {
  interface Window {
    Turbolinks: typeof Turbolinks;
  }
}
