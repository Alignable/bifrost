import { AugmentMe, Script } from "../../types/internal";

export function resolveScripts(
  scripts: Script[][] | undefined,
  pageContextInit: AugmentMe.PageContextInit
): string[] {
  return (scripts || []).flatMap((sarr) =>
    sarr.map((s) => (typeof s === "string" ? s : s(pageContextInit)))
  );
}
