import React from "react";
import { usePageContext } from "vike-react/usePageContext";
import "../config";
import "../../lib/type";

export default function Page() {
  const pageContext = usePageContext();

  const bodyHtml = pageContext.isClientSide
    ? pageContext._turbolinksProxy?.body?.innerHTML
    : pageContext._wrappedServerOnly?.bodyInnerHtml;

  // Set marker so we can render error if failed to render body due to error in surrounding Layout
  if (bodyHtml && !pageContext.isClientSide && pageContext._wrappedServerOnly) {
    pageContext._wrappedServerOnly.renderedBody = true;
  }

  if (bodyHtml) {
    return (
      <div
        id="proxied-body"
        dangerouslySetInnerHTML={{
          __html: bodyHtml,
        }}
      />
    );
  }
  return <></>;
}
