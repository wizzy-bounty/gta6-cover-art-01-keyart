# Leonida Key Art Studio — GTA VI cover art from your photos

[![Competition](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Rank](https://make.fun/badge/gta6-cover-art-01/wizzy-bounty/gta6-cover-art-01-keyart/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Reward](https://make.fun/badge/gta6-cover-art-01/wizzy-bounty/gta6-cover-art-01-keyart/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

An offline single-page studio that turns your photos into cinematic GTA-style **key art**: one big
hero cover with the title laid over the artwork, a tagged cast, an edition frame with its own seal,
and a movie-poster billing block along the bottom. No uploads to any server, no tracking — everything
is painted and exported locally on a `<canvas>`.

## What it does

- **Hero-first key art.** The default layout is a single full-bleed hero panel with the title over the
  art, exactly like a game cover. A **Pop-out** toggle scales the hero subject up and lifts it so it
  overlaps the frame edge for that classic key-art pop.
- **Three layout modes.** *Key Art* (one hero), *Panels* (a 4- or 6-panel grid), and *Duo* (a two-panel
  split). Every panel is independently sourced, cropped and tagged.
- **Smart focal crop.** Click any panel in the preview to set its focal point — a crosshair marks the
  spot and the render crops around it with a cover-fit focal bias. A per-panel zoom slider tightens or
  loosens the crop.
- **Cast tags.** Each panel can carry a slanted role label — THE DRIVER, THE FIXER, THE SIREN,
  THE LOOKOUT, THE HEAVY, THE GHOST — with editable text, like a character one-sheet.
- **Title over art.** A big Anton display title (default `LEONIDA`) with four treatments — Chrome,
  Sunset, Gold and Neon — plus an editable script subtitle (default *welcome back to*).
- **Edition frames.** Standard, Chrome, Gold Foil, Platinum and Legend frames, each with its own frame
  colour and a round edition seal stamped on the cover corner.
- **Billing block.** The tiny condensed credit line from a movie poster, along the bottom of the
  cover — one editable line, set in letterspaced uppercase.
- **Photos, yours or painted.** Upload up to 6 photos (file picker or drag-and-drop), assign them per
  panel, swap them around, set focal points and zoom. With no uploads, the studio ships six rich
  code-painted demo scenes: Golden Mile, Neon Harbor, Causeway Dusk, Palm Strip, Marina Heist and
  Vice Sunset.
- **Exports.** One click renders a finished PNG at exactly 1080×1080, 1080×1350 or 1920×1080.

## How to run

The hand-in program is `main.ts` (Node 22, standard library only). The app itself is the static
`app/` folder — plain HTML, CSS and ES modules, no build step and no network requests.

```sh
npm install        # nothing to install, kept for familiarity
node serve.ts      # serve the studio at http://localhost:8080
```

or, after `npm run build`-style preparation (there is no bundler — the files are already final):

```sh
node serve.ts --port 4319   # any port works
```

To produce the hand-in output exactly as the grader does:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## How judging works

1. Run the app (`node serve.ts`) and open it in a desktop browser.
2. Add photos with the file picker or by dropping them on the drop zone — or just use the painted
   demo scenes and the two bundled sample photos.
3. Pick a layout mode (Key Art, Panels or Duo) and toggle Pop-out on the hero.
4. Click panels in the preview to set focal points; use the zoom slider on the selected panel.
5. Tag the cast from the role list (or type your own tag text).
6. Choose a title treatment and an edition frame; edit the title, subtitle and billing line.
7. Export a PNG at 1080×1080, 1080×1350 or 1920×1080.

Deterministic screenshot routes are built in for review: `?shot=1` renders the landscape key art
(1920×1080), `?shot=3` the portrait Panels export (1080×1350), `?shot=4` the square Duo export
(1080×1080), and the plain page at 1280×800 is the editor. The kit routes `?shot=cover&photo=pier`
and `?shot=editor&photo=boulevard` work too.

## Tech

TypeScript harness (`main.ts`) with the vendored make.fun dossier library; the studio itself is
dependency-free HTML/CSS/JavaScript with Canvas 2D rendering, fully offline, no tracking. Display
type is Anton and Pacifico (SIL Open Font License 1.1, bundled under `app/fonts/`).

## License

MIT — see `LICENSE`.
