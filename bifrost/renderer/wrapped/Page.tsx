import React from "react";
import { usePageContext } from "vike-react/usePageContext";
import { type PageContext } from "vike/types";
import "../config"; // tsup can't find augmented PageContext without this import. https://github.com/egoist/tsup/issues/1239

export default function Page() {
  const pageContext = usePageContext();

  if (pageContext._turbolinksProxy) {
    const Layout = layoutFromPageContext(pageContext.layout, pageContext);
    const layoutProps = pageContext.layoutProps;
    return (
      <Layout {...layoutProps}>
        <div
          id="proxied-body"
          dangerouslySetInnerHTML={{
            __html: pageContext._turbolinksProxy.body.innerHTML,
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
    // TODO: Figure out handling. Previously would render passthru
    throw new Error("Layout not found in layoutMap");
  }
  return Layout;
}
