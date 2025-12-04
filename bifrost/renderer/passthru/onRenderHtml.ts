import { dangerouslySkipEscape } from "vike/server";

const emptydocument = dangerouslySkipEscape("");
export default function onRenderHtml() {
  return { documentHtml: emptydocument };
}
