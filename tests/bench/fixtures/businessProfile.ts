import { createRand } from "./rand";
import { escapeAttr, h, nest } from "./html";

// Modeled on a Rails-rendered Alignable business profile (e.g. /acton-ma/kitchen-outfitters), which Bifrost
// proxies untouched. Target: ~80KB, ~495 elements, depth ~21, head ~9.6KB, attribute-heavy (inline SVG paths,
// long class lists, JSON data-* props).

export function businessProfileHtml(variant = 0): string {
  const r = createRand(2000 + variant);
  const name = r.title(2);
  const slug = name.toLowerCase().replace(/ /g, "-");
  const city = r.title(1);
  const json = (value: unknown) => escapeAttr(JSON.stringify(value));
  const icon = (pathLength: number, cls = "h-4 w-4") =>
    h(
      "svg",
      { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "currentColor", class: cls, role: "img" },
      h("path", { d: r.svgPath(pathLength) })
    );
  const trackProps = () => json({ ep: r.token(1000), v: 2 });

  const metas = [
    `<meta charset="utf-8">`,
    `<meta name="csrf-param" content="authenticity_token" />`,
    `<meta name="csrf-token" content="${r.token(86)}" />`,
    `<meta content="width=device-width, initial-scale=1" name="viewport">`,
    `<meta name="description" content="${r.sentence(28)}">`,
    `<meta name="keywords" content="${r.words(14).replace(/ /g, ", ")}">`,
    `<meta data-details="${json({ pageName: "Business Profile", cuid: r.hex(36), member: false, business_id: r.int(1e5, 9e6) })}" name="page-details">`,
    `<meta data-details="${json({ uuid: r.uuid(), context: "website", source: "businesses", action: "show", params: JSON.stringify({ id: slug, city }), mobile: false })}" name="page-resource">`,
    `<meta data-details="${json({ controller: "businesses", action: "show", path: `/${city}/${slug}` })}" name="cyc-details">`,
    `<meta data-details="${json({ a: false, vl: false, sid: null })}" name="amplitude-details">`,
    `<meta data-dsn="https://${r.hex(32)}@errors.example.test/${r.int(1e6, 9e6)}" data-env="production" name="sentry">`,
    `<meta content="no-preview" name="turbolinks-cache-control">`,
    `<meta name="robots" content="index, follow">`,
    `<meta name="theme-color" content="#5023B0">`,
  ];
  for (const prop of ["title", "description", "type", "url", "image", "image:width", "image:height", "site_name", "locale"]) {
    metas.push(`<meta property="og:${prop}" content="${prop.startsWith("image:") ? r.int(200, 1200) : r.sentence(prop === "description" ? 24 : 4)}">`);
  }
  for (const prop of ["card", "site", "title", "description", "image", "image:alt", "creator", "label1"]) {
    metas.push(`<meta name="twitter:${prop}" content="${r.sentence(prop === "description" ? 20 : 3)}">`);
  }

  const inlineScripts = [
    `window.runJsQueue = window.runJsQueue || []; window.runJS = function(cb) { window.runJsQueue.push(cb); };`,
    `window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', 'G-${r.token(10)}', { send_page_view: false });`,
    `runJS(function () { window.benchProfileId = ${r.int(1e5, 9e6)}; });`,
    `runJS(function () { window.benchFeatureFlags = ${JSON.stringify(Object.fromEntries(Array.from({ length: 12 }, () => [r.words(2).replace(/ /g, "_"), r.next() > 0.5])))}; });`,
    `(function(){ var t = document.documentElement; t.className = t.className.replace('no-js', 'js'); })();`,
    `runJS(function () { window.benchConsent = { analytics: true, ads: false }; });`,
  ];
  const jsonLd = JSON.stringify(
    {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name,
      description: r.sentence(40),
      address: { "@type": "PostalAddress", streetAddress: `${r.int(1, 999)} ${r.title(2)} St`, addressLocality: city, addressRegion: "MA", postalCode: String(r.int(10000, 99999)) },
      aggregateRating: { "@type": "AggregateRating", ratingValue: 5, reviewCount: r.int(10, 90) },
      review: Array.from({ length: 8 }, () => ({ "@type": "Review", author: r.title(2), reviewBody: r.sentence(26) })),
    },
    null,
    2
  );

  const head = [
    `<title>${name} - ${city}, MA - Business Network</title>`,
    ...metas,
    `<link rel="canonical" href="https://www.example.test/${city.toLowerCase()}/${slug}">`,
    `<link rel="preconnect" href="https://cdn.example.test" crossorigin>`,
    `<link rel="preconnect" href="https://images.example.test" crossorigin>`,
    `<link href="/assets/favicon-${r.hex(8)}.png" id="favicon" rel="icon">`,
    `<link rel="apple-touch-icon" href="/assets/apple-touch-icon-${r.hex(8)}.png">`,
    `<link rel="stylesheet" href="/assets/application_business-${r.hex(8)}.css" media="all" data-turbolinks-track="reload" />`,
    `<link rel="stylesheet" href="/assets/tailwind-${r.hex(8)}.css" media="all" data-turbolinks-track="reload" />`,
    `<link rel="stylesheet" href="/assets/profile-${r.hex(8)}.css" media="all" />`,
    `<link rel="prefetch" href="/assets/application_biz-${r.hex(8)}.js" as="script" />`,
    `<link rel="manifest" href="/manifest.json">`,
    `<script src="/assets/application_business-${r.hex(8)}.js" data-turbolinks-track="reload" defer></script>`,
    `<script async src="/assets/gtag.js"></script>`,
    ...inlineScripts.map((s) => `<script>${s}</script>`),
    `<script type="application/ld+json">${jsonLd}</script>`,
  ].join("\n");

  const logo = h(
    "svg",
    { xmlns: "http://www.w3.org/2000/svg", fill: "currentColor", viewBox: "0 0 212 47", role: "img", class: "shrink-0", style: "width:136px;height:32px" },
    h("path", { d: r.svgPath(2790) }),
    h("path", { d: r.svgPath(1300) })
  );

  const navLink = (label: string) =>
    h("li", { class: "navbar__item" }, h("a", { class: `navbar__link ${r.classes(6)}`, href: `/${label.toLowerCase().replace(/ /g, "-")}` }, h("span", {}, label)));
  const navbar = h(
    "header",
    { class: "navbar navbar--visitor", id: "navbar" },
    nest(
      3,
      () => r.classes(5),
      [
        h("a", { href: "/", class: "navbar__logo", "aria-label": "Home" }, logo),
        h("ul", { class: "navbar__list" }, ["Home", "Features", "About Us", "Testimonials", "Resources", "Events"].map(navLink)),
        h(
          "div",
          { class: "navbar__actions" },
          h("a", { href: "/biz_users/sign_in", class: `btn btn--secondary ${r.classes(14)}` }, "Log in"),
          h("a", { href: "/biz_users/sign_up", class: `btn btn--primary ${r.classes(18)}` }, "Join Now")
        ),
      ]
    )
  );

  const stars = () => h("div", { class: "stars flex flex-row" }, icon(1087, "h-4 w-4 text-yellow-400"));

  const header = h(
    "section",
    { class: "profile-header" },
    h("img", { class: "profile-header__cover", src: `https://images.example.test/cover/${r.hex(24)}.jpg`, alt: "", loading: "eager", width: 1200, height: 300 }),
    nest(
      4,
      () => r.classes(4),
      [
        h("img", { class: "profile-header__avatar rounded-full", src: `https://images.example.test/logo/${r.hex(24)}.png`, alt: name, width: 120, height: 120 }),
        h("h1", { class: "profile-header__name text-heading-1" }, name),
        h("div", { class: "profile-header__meta" }, h("span", {}, `${city}, MA`), h("span", {}, r.title(3)), stars(), h("span", {}, `${r.int(10, 90)} recommendations`)),
        h(
          "div",
          { class: "profile-header__actions flex gap-2" },
          ["Recommend", "Message", "Share"].map((label) =>
            h("a", { href: `#${label.toLowerCase()}`, class: `btn ${r.classes(12)}`, "data-cyc-props": trackProps() }, icon(label === "Share" ? 1364 : 600), h("span", {}, label))
          )
        ),
      ]
    )
  );

  const tabs = h(
    "nav",
    { class: "profile-tabs" },
    h("ul", { class: "flex list-none" }, ["About", "Reviews", "Services", "Photos", "Network"].map((t) => h("li", {}, h("a", { href: `#${t.toLowerCase()}`, class: r.classes(8) }, t))))
  );

  const about = h(
    "section",
    { class: "profile-section", id: "about" },
    nest(2, () => r.classes(3), [h("h2", { class: "text-heading-3" }, "About"), h("p", {}, r.sentence(120)), h("p", {}, r.sentence(90))])
  );

  const services = h(
    "section",
    { class: "profile-section", id: "services" },
    h("h2", { class: "text-heading-3" }, "Services"),
    h("ul", { class: "grid grid-cols-2" }, Array.from({ length: 12 }, () => h("li", { class: r.classes(3) }, h("span", {}, r.title(2)))))
  );

  const photo = () => {
    const id = r.hex(24);
    const srcset = [320, 640, 960, 1280, 1920].map((w) => `https://images.example.test/c_fill,w_${w},q_auto,f_auto/photos/${id}.jpg ${w}w`).join(", ");
    return h("a", { href: `#photo-${id}`, class: r.classes(6) }, h("img", { src: `https://images.example.test/photos/${id}.jpg`, srcset, sizes: "(max-width: 768px) 100vw, 33vw", alt: r.sentence(6), loading: "lazy", width: 320, height: 240 }));
  };
  const photos = h("section", { class: "profile-section", id: "photos" }, h("h2", { class: "text-heading-3" }, "Photos"), h("div", { class: "grid grid-cols-3 gap-2" }, Array.from({ length: 9 }, photo)));

  const reviewCard = () =>
    h(
      "div",
      { class: `review-card ${r.classes(5)}`, "data-cyc-props": trackProps() },
      nest(
        5,
        () => r.classes(4),
        [
          h(
            "div",
            { class: "review-card__author flex" },
            h("a", { href: `/biz/${r.hex(10)}` }, h("img", { src: `https://images.example.test/avatar/${r.hex(24)}.jpg`, alt: "", class: "rounded-full", width: 48, height: 48 })),
            h("div", {}, h("a", { href: `/biz/${r.hex(10)}`, class: r.classes(4) }, h("span", {}, r.title(2))), h("span", { class: "text-grey-600" }, r.title(3)))
          ),
          h("div", { class: "review-card__body" }, h("p", {}, r.sentence(90))),
          h(
            "div",
            { class: "review-card__footer flex justify-between" },
            h("span", {}, r.title(2)),
            h("a", { href: "#helpful", class: r.classes(6), "data-cyc-props": trackProps() }, h("span", {}, "Helpful"))
          ),
        ]
      )
    );
  const reviews = h(
    "section",
    { class: "profile-section", id: "reviews" },
    h("h2", { class: "text-heading-3" }, "Recommendations"),
    Array.from({ length: 8 }, reviewCard),
    h("a", { href: "#all-reviews", class: r.classes(8) }, "See all recommendations")
  );

  const similarCard = () =>
    h(
      "div",
      { class: `similar-card ${r.classes(4)}` },
      nest(
        3,
        () => r.classes(3),
        [
          h("a", { href: `/${city.toLowerCase()}/${r.hex(8)}` }, h("img", { src: `https://images.example.test/logo/${r.hex(24)}.png`, alt: "", width: 40, height: 40 })),
          h("div", {}, h("a", { href: `/${city.toLowerCase()}/${r.hex(8)}`, class: r.classes(3) }, h("span", {}, r.title(2))), h("span", {}, r.title(2))),
        ]
      )
    );
  const sidebar = h(
    "aside",
    { class: "profile-sidebar" },
    nest(2, () => r.classes(3), [h("h3", {}, "Similar businesses nearby"), Array.from({ length: 8 }, similarCard)]),
    h("div", { class: "profile-sidebar__cta" }, h("h3", {}, "Grow your network"), h("p", {}, r.sentence(18)), h("a", { href: "/biz_users/sign_up", class: `btn ${r.classes(16)}` }, "Join free"))
  );

  const footerColumn = () =>
    h("div", { class: "footer__column" }, h("h3", {}, r.title(1)), h("ul", {}, Array.from({ length: 3 }, () => h("li", {}, h("a", { href: `/${r.hex(6)}`, class: "no-underline" }, r.title(2))))));
  const footer = h(
    "footer",
    { class: "footer bg-grey-700 text-white-100" },
    nest(
      2,
      () => r.classes(4),
      [
        h("div", { class: "footer__brand" }, icon(1308, "h-8"), icon(1308, "h-11")),
        h("div", { class: "footer__columns grid" }, Array.from({ length: 4 }, footerColumn)),
        h("div", { class: "footer__social flex" }, icon(877, "h-5 w-5"), icon(500, "h-5 w-5")),
        h("p", { class: "footer__copyright" }, "© Copyright 2026"),
      ]
    )
  );

  const main = h(
    "div",
    { class: "page page--profile", id: "main-website" },
    nest(
      3,
      () => r.classes(3),
      [header, tabs, h("div", { class: "profile-layout grid" }, nest(4, () => r.classes(3), [about, services, photos, reviews]), sidebar)]
    )
  );

  const bodyScripts = [
    `runJS(function () { window.benchProfileLoaded = true; });`,
    `runJS(function () { window.benchTabs = document.querySelectorAll('.profile-tabs a').length; });`,
    `runJS(function () { window.benchReviews = document.querySelectorAll('.review-card').length; });`,
    `runJS(function () { window.benchSidebar = true; });`,
    `runJS(function () { window.benchFooter = true; });`,
    `runJS(function () { window.benchShare = { url: location.href, title: document.title }; });`,
    `runJS(function () { window.benchMessage = true; });`,
    `runJS(function () { window.benchRecommend = true; });`,
    `runJS(function () { window.benchNavbar = true; });`,
  ];

  return `<!DOCTYPE html>
<html lang="en">
<head>
${head}
</head>
<body class="website_v3 businesses businesses-show web-app" data-business-id="${r.int(1e5, 9e6)}">
${navbar}
${main}
${footer}
${bodyScripts.map((s) => `<script>${s}</script>`).join("\n")}
<script src="/assets/application_visitor-${r.hex(8)}.js" type="module"></script>
<script src="/assets/captcha-api.js" async defer></script>
</body>
</html>
`;
}
