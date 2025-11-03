import { PageContextServer } from "vike/types";
import { useConfig } from "vike-react/useConfig";
import { jsdomToReactComponent } from "../../lib/htmlToReact";
import { getElementAttributes } from "../../lib/getElementAttributes";

export function wrappedOnBeforeRenderHtml(pageContext: PageContextServer) {
  if (pageContext.wrappedServerOnly) {
    const { head, body } = pageContext.wrappedServerOnly;
    const config = useConfig();

    config({
      // There is no way to set Head in vike-react with a plain string of html
      // So our pipeline is string -> jsdom -> React -> string
      // This is obviously bad, though head tag should generally be small.
      // TODO: instrument performance
      Head: jsdomToReactComponent(head),
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
