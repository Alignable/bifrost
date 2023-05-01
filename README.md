# How does it work?
1. Next.js tries to handle request
2. If it cannot, proxy to Rails
3. If Rails returns layout, wrap in layout
4. Else just return as-is


## Things turbolinks does that dont work for us
- loads inline body scripts before blocking head scripts on client navigation. normally no one cares, but we do because we move in and out of legacy pages so may load critical things in head on client navigation (application_biz.js)

## vite Turbolinks Bridge currently has no support for:
- turbolinks-permanent
- caching
- request:start and request:end events
- Some discrepency in event data and exactly when they fire

## inter page state / caching:
Use case: Open nested discussion comments, click on someone's profile, go back to that comment
Use case: scrolled far down a feed, click something, come back.

- for new pages, we can probably do something like this: https://gal.hagever.com/posts/react-forms-and-history-state
  - notice that we only have to save state now, not copy the whole dom, like turbolinks did.
  - Also if we do next.js appdir, this will be rare (state will only be for interactive client components - everything else is props)
  - Facebook actually does something weird where old pages don't dismount at all, they just are hidden.
- for legacy pages... we may have to reimplement it into the bridge


## Test cases. maybe should automate?
- load vite => legacy
  - problem with head scripts loading after inline scripts
- load vite => vite
  - turbolinks callbacks don't go anywhere... tracking needs to be extracted
- load legacy => legacy
  - turbolinks callbacks, abtasty
- load legacy => vite
- load legacy => vite => legacy
  - dont rerun legacy, ie rails ujs
- legacy => legacy (with more extra scripts in head) Does it block correctly?


## Sampled current turbolinks events

turbolinks:click
Object { url: "http://dev.alignable.com:3001/biz/my_posts?_nav=1" }
turbolinks:before-visit
Object { url: "http://dev.alignable.com:3001/biz/my_posts?_nav=1" }
turbolinks:request-start
Object { url: "http://dev.alignable.com:3001/biz/my_posts?_nav=1", xhr: XMLHttpRequest }
turbolinks:visit
Object { url: "http://dev.alignable.com:3001/biz/my_posts?_nav=1" }
turbolinks:request-end
Object { url: "http://dev.alignable.com:3001/biz/my_posts?_nav=1", xhr: XMLHttpRequest }
turbolinks:before-cache
Object {  }
turbolinks:before-render
Object { newBody: body#tailwind-selector.biz-my_posts.biz-my_posts-index.web-app.responsive-content.mobilize }
turbolinks:render
Object {  }
turbolinks:load
Object { url: "http://dev.alignable.com:3001/biz/my_posts?_nav=1", timing: {…} }


in our code we use:
click, before-visit, before-cache, before-render, render, load
we dont use: request-start, visit, request-end

if we drop inter page state we could entirely remove before-cache

# TODOs
- All high-volume ajax calls move to separate domain to minimize vite proxy load (/biz/presences)
- Proxy improvements:
  - Pass ip with x-forwarded-for for Rack::Attack
  - can we use node's http-proxy lib? Can we stream body to reduce memory usage?
  - turbolinks-track
  - x-xhr-redirect
- Mobile App:
  - Provide an interface to [WebView.js](https://github.com/turbolinks/turbolinks-ios/blob/master/Turbolinks/WebView.js) so ios can hook in
  - No idea about Android.
- Move Rails => vite
  - All on-load hooks: Amp tracking, ABTasty, Appcues, etc.
  - Page load spinner
  - Inbox
  - All navbars
- E2E tests for vite-tubolinks bridge. Could extract to a library. It's not actually necessarily turbolinks-specific either.
- vite (some of these being solved by React Component Lib effort):
  - Authentication
  - Images, icons. How do we share?
  - Tailwind deduping. We don't want 2 tailwind.css files both compiling `.flex`
  - I18n
  - OpenAPI

## minor issues:
next/head throwing a lot of warnings about scripts. Can we tell it "i know what im doing?"
We get warnings about hydration issue when we return invalid html from rails (illegal tag nesting). probably a good thing tbh.

