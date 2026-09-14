import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { renderOfflineHelp } from "../lib/safety/offlineHelp";
const out = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "offline-help.html");
fs.writeFileSync(out, renderOfflineHelp());
console.log(`wrote ${path.relative(process.cwd(), out)} (${fs.statSync(out).size} bytes)`);
