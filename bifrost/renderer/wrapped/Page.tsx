import React from "react";
import { usePageContext } from "vike-react/usePageContext";
import { type PageContext } from "vike/types";
import "../config";
import "../../lib/type";

export default function Page() {
  const pageContext = usePageContext();

  const bodyHtml = pageContext.isClientSide
    ? pageContext._turbolinksProxy?.body?.innerHTML
    : pageContext._wrappedServerOnly?.bodyInnerHtml;

  if (bodyHtml) {
    const Layout = layoutFromPageContext(pageContext.layout, pageContext);
    const layoutProps = pageContext.layoutProps;
    return (
      <Layout {...layoutProps}>
        <div
          id="proxied-body"
          dangerouslySetInnerHTML={{
            __html: bodyHtml,
          }}
        />
      </Layout>
    );
  }
  return <></>;
}

function layoutFromPageContext(layout: string, pageContext: PageContext) {
  const { layoutMap } = pageContext.config;
  if (!layoutMap) {
    throw new Error("layoutMap needs to be defined in config");
  }
  const Layout = layoutMap[layout];
  if (!Layout) {
    // Fastify server should exit before we ever get to this point
    throw new Error("Layout not found in layoutMap");
  }
  return Layout;
}
