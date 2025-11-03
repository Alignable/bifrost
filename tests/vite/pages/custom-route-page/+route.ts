import { PageContext } from "vike/types";

const ROUTES = ["/this-is-a-custom-route"];
export const route = (pageContext: PageContext) => {
  return ROUTES.includes(pageContext.urlPathname);
};
