import { PageContextServer } from "vike/types";
import { useConfig } from "vike-react/useConfig";
import { getElementAttributes } from "../../lib/getElementAttributes";

export function wrappedOnBeforeRenderHtml(pageContext: PageContextServer) {
  if (pageContext.wrappedServerOnly) {
    const { head, body } = pageContext.wrappedServerOnly;
    const config = useConfig();

    config({
      bodyAttributes: getElementAttributes(pageContext.wrappedServerOnly.body),
    });

    pageContext._turbolinksProxy = {
      body,
    };
    // Move layout/layoutProps to top-level pageContext so Vike can pass them to client
    pageContext.layout = pageContext.wrappedServerOnly.layout;
    pageContext.layoutProps = pageContext.wrappedServerOnly.layoutProps;
  } else {
    // cancel rendering
  }
}
