import { readFileSync } from "node:fs";
import { htmlStats } from "./stats";
import { signInHtml } from "./signIn";
import { businessProfileHtml } from "./businessProfile";

const rows: Record<string, ReturnType<typeof htmlStats>> = {
  "signIn (wrapped backend body)": htmlStats(signInHtml()),
  "businessProfile (passthru)": htmlStats(businessProfileHtml()),
};
for (const file of process.argv.slice(2)) rows[file] = htmlStats(readFileSync(file, "utf8"));
console.table(rows);
