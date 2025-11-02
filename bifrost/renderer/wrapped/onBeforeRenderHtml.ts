import { PageContextServer } from "vike/types";
import { useConfig } from "vike-react/useConfig";
import { jsdomToReactComponent } from "../../lib/htmlToReact";
import { getElementAttributes } from "../../lib/getElementAttributes";

export function wrappedOnBeforeRenderHtml(pageContext: PageContextServer) {
  if (pageContext.wrappedServerOnly) {
    const { head } = pageContext.wrappedServerOnly;
    const config = useConfig();

    config({
      Head: jsdomToReactComponent(head),
      bodyAttributes: getElementAttributes(pageContext.wrappedServerOnly.body),
    });

    pageContext.layout = pageContext.wrappedServerOnly.layout;
    pageContext.layoutProps = pageContext.wrappedServerOnly.layoutProps;
  }
}
