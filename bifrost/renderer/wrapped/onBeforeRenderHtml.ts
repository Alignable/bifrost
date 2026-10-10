import { PageContextServer } from "vike/types";
import { useConfig } from "vike-react/useConfig";

export default function wrappedOnBeforeRenderHtml(
  pageContext: PageContextServer
) {
  if (pageContext._wrappedServerOnly) {
    const { bodyAttributes, proxyLayoutInfo, nestedComponents } =
      pageContext._wrappedServerOnly;
    const config = useConfig();

    config({ bodyAttributes });

    // Move layout/layoutProps to top-level pageContext so Vike can pass them to client
    pageContext.proxyLayoutInfo = proxyLayoutInfo;
    // Expose requested component names as a boolean map (passToClient-safe)
    pageContext.proxyNestedComponents = Object.fromEntries(
      Object.keys(nestedComponents ?? {}).map((name) => [name, true])
    );
  }
}
