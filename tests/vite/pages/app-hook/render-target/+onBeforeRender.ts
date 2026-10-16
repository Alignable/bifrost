import { render } from "vike/abort";
import type { PageContextServer } from "vike/types";

export default function onBeforeRender(pageContext: PageContextServer) {
  throw render(pageContext.urlParsed.href as `/${string}`, {
    proxy: "wrapped",
  });
}
