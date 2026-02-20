import express from "express";
import morgan from "morgan";
import { PageData, buildPage, toPath } from "./page-builder";
const app = express();
const port = 5557;
const publicUrl = "http://localhost:5050";

app.use(function (req, res, next) {
  res.setHeader("x-test-fake-backend", "1");
  next();
});

function sleep(timeout: number) {
  return new Promise(function (resolve) {
    setTimeout(resolve, timeout);
  });
}
// app.use(morgan("tiny"));

app.get(["/custom", "/custom-:id"], async (req, res) => {
  let data: PageData;
  try {
    data = JSON.parse(req.query.page as string) as PageData;
  } catch (e) {
    console.error("Issue parsing JSON on page query: ", req.query.page);
    return res.status(500).send();
  }
  if ("redirectTo" in data) {
    res.status(302);

    res.setHeader(
      "location",
      ("url" in data.redirectTo && data.redirectTo.url) ||
        `${publicUrl}${toPath(data.redirectTo)}`
    );
    if (data.cookies) {
      for (const [key, val] of Object.entries(data.cookies)) {
        res.setHeader("set-cookie", key + "=" + val);
      }
    }
    res.send();
  } else {
    res.status(200);
    if (req.header("X-VITE-PROXY")) {
      res.setHeader("X-REACT-LAYOUT", data.layout ?? "main_nav");
      res.setHeader("X-REACT-CURRENT-NAV", "home_page");
    }
    res.send(buildPage(data, !!req.header("X-VITE-PROXY")));
  }
});

app.get("/json-route", async (req, res) => {
  // Putting json before html is unusual, but can happen.
  // This tests rewriting Accept to text/html on index.pageContext.json requests.
  const format = req.accepts(["json", "html"]);
  if (format === "html") {
    if (req.header("X-VITE-PROXY")) {
      res.setHeader("X-REACT-LAYOUT", "main_nav");
      res.setHeader("X-REACT-CURRENT-NAV", "home_page");
    }
    res
      .status(200)
      .send(
        "<html><head><title>json route</title></head><body>hi</body></html>"
      );
  } else if (format === "json") {
    res.status(200).json({ data: true });
  } else {
    res.status(400).send();
  }
});

app.get("/json-only", async (req, res) => {
  const format = req.accepts(["json"]);
  if (format === "json") {
    res.status(200).json({ data: true });
  } else {
    res.status(400).send();
  }
});

app.get("/script-wrapped", async (req, res) => {
  // simulate layout always being set
  if (req.header("X-VITE-PROXY")) {
    res.setHeader("X-REACT-LAYOUT", "no_layout");
  }
  res.setHeader("Content-Type", "text/html");
  res
    .status(200)
    .type("text/html")
    .send("<script>console.log('script-only')</script>");
});

app.get("/json-wrapped", async (req, res) => {
  // simulate layout always being set
  if (req.header("X-VITE-PROXY")) {
    res.setHeader("X-REACT-LAYOUT", "no_layout");
  }
  res.setHeader("Content-Type", "application/json");
  res.status(200).json({ data: true });
});

app.get("/:file.js", async (req, res) => {
  res.status(200);
  res.setHeader("Content-Type", "application/javascript");
  res.send(`console.log('${req.params.file.replaceAll("-", " ")}')`);
});

app.get("/:file.css", async (req, res) => {
  res.status(200);
  res.setHeader("Content-Type", "style/css");
  res.send("body { background-color: lightblue; }");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
