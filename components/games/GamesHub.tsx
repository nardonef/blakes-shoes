"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GAMES, GAME_IDS, formatScore, type GameId, type ScoreEntry } from "@/lib/games/scores";
import type { GameRosters } from "@/lib/games/rosters";
import Kicker from "./Kicker";
import Qb from "./Qb";
import Run from "./Run";
import Coach from "./Coach";
import { Matchup } from "./ui";

const MONO = { fontFamily: "var(--font-geist-mono)" };
const BEBAS = { fontFamily: "var(--font-bebas-neue)" };
const MANAGER_KEY = "games-manager";

type HubGame = Exclude<GameId, "rivalry">;

const BLURBS: Record<HubGame, string> = {
  kicker: "Your kicker, your leg: better kickers have more range. Tap to set aim, tap to set power. Every make backs you up 5 yards. Three misses and you're done.",
  qb: "Your QB throws to your WRs and TE. Better receivers get open more often, and a better QB buys more time. Ten dropbacks; a pick ends it.",
  run: "You're your RB1, and better backs are faster. Drag (or use arrow keys) to run through their defense. Four downs to make 10. Every touchdown brings more defenders.",
  coach: "Call the plays against a league rival. Your players are in the play-by-play. Five possessions each. Your score is the final margin.",
};

type Boards = Record<GameId, ScoreEntry[]>;

/** The 2D games on this page; RIVALRY has its own page. */
const HUB_GAMES = GAME_IDS.filter((g): g is HubGame => g !== "rivalry");

/** A random other manager to play against. */
function rollOpponent(managers: string[], me: string): string {
  const others = managers.filter((m) => m !== me);
  return others[Math.floor(Math.random() * others.length)];
}

export default function GamesHub({ managers, rosters }: { managers: string[]; rosters: GameRosters }) {
  const [manager, setManager] = useState("");
  const [oppName, setOppName] = useState("");
  const [game, setGame] = useState<HubGame>("kicker");
  const [boards, setBoards] = useState<Boards | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "offline">("loading");
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    try {
      const m = localStorage.getItem(MANAGER_KEY);
      if (m && managers.includes(m)) {
        setManager(m);
        setOppName(rollOpponent(managers, m));
      }
    } catch {}
    fetch("/api/games/scores")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((b: Boards) => {
        setBoards(b);
        setStatus("ok");
      })
      .catch(() => setStatus("offline"));
  }, [managers]);

  function choose(m: string) {
    setManager(m);
    setOppName(rollOpponent(managers, m));
    try {
      localStorage.setItem(MANAGER_KEY, m);
    } catch {}
  }

  async function finish(g: GameId, score: number) {
    setSaved(null);
    try {
      const r = await fetch("/api/games/scores", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ game: g, manager, score }),
      });
      if (!r.ok) throw new Error();
      setBoards(await r.json());
      setStatus("ok");
      setSaved(`${formatScore(g, score)} ${GAMES[g].unit} SUBMITTED FOR ${manager.toUpperCase()}`);
    } catch {
      setStatus("offline");
    }
  }

  const team = rosters.teams.find((t) => t.manager === manager);
  const opp = rosters.teams.find((t) => t.manager === oppName);

  return (
    <div className="max-w-[1160px] mx-auto px-4 md:px-10 py-6 md:py-10">
      <Link
        href="/games/rivalry"
        className="group block mb-6 bg-[#151515] text-white p-4 md:p-6 border-l-4 border-[var(--accent)] hover:bg-[#1d1d1c]"
      >
        <div className="text-[10.5px] font-semibold tracking-[.2em] text-[var(--accent-light)]" style={MONO}>
          NEW · 3D
        </div>
        <div className="text-[36px] md:text-[48px] leading-none mt-1" style={BEBAS}>
          RIVALRY DRIVE <span className="text-[var(--accent-light)] group-hover:translate-x-1 inline-block transition-transform">→</span>
        </div>
        <p className="text-sm text-[#c9c9c2] mt-1">Two minutes, down to your nemesis, your real roster against theirs. Score to win.</p>
      </Link>

      <section aria-labelledby="pick-label" className="mb-6">
        <label id="pick-label" htmlFor="manager" className="block text-[11px] font-semibold tracking-[.2em] text-[var(--muted-light)] mb-2" style={MONO}>
          YOU ARE
        </label>
        <select
          id="manager"
          value={manager}
          onChange={(e) => choose(e.target.value)}
          className="w-full sm:w-auto min-h-12 px-3 bg-white border-2 border-[#151515] text-[22px] tracking-[.02em]"
          style={BEBAS}
        >
          <option value="" disabled>
            PICK YOUR MANAGER
          </option>
          {managers.map((m) => (
            <option key={m} value={m}>
              {m.toUpperCase()}
            </option>
          ))}
        </select>
      </section>

      <div role="tablist" aria-label="Games" className="grid grid-cols-4 border-b-[3px] border-[var(--accent)]">
        {HUB_GAMES.map((g) => (
          <button
            key={g}
            role="tab"
            type="button"
            aria-selected={game === g}
            onClick={() => {
              setGame(g);
              setSaved(null);
              if (manager) setOppName(rollOpponent(managers, manager));
            }}
            className={`min-h-12 text-[12px] font-semibold tracking-[.12em] ${game === g ? "bg-[var(--accent)] text-white" : "bg-[#151515] text-[#a3a3a0] hover:text-white"}`}
            style={MONO}
          >
            {GAMES[g].label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] mt-6">
        <section aria-label={`${GAMES[game].label} game`}>
          <p className="text-sm text-[var(--body-text)] mb-3">{BLURBS[game]}</p>
          {!team || !opp ? (
            <div className="bg-[#151515] text-[#f5f5f0] p-8 text-center text-[28px]" style={BEBAS}>
              PICK YOUR MANAGER TO PLAY
            </div>
          ) : (
            <div key={`${game}-${manager}-${oppName}`}>
              <Matchup team={team} opp={game === "kicker" ? undefined : opp} week={rosters.week} />
              {game === "kicker" && <Kicker team={team} onFinish={(s) => finish("kicker", s)} />}
              {game === "qb" && <Qb team={team} opp={opp} onFinish={(s) => finish("qb", s)} />}
              {game === "run" && <Run team={team} opp={opp} onFinish={(s) => finish("run", s)} />}
              {game === "coach" && <Coach team={team} opp={opp} onFinish={(s) => finish("coach", s)} />}
            </div>
          )}
          {saved && (
            <p className="mt-3 text-[11px] font-semibold tracking-[.14em] text-[var(--accent)]" style={MONO} role="status">
              {saved}
            </p>
          )}
        </section>

        <aside aria-labelledby="board-title" className="bg-white p-4 self-start">
          <h2 id="board-title" className="text-[30px] leading-none" style={BEBAS}>
            {GAMES[game].label} LEADERBOARD
          </h2>
          <div className="text-[10.5px] font-semibold tracking-[.14em] text-[var(--muted-light)] mt-1 mb-3" style={MONO}>
            BEST {GAMES[game].unit} PER MANAGER
          </div>
          {status === "loading" && <p className="text-sm text-[var(--muted-light)]">Loading...</p>}
          {status === "offline" && <p className="text-sm text-[var(--negative)]">Leaderboard is offline. Scores won&apos;t be saved right now.</p>}
          {status === "ok" && boards && (
            boards[game].length === 0 ? (
              <p className="text-sm text-[var(--muted-light)]">No scores yet. Be the first.</p>
            ) : (
              <ol className="divide-y divide-[var(--hairline)]">
                {boards[game].map((e, i) => (
                  <li key={e.manager} className={`flex items-baseline gap-3 py-2 ${e.manager === manager ? "font-semibold" : ""}`}>
                    <span className="w-6 text-[11px] text-[var(--muted-light)]" style={MONO}>
                      {i + 1}
                    </span>
                    <span className="flex-1 text-sm">{e.manager}</span>
                    <span className="text-[22px] leading-none tabular-nums" style={BEBAS}>
                      {formatScore(game, e.score)}
                    </span>
                  </li>
                ))}
              </ol>
            )
          )}
        </aside>
      </div>
    </div>
  );
}
