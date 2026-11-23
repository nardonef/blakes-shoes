# Rivalry Drive: 3D flagship game

**Date:** 2026-11-20 · **Route:** `/games/rivalry` · **Status:** milestone 1 in progress

## Goal

A 3D football game that feels like a console sports game in miniature, built around this league:
your real roster, against a real rival's real roster, with the real all-time series on the line.
Phone first.

User decisions (2026-11-20): flagship = rivalry drive; art = free CC0 animated models; phone first;
2D games ship separately (#65, #66 merged).

## The game

**Scenario: the two-minute drill.** You're down to your rival with 2:00 left, ball on your own 25,
one timeout. Score a touchdown to win; run out of time or downs and you lose.

- **Rival:** defaults to your *nemesis* (the manager with the best all-time record against you,
  playoffs included, consolation games excluded, as on /stats). Any of the other 11 can be picked.
- **Deficit:** your real *last* loss to that rival, rounded into 4-7 points so a TD is needed.
  If you've never lost to them, 4.
- **Pre-game card:** the real series ("KLENSCH LEADS 14-9"), last meeting score and season, both
  starting lineups with fantasy PPG.
- **Score:** a win records the seconds left on the clock (0-120) on the shared leaderboard as game
  `rivalry`. Losses aren't recorded.

### Rosters (week-7 starters, `lib/games/rosters.ts`)

Offense, 11: QB, RB1, WR1, WR2, TE, FLEX (the real W/R/T starter, lines up as slot), plus five
generic linemen. Defense, 11: four DL, three LB, two CB, two S, all wearing the rival's colors and
labeled by the rival's real DEF ("BROWNS D"). Ratings work as in the 2D games: receiver rating
sets separation, QB rating sets pocket time, RB rating sets speed, DEF rating sets pursuit speed.

### A play

1. **Call it.** Broadcast-style carousel: HB DIVE, HB TOSS, SLANTS, CURL FLAT, FOUR VERTS,
   PA POST. SPIKE (stops the clock, costs a down) and TIMEOUT when allowed.
2. **Snap.** On runs the QB hands off and you steer the RB. On passes the QB drops back and
   receivers run routes; tap a receiver (or his name chip) to throw. The pass leads him, flies on a
   real arc, and resolves by separation and rating when it arrives (catch, drop, deflection or
   pick). After a catch you steer the receiver.
3. **Steer.** Virtual joystick (left thumb); JUKE button (right thumb) gives a short sideways
   burst with a cooldown. Arrow keys / WASD and Space on desktop.
4. **Defense.** The AI picks man, zone or blitz each play. Linemen engage blockers; linebackers
   and DBs take pursuit angles. A defender reaching the ball carrier makes the tackle.
5. **Whistle.** Down, distance and clock update. In-bounds tackles run 15 s of clock before the
   next snap; incompletions and out-of-bounds stop it.

### Presentation

- **Stadium:** night game. Striped field with hash marks, numbers, BLAKE'S SHOES at midfield, both
  managers' names in the end zones; tiered stands with an instanced crowd; light towers; fog.
- **Players:** Quaternius mannequin recolored per team, plus a helmet and facemask in team colors.
  Name tags over the skill players.
- **Camera:** follows the play from behind the offense, high and pulled back, easing toward the
  ball. On a touchdown: slow motion, an orbit, confetti in your color.
- **HUD:** broadcast score bug (names, score, 4TH, clock, down and distance, timeouts).
- **Milestone 2:** instant replay, crowd and whistle audio, post-processing on desktop, juke
  polish, celebrations.

## Tech

- `three` 0.187, `@react-three/fiber` 9.8, `@react-three/drei` 10.7, loaded only on
  `/games/rivalry` (`next/dynamic`, `ssr: false`).
- **Assets:** `public/games/players.glb`, built by `scripts/build-game-assets.mjs` from Quaternius
  Universal Animation Library 1 + 2 (CC0). Pack 1's Unreal FBX is converted with FBX2glTF so both
  packs share the UE bone names, then the needed clips are merged onto pack 2's mannequin, pruned
  and compressed.
  - Pack 1 clips: Idle, Jog, Sprint, Crouch (stance), Push (blocking), Hit_Chest, Death01, Roll,
    Dance (celebration), Jump.
  - Pack 2 clips: OverhandThrow, Hit_Knockback, Slide (dive tackle), LayToIdle (get up).
- **Logic vs rendering:** all game rules in pure, tested modules under `lib/rivalry/`
  (series and nemesis, scenario, clock and downs, play definitions, coverage AI, pursuit, catch
  resolution, tackles). The 3D layer reads simulation state each frame and draws it.
- **Phone budget:** 22 skinned meshes at about 14k triangles each, about 300k triangles. Blob
  shadows on phones, real shadow map and post-processing on desktop. Pixel ratio capped at 2.

## Milestones

1. **Playable slice (this PR):** stadium, 22 animated players in team colors, real rosters and
   series, play calling, run and pass plays end to end, tackles, clock and downs, win/lose,
   score bug, phone controls. Leaderboard entry.
2. **Feel:** replay, slow-mo and celebration polish, audio, desktop post-processing, blocking and
   tackle animation polish.
3. **Later, by request:** play defense, full-game mode, other 3D games.

## Out of scope

Real NFL likenesses or team marks; a recreation of any existing football game's look or modes.
