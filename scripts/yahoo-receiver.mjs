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

const MAX_BODY = 2_000_000;

createServer((req, res) => {
  // Only the Yahoo tab may talk to us: exact Origin, and Host must be the loopback
  // address (blocks DNS rebinding). Requiring JSON forces a CORS preflight.
  if (req.headers.origin !== ORIGIN || req.headers.host !== `127.0.0.1:${PORT}`) {
    return res.writeHead(403).end();
  }
  res.setHeader("Access-Control-Allow-Origin", ORIGIN);
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  res.setHeader("Access-Control-Allow-Private-Network", "true");
  if (req.method === "OPTIONS") return res.end();
  if (req.method === "GET" && req.url === "/have") {
    return res.end(JSON.stringify(readdirSync(DIR).map((f) => f.replace(/\.html$/, ""))));
  }
  if (req.method === "POST" && req.url === "/save") {
    if (req.headers["content-type"] !== "application/json") return res.writeHead(415).end();
    let body = "";
    req.on("data", (c) => {
      body += c;
      if (body.length > MAX_BODY) req.destroy();
    });
    req.on("end", () => {
      let name, html;
      try {
        ({ name, html } = JSON.parse(body));
      } catch {
        return res.writeHead(400).end("bad json");
      }
      if (typeof name !== "string" || !/^[a-z0-9-]+$/.test(name) || typeof html !== "string") {
        return res.writeHead(400).end("bad payload");
      }
      writeFileSync(join(DIR, `${name}.html`), html);
      console.log("saved", name, html.length);
      res.end("ok");
    });
    return;
  }
  res.writeHead(404).end();
}).listen(PORT, "127.0.0.1", () => console.log(`receiver on http://127.0.0.1:${PORT}, writing to ${DIR}`));
