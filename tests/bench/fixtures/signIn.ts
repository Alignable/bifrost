import { createRand } from "./rand";
import { escapeAttr, h, nest } from "./html";

// Modeled on the Rails response for Alignable's /biz_users/sign_in when requested with X-VITE-PROXY
// (layout omitted, Bifrost renders it). Target: ~8KB, ~65 elements, depth ~15, head ~3.9KB.

export const SIGN_IN_LAYOUT_HEADERS = {
  "x-react-layout": "visitor_layout",
  "x-react-current-nav": "",
  "x-react-tracking": "sessions%7Cnew%7C",
  "x-react-footer": "true",
};

const json = (value: unknown) => escapeAttr(JSON.stringify(value));

export function signInHtml(variant = 0): string {
  const r = createRand(1000 + variant);
  const pageDetails = json({
    pageName: "Login",
    intent: null,
    intent_source: "",
    cuid: r.hex(36),
    member: false,
  });
  const pageResource = json({
    uuid: r.uuid(),
    context: "website",
    source: "sessions",
    action: "new",
    params: "{}",
    mobile: false,
  });
  const cycDetails = json({
    controller: "sessions",
    action: "new",
    path: "/biz_users/sign_in",
    touchpoint_id: null,
    newman_tracking_id: null,
  });

  const head = `
<meta name="csrf-param" content="authenticity_token" />
<meta name="csrf-token" content="${r.token(86)}" />
<meta charset="utf-8">
<meta content="chrome=1" http-equiv="X-UA-Compatible">
<meta content="-0400" name="tz">
<meta data-details="${pageDetails}" name="page-details">
<meta data-details="${pageResource}" name="page-resource">
<link href="/assets/favicon-unread-${r.hex(8)}.png" rel="prefetch">
<link data-default="/assets/favicon-${r.hex(8)}.png" data-unread="/assets/favicon-unread-${r.hex(8)}.png" href="/assets/favicon-${r.hex(8)}.png" id="favicon" rel="icon">
<meta content="" name="amplitude">
<meta data-details="${json({ a: false, vl: false, sid: null })}" name="amplitude-details">
<meta data-details="${cycDetails}" name="cyc-details">
<meta data-credentials="null" data-url="https://realtime.example.test" data-ws-url="wss://realtime.example.test" name="realtime">
<meta content="width=device-width" name="viewport">
<link rel="preload" href="/assets/fonts/inter-regular-${r.hex(8)}.woff2" as="font" type="font/woff2" crossorigin="anonymous">
<link rel="preload" href="/assets/fonts/inter-semibold-${r.hex(8)}.woff2" as="font" type="font/woff2" crossorigin="anonymous">
<link rel="preload" href="/assets/fonts/inter-bold-${r.hex(8)}.woff2" as="font" type="font/woff2" crossorigin="anonymous">
<meta name="description" content="${r.sentence(30)}">
<meta property="og:title" content="Login">
<meta property="og:description" content="${r.sentence(24)}">
<meta property="og:image" content="https://images.example.test/og/${r.hex(32)}.png">
<meta data-details="${json({ features: Object.fromEntries(Array.from({ length: 10 }, () => [r.words(2).replace(/ /g, "_"), r.next() > 0.5])) })}" name="app-config">
<meta data-dsn="https://${r.hex(32)}@errors.example.test/${r.int(1e6, 9e6)}" data-env="production" name="sentry">
<meta content="width=device-width, user-scalable=no" name="viewport">
<title>Login</title>
<link rel="stylesheet" href="/assets/application_visitor-047e9240.css" media="all" data-turbolinks-track="reload" />
<link rel="stylesheet" href="/assets/tailwind-5edf9695.css" media="all" data-turbolinks-track="reload" />
<meta name="action-cable-url" content="/websocket" />
<script src="/assets/livereload-8529b14d.js" defer="defer"></script>
<script>
  window.runJsQueue = window.runJsQueue || [];
  window.runJS = function(callback) {
    window.runJsQueue.push(callback);
  };
</script>
<meta content="no-preview" name="turbolinks-cache-control">
`;

  const sitekey = r.token(40);
  const noscript = `<noscript>
  <div>
    <div style="width: 302px; height: 422px; position: relative;">
      <div style="width: 302px; height: 422px; position: absolute;">
        <iframe src="/captcha/fallback?k=${sitekey}" name="ReCAPTCHA" style="width: 302px; height: 422px; border-style: none; border: 0; overflow: hidden;"></iframe>
      </div>
    </div>
    <div style="width: 300px; height: 60px; border-style: none; bottom: 12px; left: 25px; margin: 0px; padding: 0px; right: 25px; background: #f9f9f9; border: 1px solid #c1c1c1; border-radius: 3px;">
      <textarea name="g-recaptcha-response" class="g-recaptcha-response" style="width: 250px; height: 40px; border: 1px solid #c1c1c1; margin: 10px 25px; padding: 0px; resize: none;"></textarea>
    </div>
  </div>
</noscript>`;

  const form = h(
    "form",
    {
      "data-controller": "form-sleep",
      "data-form-sleep-wait": "2.0",
      "data-action": "form-sleep#modalClick",
      novalidate: "novalidate",
      class: "simple_form biz_user",
      action: "/biz_users/email_submit",
      "accept-charset": "UTF-8",
      "data-remote": "true",
      method: "post",
    },
    h("input", { type: "hidden", name: "authenticity_token", value: r.token(86) }),
    nest(
      2,
      () => "module module--mobile-border login-form module__body",
      [
        h("input", {
          class: "string email required login-form__input",
          placeholder: "Enter email address",
          type: "email",
          value: "",
          name: "biz_user[email]",
          id: "biz_user_email",
        }),
        h(
          "div",
          { class: "login-form__recaptcha" },
          `<script src="/assets/captcha-api.js" async defer></script>`,
          h("div", { "data-sitekey": sitekey, class: "g-recaptcha" }),
          noscript
        ),
        h("input", {
          type: "submit",
          name: "commit",
          value: "Next",
          id: "submit",
          class: "btn-v2 btn-v2--full btn-v2--primary btn-v2--40",
          "data-disable-with": "Please wait...",
          "data-target": "form-sleep.submit",
          disabled: "disabled",
        }),
        h(
          "div",
          { class: "login-form__checkbox-container" },
          h("input", { value: "0", autocomplete: "off", type: "hidden", name: "biz_user[remember_me]" }),
          h(
            "label",
            { class: "checkbox" },
            h("input", {
              class: "boolean optional login-form__checkbox",
              type: "checkbox",
              value: "1",
              checked: "checked",
              name: "biz_user[remember_me]",
              id: "biz_user_remember_me",
            }),
            " Remember me"
          )
        ),
      ]
    )
  );

  const login = h(
    "div",
    { class: "login" },
    h(
      "div",
      { class: "login__content js-replaceable-login-content", id: "email_submit" },
      h("div", { class: "login__header" }, "Sign in to your account"),
      h("div", { class: "login__message-container" }),
      form,
      h(
        "div",
        { class: "login__footer" },
        "Not a member yet? ",
        h("a", { class: "login-form__link", href: "/biz_users/sign_up?content_code=Website_Login" }, "Sign up")
      )
    )
  );

  const body = `
<div class="js-flyout__clickoff overflow-x-hidden" id="main-website">
<div class="mt-20"></div>
<section id="page-website" style="border-top: none;">
<div class="website-alert-wrapper"><div id="alert_container"></div></div>
<link href="/assets/application_business-67d356ca.css" rel="prefetch" media="all" as="style" />
<link href="/assets/application_biz-de4c703b.js" rel="prefetch" as="script" />
${login}
<script>
  runJS(function () { runJS(function () {
    window.benchLoginLoaded = (window.benchLoginLoaded || 0) + 1;
  }); });
</script>
</section>
</div>
<script>
  runJS(function () { window.bifrost_wrapped = true });
</script>
<script src="/assets/application_visitor-4cd56d56.js" data-turbolinks-suppress-warning="true" type="module"></script>
<script>
  runJS(function () { if (window.Alignable && window.Alignable.initializeCms) {
    window.Alignable.initializeCms("");
  } });
</script>
<script>
  runJS(function () { runJS(function () {
    window.benchFlyoutInit = true;
  }); });
</script>
`;

  return `<!DOCTYPE html>
<html lang="en">
<head>${head}</head>
<body background="white" class="website_v3 biz-sessions biz-sessions-new web-app" id="tailwind-selector">${body}</body>
</html>
`;
}
