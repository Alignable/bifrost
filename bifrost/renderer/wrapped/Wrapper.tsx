import React from "react";
import { usePageContext } from "vike-react/usePageContext";
import { type PageContext } from "vike/types";

export function WrappedWrapper({ children }: { children: React.ReactNode }) {
  const pageContext = usePageContext();

  if (pageContext.isClientSide) {
    return (
      <Content
        Layout={layoutFromPageContext(pageContext.layout, pageContext)}
        layoutProps={pageContext.layoutProps}
        body={pageContext._wrappedBodyHtml!}
      />
    );
  } else {
    if (pageContext.wrappedServerOnly) {
      const { body } = pageContext.wrappedServerOnly;

      return (
        <>
          <Content
            Layout={layoutFromPageContext(pageContext.layout, pageContext)}
            layoutProps={pageContext.layoutProps}
            body={body.innerHTML}
          />
        </>
      );
    } else {
      // wrappedServerOnly is empty on initial render, which we do just to run routing.
      // no-op render
      // TODO: check performance of throw render vs finishing render vs moving to `+guard`
      // throw render(404, "__bifrost_wrapped_noop");
      return <></>;
    }
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

function Content({
  Layout,
  layoutProps,
  body,
}: {
  Layout: React.ComponentType<any>;
  layoutProps: any;
  body: string;
}) {
  // There is no way to set Head in vike-react with a plain string of html
  // We need innerhtml support, or we can parse the dom and create react components
  // I assume the latter is inefficient but it's the only option as of now.
  // Silver lining is theoretically head should not be a huge amount of content
  // Also client side needs to use mergeHead
  return (
    <Layout {...layoutProps}>
      <div id="proxied-body" dangerouslySetInnerHTML={{ __html: body }} />
    </Layout>
  );
}
