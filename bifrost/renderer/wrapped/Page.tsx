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
