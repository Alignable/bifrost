# Bifrost

Bifrost lets you migrate a Rails + Turbolinks app to [Vike](https://vike.dev) (React SSR) one route at a time.

It sits in front of Rails. New pages are rendered by Vike. Rails pages are either rendered inside your new React layout ("wrapped") or passed through untouched. Navigation between all of them stays client-side, like Turbolinks.

It has two packages:

- **`@alignable/bifrost`** is a Vike extension, built on [vike-react](https://vike.dev/vike-react). It renders wrapped pages and replaces Turbolinks on the client.
- **`@alignable/bifrost-fastify`** is a Fastify plugin. It renders pages with Vike and proxies everything else to Rails.

## How it works

Each route has a `proxyMode`:

| `proxyMode` | Server | Client navigation |
| --- | --- | --- |
| `false` | Vike renders the page. | Vike renders the page. |
| `"wrapped"` | Bifrost requests the page from Rails with your `proxyHeaders`. Rails responds without its layout, plus headers saying which layout to use. Bifrost renders your React layout around Rails' `<body>` and merges Rails' `<head>`. | Bifrost fetches the page from Rails and swaps it into the layout. |
| `"passthru"` | Rails' response is sent as-is. | Full page load. |

Requests that aren't HTML GET or HEAD requests, such as assets, forms and APIs, are proxied straight to Rails. If a wrapped page's response has no layout or isn't HTML (for example a redirect, JSON, or a page Rails rendered with its own layout), Bifrost sends Rails' response as-is.

## Setup

Requires Vike with vike-react (React 19) and Fastify 5.

```sh
npm install @alignable/bifrost @alignable/bifrost-fastify
```

### 1. Vike config

```ts
// pages/+config.ts
import vikeReact from "vike-react/config";
import bifrost from "@alignable/bifrost/config";
import type { Config } from "vike/types";

export default {
  extends: [vikeReact, bifrost],
  proxyMode: false, // Pages are rendered by Vike unless their route says otherwise
} satisfies Config;
```

### 2. Server

```ts
import fastify from "fastify";
import { viteProxyPlugin } from "@alignable/bifrost-fastify";

const app = fastify();
// Also serve Vike's client assets: its dev middleware in development, the built files in production
await app.register(viteProxyPlugin, {
  upstream: new URL("http://rails.internal:3000"),
  host: new URL("https://www.example.com"),
  async buildPageContextInit(req) {
    return { user: await getUser(req) };
  },
});
await app.listen({ port: 3000 });
```

`tests/vite/server/index.ts` is a complete example. The options are:

| Option | |
| --- | --- |
| `upstream` | Rails' URL. |
| `host` | The public URL. Used for `X-Forwarded-*` headers, and to rewrite redirects that point at Rails' host. |
| `buildPageContextInit(req)` | Adds to `pageContextInit`. It must not set fields that are in `passToClient`, or Vike re-fetches `pageContext` on client navigation. It runs again before a wrapped render. |
| `beforeWrappedRender(req, reply)` | Called when Rails returns a page to wrap, before rendering it. For example, copy a session cookie Rails just set into your request state. |
| `onError(error, pageContext)` | Called when rendering fails. |

Other [`@fastify/http-proxy`](https://github.com/fastify/fastify-http-proxy) options are passed through.

### 3. Rails

When a request has your proxy header (e.g. `X-VITE-PROXY: 1`), render the page without its layout. Then send headers that describe the layout, e.g. `X-React-Layout: main_nav`. Bifrost forwards everything else in the response, including redirects and cookies.

### 4. Wrapped routes

```ts
// pages/rails/+config.ts
import type { Config } from "vike/types";

export default {
  route: "/*", // Or a Route Function
  proxyMode: "wrapped",
  proxyHeaders: { "X-VITE-PROXY": "1" },
  // Response headers getLayout reads, removed before the response is sent
  layoutHeaders: ["x-react-layout"],
} satisfies Config;
```

```ts
// pages/rails/+getLayout.ts
import type { GetLayout } from "@alignable/bifrost/config";

const getLayout: GetLayout = (headers) =>
  // null sends Rails' response as-is
  headers["x-react-layout"] === "main_nav" ? { main_nav: {} } : null;

export default getLayout;
```

```tsx
// pages/rails/+Layout.tsx
import { usePageContext } from "vike-react/usePageContext";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { proxyLayoutInfo } = usePageContext();
  return proxyLayoutInfo?.main_nav ? <MainNav>{children}</MainNav> : <>{children}</>;
}
```

Declare your layouts' props on `Vike.ProxyLayoutInfo`:

```ts
declare global {
  namespace Vike {
    interface ProxyLayoutInfo {
      main_nav?: { currentNav?: string };
    }
  }
}
```

Bifrost waits for Rails inside `+onCreatePageContext`, so Vike's hook timeout applies: by default it warns after 4 s and fails the render after 30 s. If Rails can be slower, raise it in the wrapped route's config, alongside any other `hooksTimeout` settings there:

```ts
hooksTimeout: { onCreatePageContext: { warning: 10_000, error: 60_000 } },
```

### 5. Passthru routes

```ts
// pages/legacy/+config.ts
export default { route: "/legacy/*", proxyMode: "passthru" } satisfies Config;
```

### 6. Navigation

Links behave as they did with Turbolinks, and Turbolinks events still fire. For programmatic navigation, use `navigate()` from `@alignable/bifrost`, not Vike's.

## Your own `+onCreatePageContext`

Bifrost requests Rails from its own `+onCreatePageContext`, and Vike runs all `+onCreatePageContext` hooks at the same time. Your hook therefore can't see the wrapped page (`proxyLayoutInfo`, `_wrappedServerOnly`), or request state that `beforeWrappedRender` changes. To keep your hooks correct, Bifrost renders the wrapped page a second time if your app has other `+onCreatePageContext` hooks, and logs a warning the first time it does.

**For better performance, await `loadWrappedPage` in your hook.** Bifrost then renders the page once:

```ts
import { loadWrappedPage } from "@alignable/bifrost";
import type { PageContext } from "vike/types";

export async function onCreatePageContext(pageContext: PageContext) {
  if (!pageContext.isClientSide && pageContext.config.proxyMode === "wrapped") {
    // false means Rails' response will be sent as-is
    if (!(await loadWrappedPage(pageContext))) return;
  }
  // ...
}
```

Rails is still requested only once per page. In Bifrost's benchmark, the second render adds about 0.5 ms of CPU per wrapped page, roughly 20%.

## Differences from Turbolinks

- `data-turbolinks-permanent` isn't supported.
- `turbolinks:request-start` and `turbolinks:request-end` don't fire.
- Event data and timing differ slightly.

## Development

See [DEVELOPING.md](DEVELOPING.md).
