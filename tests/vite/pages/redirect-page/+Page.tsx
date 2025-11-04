import React from "react";

export default function Page() {
  return (
    <div>
      <a href="/redirect-page/redirect-to">redirect to home</a>
      <a
        href={`/redirect-page/redirect-to?redirectTo=${encodeURIComponent(
          '/custom?page={"title":"b"}'
        )}`}
      >
        redirect to proxy page
      </a>
    </div>
  );
}
