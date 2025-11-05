import { PageContextClient } from "vike/types";
import { Turbolinks } from "../lib/turbolinks/index.js";
import { bifrostOnBeforeRenderClient } from "./bifrost/onBeforeRenderClient";
import { wrappedOnBeforeRenderClient } from "./wrapped/onBeforeRenderClient.js";

Turbolinks.start();

export default async function onBeforeRenderClient(
  pageContext: PageContextClient
) {
  if (pageContext.config.proxyMode === "wrapped") {
    return await wrappedOnBeforeRenderClient(pageContext);
  } else if (pageContext.config.proxyMode === false) {
    return await bifrostOnBeforeRenderClient(pageContext);
  }
}
