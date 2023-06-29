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
app.use(morgan("tiny"));

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
    console.log(req.headers)
    if (req.header("X-VITE-PROXY")) {
      res.setHeader("X-REACT-LAYOUT", data.layout ?? "main_nav");
      res.setHeader("X-REACT-CURRENT-NAV", "home_page");
    }
    res.send(buildPage(data, !!req.header("X-VITE-PROXY")));
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
