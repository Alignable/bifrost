import { describe, it } from "node:test";
import assert from "node:assert";
import { extractDomElements } from "./extractDomElements.ts";

describe("extractDomElements", () => {
  it("extracts head and body content from a complete HTML document", () => {
    const html = `<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body><p>Hello</p></body>
</html>`;

    const result = extractDomElements(html);

    assert.strictEqual(result.headInnerHtml, "<title>Test</title>");
    assert.strictEqual(result.bodyInnerHtml, "<p>Hello</p>");
    assert.deepStrictEqual(result.bodyAttributes, {});
  });

  it("extracts body attributes", () => {
    const html = `<html>
<head></head>
<body class="dark-mode" data-page="home">content</body>
</html>`;

    const result = extractDomElements(html);

    assert.deepStrictEqual(result.bodyAttributes, {
      class: "dark-mode",
      "data-page": "home",
    });
  });

  it("returns null for missing head", () => {
    const html = `<html><body>content</body></html>`;

    const result = extractDomElements(html);

    assert.strictEqual(result.headInnerHtml, null);
    assert.strictEqual(result.bodyInnerHtml, "content");
  });

  it("returns null for missing body", () => {
    const html = `<html><head><title>Test</title></head></html>`;

    const result = extractDomElements(html);

    assert.strictEqual(result.headInnerHtml, "<title>Test</title>");
    assert.strictEqual(result.bodyInnerHtml, null);
  });

  it("handles empty head and body", () => {
    const html = `<html><head></head><body></body></html>`;

    const result = extractDomElements(html);

    assert.strictEqual(result.headInnerHtml, "");
    assert.strictEqual(result.bodyInnerHtml, "");
  });

  it("preserves whitespace and formatting in content", () => {
    const html = `<html>
<head>
  <title>Test</title>
  <meta charset="utf-8">
</head>
<body>
  <div>
    <p>Formatted content</p>
  </div>
</body>
</html>`;

    const result = extractDomElements(html);

    assert.ok(result.headInnerHtml?.includes("<title>Test</title>"));
    assert.ok(result.headInnerHtml?.includes('<meta charset="utf-8">'));
    assert.ok(result.bodyInnerHtml?.includes("<p>Formatted content</p>"));
  });

  it("handles nested elements correctly", () => {
    const html = `<html>
<head><style>body { color: red; }</style></head>
<body><div><span><a href="#">Link</a></span></div></body>
</html>`;

    const result = extractDomElements(html);

    assert.strictEqual(
      result.headInnerHtml,
      "<style>body { color: red; }</style>"
    );
    assert.strictEqual(
      result.bodyInnerHtml,
      '<div><span><a href="#">Link</a></span></div>'
    );
  });

  it("only extracts the first head and body (ignores duplicates)", () => {
    const html = `<html>
<head><title>First</title></head>
<head><title>Second</title></head>
<body>First body</body>
<body>Second body</body>
</html>`;

    const result = extractDomElements(html);

    assert.strictEqual(result.headInnerHtml, "<title>First</title>");
    assert.strictEqual(result.bodyInnerHtml, "First body");
  });

  it("handles self-closing tags in content", () => {
    const html = `<html>
<head><meta charset="utf-8"><link rel="stylesheet" href="style.css"></head>
<body><img src="image.png"><br>text</body>
</html>`;

    const result = extractDomElements(html);

    assert.ok(result.headInnerHtml?.includes('<meta charset="utf-8">'));
    assert.ok(result.bodyInnerHtml?.includes('<img src="image.png">'));
  });

  it("handles script and style tags with special content", () => {
    const html = `<html>
<head><script>if (a < b && c > d) {}</script></head>
<body><script>document.write('<div></div>')</script></body>
</html>`;

    const result = extractDomElements(html);

    assert.strictEqual(
      result.headInnerHtml,
      "<script>if (a < b && c > d) {}</script>"
    );
    assert.strictEqual(
      result.bodyInnerHtml,
      "<script>document.write('<div></div>')</script>"
    );
  });

  it("returns empty bodyAttributes when body has no attributes", () => {
    const html = `<html><head></head><body>content</body></html>`;

    const result = extractDomElements(html);

    assert.deepStrictEqual(result.bodyAttributes, {});
  });

  it("handles HTML without html tag wrapper", () => {
    const html = `<head><title>Test</title></head><body>content</body>`;

    const result = extractDomElements(html);

    assert.strictEqual(result.headInnerHtml, "<title>Test</title>");
    assert.strictEqual(result.bodyInnerHtml, "content");
  });

  it("handles completely empty input", () => {
    const result = extractDomElements("");

    assert.strictEqual(result.headInnerHtml, null);
    assert.strictEqual(result.bodyInnerHtml, null);
    assert.deepStrictEqual(result.bodyAttributes, {});
  });

  it("handles input with no head or body tags", () => {
    const html = `<div>Just some content</div>`;

    const result = extractDomElements(html);

    assert.strictEqual(result.headInnerHtml, null);
    assert.strictEqual(result.bodyInnerHtml, null);
    assert.deepStrictEqual(result.bodyAttributes, {});
  });
});
