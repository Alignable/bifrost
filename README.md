bifrost is the framework for incremental migration from Rails/Turbolinks to Vite-powered React SSR.

# How does it work?

1. Vike tries to handle request
2. If it cannot, proxy to Rails
3. If Rails returns layout, wrap in layout
4. Else just return as-is

## Breaking changes moving from turbolinks to bifrost:

- turbolinks-permanent is gone
- request:start and request:end events removed
- Some discrepency in event data and exactly when they fire

## Getting Started

### Installation

Install and setup [Vike](https://vike.dev/) and [vike-react](https://vike.dev/vike-react)
Install a Fastify server
Install `@alignable/bifrost` and `@alignable/bifrost-fastify`

In fastify, register viteProxyPlugin
Create your default config `pages/+config.ts` with `extends [VikeReact, BifrostConfig]` and default `proxyMode: false`, which lets you build Vike-rendered pages.

### Proxy modes

The "wrapped" proxy mode is the main point of Bifrost. The backend proxies your request to Rails and wraps the result in a React layout component. It copies over any attributes on the `body` tag, and inserts tags inside `head`, including running any scripts.

When the user clicks a link, it will check your Vike routing rules. If the route has `proxyMode: wrapped`, it will make a request to Rails and do all of the above, this time on the client. If the link is to a Vike page with `proxyMode: false`, it will render that page instead.

The "passthru" proxy mode is an option of incremental migration. Passthru routes simply render whatever Rails returns. This lets you start building Vike/Bifrost pages without committing to the full wrapped experience.

### Setting up Wrapped Proxy

1. In Rails check for a `x-vite-proxy` (name configurable) header and skip rendering the layout, so Bifrost can render the layout, enabling seamless page transitions. Also return which layout the page needs + any layout config/props via another header.
2. In Bifrost, setup a page with `proxyMode: wrapped` and configure the following:
   1. `getLayout` is a function to pull layout name and properties from the headers returned by Rails.
   2. `layoutMap` maps layout names to layout components
   3. `proxyHeaders` adds the `x-vite-proxy` (or other named header) to signal Rails you're coming from Bifrost.
   4. `meta: { onBeforeRender: { env: { client: true, server: false } } }` is temporarily required.
3. Move your navbar/layouts to be render-able via Bifrost

## Building new Vike Pages

Follow the [vike-react docs](https://vike.dev/vike-react) to build new unproxied pages.

Behind the scenes, Bifrost will emit turbolinks events and handle navigating between new pages and wrapped pages without reloading.

### Differences between vike-react and bifrost

Currently there is only one:

- You MUST use `navigate()` exported from `@alignable/bifrost`, not from Vike
