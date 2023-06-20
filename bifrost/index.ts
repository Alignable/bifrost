import { PageContextBuiltIn } from "vite-plugin-ssr/types";
import { PageContextProxy } from "./types/internal";

export type {
  DocumentProps,
  LayoutMap,
  NoProxyConfig as BifrostConfig,
} from "./types/internal";
export { usePageContext } from "./renderer/usePageContext.js";

export type OnBeforeRender = (pageContext: PageContextBuiltIn) => {
  pageContext: Partial<PageContextProxy>;
};
