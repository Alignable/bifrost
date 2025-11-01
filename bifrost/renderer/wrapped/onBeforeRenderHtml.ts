import { PageContextServer } from "vike/types";
import { jsdomToReactComponent } from "../../lib/htmlToReact";

export function wrappedOnBeforeRenderHtml(pageContext: PageContextServer) {
  if (pageContext.wrappedServerOnly) {
    const { head } = pageContext.wrappedServerOnly;
    pageContext.config.Head = pageContext.config.Head || [];
    pageContext.config.Head?.push(jsdomToReactComponent(head));
    pageContext.layout = pageContext.wrappedServerOnly.layout;
    pageContext.layoutProps = pageContext.wrappedServerOnly.layoutProps;
  }
}
