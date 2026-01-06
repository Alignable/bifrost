import React from "react";
import { type PageDataOk } from "../../../fake-backend/page-builder";
import { usePageContext } from "vike-react/usePageContext";

export default function Page() {
  const { urlParsed } = usePageContext();
  return (
    <>
      <h1>vite is here</h1>
      {(JSON.parse(urlParsed.search["page"]) as PageDataOk)?.links?.map(
        (link) =>
          "title" in link && (
            <a
              href={`/${link.endpoint || "custom"}?page=${encodeURI(
                JSON.stringify(link)
              )}`}
              key={link.title}
            >
              {link.title}
            </a>
          )
      )}
    </>
  );
}
