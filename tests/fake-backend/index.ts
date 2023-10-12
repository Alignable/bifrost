import express from "express";
import morgan from "morgan";
import { PageData, buildPage, toPath } from "./page-builder";
const app = express();
const port = 5557;

function sleep(timeout: number) {
  return new Promise(function (resolve) {
    setTimeout(resolve, timeout);
  });
}
// app.use(morgan("tiny"));

app.get(["/custom", "/custom-:id"], async (req, res) => {
  const data = JSON.parse(req.query.page as string) as PageData;
  if ("redirectTo" in data) {
    res.status(302);
    res.setHeader(
      "location",
      `http://localhost:${port}${toPath(data.redirectTo)}`
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
    res.status(400);
  }
});

app.get("/:file.js", async (req, res) => {
  res.status(200);
  res.setHeader("Content-Type", "application/javascript");
  res.send(`console.log('${req.params.file.replaceAll("-", " ")}')`);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
