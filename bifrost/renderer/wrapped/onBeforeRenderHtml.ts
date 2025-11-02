import { PageContextServer } from "vike/types";
import { jsdomToReactComponent } from "../../lib/htmlToReact";
import { getElementAttributes } from "../../lib/getElementAttributes";

export function wrappedOnBeforeRenderHtml(pageContext: PageContextServer) {
  if (pageContext.wrappedServerOnly) {
    const { head } = pageContext.wrappedServerOnly;
    pageContext.config.Head = pageContext.config.Head || [];
    pageContext.config.Head?.push(jsdomToReactComponent(head));

    pageContext.config.bodyAttributes = [
      getElementAttributes(pageContext.wrappedServerOnly.body),
    ];
    pageContext.layout = pageContext.wrappedServerOnly.layout;
    pageContext.layoutProps = pageContext.wrappedServerOnly.layoutProps;
  }
}
