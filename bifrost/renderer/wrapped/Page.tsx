import React from "react";
import { usePageContext } from "vike-react/usePageContext";
import "../config";
import "../../lib/type";

export default function Page() {
  const pageContext = usePageContext();

  let bodyHtml = pageContext.isClientSide
    ? pageContext._turbolinksProxy?.body?.innerHTML
    : pageContext._wrappedServerOnly?.bodyInnerHtml;

  // Set marker so we can render error if failed to render body due to error in surrounding Layout
  if (bodyHtml && !pageContext.isClientSide && pageContext._wrappedServerOnly) {
    const wso = pageContext._wrappedServerOnly;
    wso.renderedBody = true;

    // Strip placeholder divs whose NestedComponentPortal never rendered, back-to-front so
    // earlier offsets stay valid. Rendered placeholders are left for the client to portal into.
    const stripRanges = Object.values(wso.nestedComponents ?? {})
      .filter((c) => !c.rendered)
      .sort((a, b) => b.start - a.start);
    for (const { start, end } of stripRanges) {
      bodyHtml = bodyHtml!.slice(0, start) + bodyHtml!.slice(end);
    }
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
