import { createRand } from "./rand";

// Modeled on the CMS-driven visitor layout (nav + footer) Alignable renders around wrapped pages, plus the
// dehydrated query state it passes to the client (~35KB of JSON in production).

export type CmsLink = {
  _uid: string;
  component: "nav_menu_link";
  label: string;
  link: { cached_url: string; fieldtype: "multilink"; id: string; linktype: "url"; url: string };
  tracking_event_category: string;
  tracking_event_label: string;
  wysiwyg: Record<string, unknown>[];
  children: CmsLink[];
};

export type LayoutCms = ReturnType<typeof buildLayoutCms>;

const STYLE_KEYS =
  "max_width background_image padding_top padding_top_unit padding_right padding_right_unit padding_bottom padding_bottom_unit padding_left padding_left_unit margin_top margin_top_unit margin_right margin_right_unit margin_bottom margin_bottom_unit margin_left margin_left_unit border_style border_width border_width_unit border_color border_radius background_type background_color background_gradient background_size width height link_options list_icon text_align font_family font_size".split(
    " "
  );

function buildLayoutCms() {
  const r = createRand(3000);
  const wysiwyg = (label: string) => ({
    _uid: r.uuid(),
    component: "wysiwyg",
    ...Object.fromEntries(STYLE_KEYS.map((key) => [key, key === "background_image" ? { fieldtype: "asset", filename: "", meta_data: {}, name: "" } : key === "link_options" || key === "list_icon" ? [] : ""])),
    content: {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: label, marks: [{ type: "styled", attrs: { class: "font-sans text-body-semibold" } }] }] }],
    },
  });
  const link = (label: string, children: CmsLink[] = []): CmsLink => {
    const url = "/" + label.toLowerCase().replace(/ /g, "-");
    return {
      _uid: r.uuid(),
      component: "nav_menu_link",
      label,
      link: { cached_url: url, fieldtype: "multilink", id: "", linktype: "url", url },
      tracking_event_category: "Navbar",
      tracking_event_label: label,
      wysiwyg: [wysiwyg(label)],
      children,
    };
  };
  const nav = [
    link("Home"),
    link("Features", [link("Platform Overview"), link("Network 360")]),
    link("About Us"),
    link("Testimonials"),
    link("Resources", [link("Find Networking Events"), link("Business University"), link("Help Center"), link("Blog"), link("Learning Center")]),
  ];
  const footerLinks = Array.from({ length: 12 }, () => link(r.title(r.int(1, 5))));
  const legalLinks = ["Terms of Service", "Privacy Policy", "Code of Conduct", "Cookie Policy"].map((l) => link(l));
  const logoPaths = [r.svgPath(2790), r.svgPath(1300)];
  const iconPaths = Array.from({ length: 6 }, () => r.svgPath(r.int(200, 900)));

  const query = (key: string, data: unknown) => ({
    dehydratedAt: 1791159813894,
    state: {
      data: { json: data },
      dataUpdateCount: 1,
      dataUpdatedAt: 1791159813749,
      error: null,
      errorUpdateCount: 0,
      errorUpdatedAt: 0,
      fetchFailureCount: 0,
      fetchFailureReason: null,
      fetchMeta: null,
      isInvalidated: false,
      status: "success",
      fetchStatus: "idle",
    },
    queryKey: [key.split("."), { type: "query" }],
    queryHash: JSON.stringify([key.split("."), { type: "query" }]),
  });

  const content = { _uid: r.uuid(), component: "visitor_layout", nav, footerLinks, legalLinks };
  const ssrState = {
    relaySsrState: { "client:root": { __id: "client:root", __typename: "__Root" } },
    reactQuerySsrState: {
      mutations: [],
      queries: [
        query("user.me", null),
        query("user.admin", null),
        query("user.csrfToken", { csrfToken: r.token(43) }),
        query("user.trackingSession", { amplitudeSessionId: null, trackingSessionId: null }),
        query("cms.visitorLayout", { alternates: [], content }),
      ],
    },
  };
  return { content, ssrState, logoPaths, iconPaths };
}

export const layoutCms = buildLayoutCms();
