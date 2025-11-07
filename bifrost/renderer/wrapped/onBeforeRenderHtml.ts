import { PageContextServer } from "vike/types";
import { useConfig } from "vike-react/useConfig";

export default function wrappedOnBeforeRenderHtml(
  pageContext: PageContextServer
) {
  if (pageContext._wrappedServerOnly) {
    const { bodyAttributes, layout, layoutProps } =
      pageContext._wrappedServerOnly;
    const config = useConfig();

    config({ bodyAttributes });

    // Move layout/layoutProps to top-level pageContext so Vike can pass them to client
    pageContext.layout = layout;
    pageContext.layoutProps = layoutProps;
  }
}
