// Paste into the console of a logged-in https://football.fantasysports.yahoo.com tab
// while scripts/yahoo-receiver.mjs is running. Fetches each season's transactions and
// weekly matchup pages one at a time (2.5-4s apart) and posts the relevant fragments
// to the receiver. Resumable: pages the receiver already has are skipped.
// Progress: window.__bs. Stop: window.__bs.stop = true.
(() => {
  const SEASONS = [
    [2012, 404981, 16], [2013, 578874, 16], [2014, 846936, 16], [2015, 325721, 16],
    [2016, 280534, 16], [2017, 764476, 16], [2018, 112596, 16], [2019, 717523, 16],
    [2020, 462412, 16], [2021, 744749, 17], [2022, 92777, 17], [2023, 676326, 17],
    [2024, 133008, 17], [2025, 543958, 17],
  ];
  const SINK = "http://127.0.0.1:8787";
  const bs = (window.__bs = { status: "running", saved: 0, skipped: 0, current: "", error: null, stop: false });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const pause = () => sleep(2500 + Math.random() * 1500);

  async function page(path) {
    const r = await fetch(path, { credentials: "include" });
    if (!r.ok || !r.url.startsWith("https://football.fantasysports.yahoo.com/")) {
      throw new Error(`${r.status} at ${path}`);
    }
    return new DOMParser().parseFromString(await r.text(), "text/html");
  }
  async function save(name, html) {
    const r = await fetch(`${SINK}/save`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, html }),
    });
    if (!r.ok) throw new Error(`receiver ${r.status} for ${name}`);
    bs.saved++;
  }

  async function transactions(year, lid, have) {
    for (let offset = 0; ; offset += 25) {
      const name = `tx-${year}-${offset}`;
      if (have.has(name)) { bs.skipped++; continue; }
      if (bs.stop) return;
      bs.current = name;
      const d = await page(`/${year}/f1/${lid}/transactions?transactionsfilter=all&count=${offset}`);
      const table = d.querySelector("table");
      if (!d.title.includes("Transactions")) throw new Error(`unexpected page for ${name}: ${d.title}`);
      const rows = table ? table.querySelectorAll("tbody tr").length : 0;
      if (rows) await save(name, table.outerHTML);
      await pause();
      if (rows < 25) return;
    }
  }

  async function matchups(year, lid, weeks, have) {
    for (let w = 1; w <= weeks; w++) {
      const covered = new Set();
      for (const n of have) {
        const m = n.match(new RegExp(`^mu-${year}-w${w}-(\\d+)-(\\d+|x)$`));
        if (m) { covered.add(m[1]); covered.add(m[2]); }
      }
      for (let t = 1; t <= 12; t++) {
        if (covered.has(String(t))) { bs.skipped++; continue; }
        if (bs.stop) return;
        bs.current = `mu-${year}-w${w}-t${t}`;
        const d = await page(`/${year}/f1/${lid}/matchup?week=${w}&mid1=${t}`);
        const header = d.querySelector("#matchup-header");
        const s1 = d.querySelector("#statTable1");
        if (!header || !s1) throw new Error(`no matchup tables at ${bs.current}: ${d.title}`);
        const ids = [];
        for (const a of header.querySelectorAll("a")) {
          const m = (a.getAttribute("href") || "").match(new RegExp(`/f1/${lid}/(\\d+)$`));
          if (m && !ids.includes(m[1])) ids.push(m[1]);
        }
        const [left = String(t), right = "x"] = ids;
        const s2 = d.querySelector("#statTable2");
        await save(`mu-${year}-w${w}-${left}-${right}`, header.outerHTML + s1.outerHTML + (s2 ? s2.outerHTML : ""));
        covered.add(left);
        covered.add(right);
        covered.add(String(t));
        await pause();
      }
    }
  }

  (async () => {
    try {
      const have = new Set(await (await fetch(`${SINK}/have`)).json());
      for (const [year, lid, weeks] of SEASONS) {
        await transactions(year, lid, have);
        await matchups(year, lid, weeks, have);
        if (bs.stop) break;
      }
      bs.status = bs.stop ? "stopped" : "done";
    } catch (e) {
      bs.status = "error";
      bs.error = String(e);
    }
  })();
  return "started";
})();
