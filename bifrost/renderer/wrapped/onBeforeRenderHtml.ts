import { PageContextServer } from "vike/types";
import { useConfig } from "vike-react/useConfig";

export function wrappedOnBeforeRenderHtml(pageContext: PageContextServer) {
  if (pageContext.wrappedServerOnly) {
    const { bodyAttributes } = pageContext.wrappedServerOnly;
    const config = useConfig();

    config({ bodyAttributes });

    // Move layout/layoutProps to top-level pageContext so Vike can pass them to client
    pageContext.layout = pageContext.wrappedServerOnly.layout;
    pageContext.layoutProps = pageContext.wrappedServerOnly.layoutProps;
  }
}
