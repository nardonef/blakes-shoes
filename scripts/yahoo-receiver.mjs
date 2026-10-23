// Local sink for scripts/yahoo-scrape.browser.js: the scraper runs inside a logged-in
// Yahoo Fantasy tab and POSTs page fragments here; they land in the raw cache that
// `yahoo-pull.ts build` parses. Listens on 127.0.0.1 only.
//
//   node scripts/yahoo-receiver.mjs
import { createServer } from "node:http";
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const DIR = join(homedir(), ".cache/blakes-shoes-yahoo/html");
const PORT = 8787;
const ORIGIN = "https://football.fantasysports.yahoo.com";
mkdirSync(DIR, { recursive: true });

createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", ORIGIN);
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  res.setHeader("Access-Control-Allow-Private-Network", "true");
  if (req.method === "OPTIONS") return res.end();
  if (req.method === "GET" && req.url === "/have") {
    return res.end(JSON.stringify(readdirSync(DIR).map((f) => f.replace(/\.html$/, ""))));
  }
  if (req.method === "POST" && req.url === "/save") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const { name, html } = JSON.parse(body);
      if (!/^[a-z0-9-]+$/.test(name)) return res.writeHead(400).end("bad name");
      writeFileSync(join(DIR, `${name}.html`), html);
      console.log("saved", name, html.length);
      res.end("ok");
    });
    return;
  }
  res.writeHead(404).end();
}).listen(PORT, "127.0.0.1", () => console.log(`receiver on http://127.0.0.1:${PORT}, writing to ${DIR}`));
