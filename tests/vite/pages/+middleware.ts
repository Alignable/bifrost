import { enhance } from "@universal-middleware/core";

// Like a Vike extension's +middleware. Once one exists, renderPage() throws, so Bifrost has to run them itself.
// Skipped for the benchmark pages so that they measure Bifrost alone.
const isBench = (request: Request) => new URL(request.url).pathname.startsWith("/bench/");

const addContext = enhance(
  async (request: Request) => (isBench(request) ? undefined : { fromMiddleware: "context" }),
  { name: "test-context" }
);

const addHeader = enhance(
  async (request: Request) =>
    isBench(request)
      ? undefined
      : (response: Response) => {
          response.headers.set("x-test-middleware", "1");
          return response;
        },
  { name: "test-header" }
);

const route = enhance(async () => new Response("from +middleware"), {
  name: "test-route",
  path: "/middleware-route",
  method: "GET",
});

export default [addContext, addHeader, route];
