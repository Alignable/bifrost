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

  describe("malformed HTML", () => {
    it("handles unclosed tags in body", () => {
      const html = `<html><head></head><body><div><p>unclosed</body></html>`;

      const result = extractDomElements(html);

      assert.strictEqual(result.bodyInnerHtml, "<div><p>unclosed");
    });

    it("handles unclosed tags in head", () => {
      const html = `<html><head><title>unclosed</head><body>content</body></html>`;

      const result = extractDomElements(html);

      // htmlparser2 treats title as a text container - it consumes everything until </title>
      // Since there's no </title>, the title swallows the rest of the document
      assert.ok(result.headInnerHtml?.startsWith("<title>unclosed"));
      // Body never properly opens because it's inside the unclosed title
      assert.strictEqual(result.bodyInnerHtml, null);
    });

    it("handles missing closing body tag", () => {
      const html = `<html><head></head><body><p>content</p></html>`;

      const result = extractDomElements(html);

      // htmlparser2 auto-closes body when it sees </html>
      assert.strictEqual(result.bodyInnerHtml, "<p>content</p>");
    });

    it("handles missing closing head tag", () => {
      const html = `<html><head><title>Test</title><body>content</body></html>`;

      const result = extractDomElements(html);

      // htmlparser2 auto-closes head when it sees body
      assert.strictEqual(result.headInnerHtml, "<title>Test</title>");
      assert.strictEqual(result.bodyInnerHtml, "content");
    });

    it("handles mismatched/interleaved tags", () => {
      const html = `<html><head></head><body><div><span></div></span></body></html>`;

      const result = extractDomElements(html);

      // Parser is lenient, extracts what it can
      assert.ok(result.bodyInnerHtml !== null);
    });

    it("handles extra closing tags", () => {
      const html = `<html><head></head></head><body>content</body></body></html>`;

      const result = extractDomElements(html);

      assert.strictEqual(result.headInnerHtml, "");
      assert.strictEqual(result.bodyInnerHtml, "content");
    });

    it("handles broken attribute syntax", () => {
      const html = `<html><head></head><body class="broken data-x=>content</body></html>`;

      const result = extractDomElements(html);

      // Parser handles this gracefully
      assert.ok(result.bodyAttributes !== null);
    });

    it("handles tags with missing closing bracket", () => {
      const html = `<html><head></head><body<p>content</p></body></html>`;

      const result = extractDomElements(html);

      // Parser may interpret this differently, but shouldn't crash
      assert.ok(result !== null);
    });

    it("handles random text before doctype", () => {
      const html = `garbage text <!DOCTYPE html><html><head></head><body>content</body></html>`;

      const result = extractDomElements(html);

      assert.strictEqual(result.headInnerHtml, "");
      assert.strictEqual(result.bodyInnerHtml, "content");
    });

    it("handles comments in unusual places", () => {
      const html = `<html><!--comment--><head><!--in head--></head><body><!--in body-->content</body></html>`;

      const result = extractDomElements(html);

      assert.strictEqual(result.headInnerHtml, "<!--in head-->");
      assert.strictEqual(result.bodyInnerHtml, "<!--in body-->content");
    });

    it("handles CDATA sections", () => {
      const html = `<html><head></head><body><![CDATA[some data]]>content</body></html>`;

      const result = extractDomElements(html);

      assert.ok(result.bodyInnerHtml?.includes("content"));
    });

    it("handles null bytes and control characters", () => {
      const html = `<html><head></head><body>con\x00tent\x01</body></html>`;

      const result = extractDomElements(html);

      assert.ok(result.bodyInnerHtml !== null);
    });

    it("handles extremely deeply nested tags", () => {
      const nested = "<div>".repeat(100) + "content" + "</div>".repeat(100);
      const html = `<html><head></head><body>${nested}</body></html>`;

      const result = extractDomElements(html);

      assert.ok(result.bodyInnerHtml?.includes("content"));
    });

    it("handles body inside head (invalid nesting)", () => {
      const html = `<html><head><body>weird</body></head><body>normal</body></html>`;

      const result = extractDomElements(html);

      // First body tag wins
      assert.strictEqual(result.bodyInnerHtml, "weird");
    });

    it("handles head inside body (invalid nesting)", () => {
      const html = `<html><body><head>weird</head>content</body></html>`;

      const result = extractDomElements(html);

      // First head tag wins even though it's inside body
      assert.strictEqual(result.headInnerHtml, "weird");
    });
  });
});
