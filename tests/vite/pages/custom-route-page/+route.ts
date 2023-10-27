import { RouteSync } from "@alignable/bifrost";

const ROUTES = ["/this-is-a-custom-route"];
export const route: RouteSync = (pageContext) => {
  return ROUTES.includes(pageContext.urlPathname);
};
