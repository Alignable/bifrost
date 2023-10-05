import React from "react";
import { DocumentProps } from "../../types/internal.js";

export function documentPropsToReact({
  title = "",
  description = "",
  viewport = {},
  metaTags = [],
  alternates = {},
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
      {metaTags.map(({ name, property, content }) => (
        <meta name={name} property={property} content={content} />
      ))}
      { alternates.canonical && <link rel="canonical" href={alternates.canonical} /> }
    </>
  );
}
