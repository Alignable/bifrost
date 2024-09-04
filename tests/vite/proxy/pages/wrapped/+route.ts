import { RouteSync } from "vike/types";

const paths = ["/custom", "/custom-bifrost", "/json-route"];

const route: RouteSync = (pageContext): ReturnType<RouteSync> => {
  return paths.includes(pageContext.urlPathname);
};

export default route;
