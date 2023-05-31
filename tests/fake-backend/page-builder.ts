type Head = keyof typeof HEAD_SCRIPTS;
type Body = keyof typeof BODY_SCRIPTS;
type LinkOptions = {
  turbolinks?: boolean;
};
export type PageDataOk = {
  title: string;
  bodyAttrs?: string;
  layout?: string;
  content?: string;
  headScripts?: Head[];
  bodyScripts?: Body[];
  links?: (PageData & LinkOptions)[];
};
export type PageDataRedirect = {
  redirectTo: PageData;
  cookies?: Record<string, string>;
};
export type PageData = PageDataOk | PageDataRedirect;

export function followRedirects(data: PageData): PageDataOk {
  return "redirectTo" in data ? followRedirects(data.redirectTo) : data;
}

export function toPath(data: PageData) {
  return "/custom?page=" + encodeURI(JSON.stringify(data));
}
export enum Turbolinks {
  click = "turbolinks:click",
  beforeVisit = "turbolinks:before-visit",
  requestStart = "turbolinks:request-start",
  visit = "turbolinks:visit",
  requestEnd = "turbolinks:request-end",
  beforeCache = "turbolinks:before-cache",
  beforeRender = "turbolinks:before-render",
  render = "turbolinks:render",
  load = "turbolinks:load",
}

const HEAD_SCRIPTS = {
  defer: `<script defer src='head-script%3A-deferred.js'></script>`,
  blocking: `<script src='head-script%3A-blocking.js'></script>`,
  inline1: `<script>console.log('head script: inline 1')</script>`,
  inline2: `<script>console.log('head script: inline 2')</script>`,
  trackedA: `<script src='head-script%3A-trackedA.js' data-turbolinks-track="reload"></script>`,
  trackedB: `<script src='head-script%3A-trackedB.js' data-turbolinks-track="reload"></script>`,
};
const BODY_SCRIPTS = {
  blocking: `<script src='body-script%3A-blocking.js'></script>`,
  inline1: `<script>console.log('body script: inline 1')</script>`,
  inline2: `<script>console.log('body script: inline 2')</script>`,
};
const link = (href: string, text: string, { turbolinks = true } = {}) =>
  `<a href="${href}" ${
    turbolinks ? "" : 'data-turbolinks="false"'
  }>${text}</a>`;

const turbo =
  '<script src="https://cdnjs.cloudflare.com/ajax/libs/turbolinks/5.2.0/turbolinks.js" integrity="sha512-G3jAqT2eM4MMkLMyQR5YBhvN5/Da3IG6kqgYqU9zlIH4+2a+GuMdLb5Kpxy6ItMdCfgaKlo2XFhI0dHtMJjoRw==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>';

export function buildPage(data: PageData) {
  if ("redirectTo" in data) return;
  const {
    bodyAttrs = "",
    content = "",
    headScripts = [],
    bodyScripts = [],
    links = [],
    title = "",
  } = data;
  return `
<!DOCTYPE html>
<html>
  <head>
  <title>${title}</title>
  ${headScripts.map((h) => HEAD_SCRIPTS[h]).join("\n")}
  </head>
  <body ${bodyAttrs}>
  ${bodyScripts.map((h) => BODY_SCRIPTS[h]).join("\n")}
  ${content}
  <a href="/vite-page">vite page</a>
  ${links.map((l) => {
    return link(toPath(l), followRedirects(l).title, {
      turbolinks: l.turbolinks !== false,
    });
  })}
  </body>
</html>
  `;
}
