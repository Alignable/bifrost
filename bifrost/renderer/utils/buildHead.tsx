import React from "react";
import { DocumentProps } from "../../types/internal";

export function documentPropsToReact({
  title = "",
  description = "",
  viewport = {},
}: DocumentProps): React.ReactElement {
  return (
    <>
      <title>{title}</title>
      <meta name="title" property="og:title" content={title} />
      <meta name="description" content={description} />
      <meta
        name="viewport"
        content={Object.entries(viewport)
          .map((e) => e.join("="))
          .join(", ")}
      />
    </>
  );
}
