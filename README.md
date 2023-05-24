bifrost is the framework for incremental migration from Rails/Turbolinks to Vite-powered React SSR.

# How does it work?
1. vite-ssr-plugin tries to handle request
2. If it cannot, proxy to Rails
3. If Rails returns layout, wrap in layout
4. Else just return as-is

## Breaking changes moving from turbolinks to bifrost:
- turbolinks-permanent is gone
- request:start and request:end events removed
- Some discrepency in event data and exactly when they fire

# TODOs
- All high-volume ajax calls move to separate domain to minimize vite proxy load (/biz/presences)
- Proxy improvements:
  - x-xhr-redirect
- Turbolinks.visit
- Mobile App:
  - Provide an interface to [WebView.js](https://github.com/turbolinks/turbolinks-ios/blob/master/Turbolinks/WebView.js) so ios can hook in
  - No idea about Android.
- Move Rails => vite
  - All on-load hooks: Amp tracking, ABTasty, Appcues, etc.
  - Page load spinner
  - Inbox
  - All navbars
- Authentication
- proxy performance: jsdom likely can be replaced with something ~10x faster.

