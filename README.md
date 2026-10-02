# Ember — Immersive Starter

A free & open-source starter for cinematic, scroll-driven websites in the
Aalto Digital Atelier vein. Nothing on the page scrolls: the stage is pinned to
the viewport and your scroll is the playhead of a film, with a WebGL core,
choreographed scenes and editorial type. Nothing here costs money; every layer is MIT /
open-source / gratis.

## The stack

| Layer | Tool | License |
|---|---|---|
| Framework | [Astro](https://astro.build) — static-first, islands | MIT |
| 3D islands | React + [@react-three/fiber](https://r3f.docs.pmnd.rs) + [drei](https://drei.docs.pmnd.rs) | MIT |
| Choreography | [Theatre.js](https://www.theatrejs.com) — one keyframed timeline, visual Studio in dev | Apache-2.0 (core) / AGPL (studio, dev only) |
| Smooth scroll | [Lenis](https://lenis.darkroom.engineering) — wheel *and* touch | MIT |
| WebGL plumbing | [r3f-scroll-rig](https://github.com/14islands/r3f-scroll-rig) — one persistent `GlobalCanvas`, scroll store | ISC |
| Imagery | Your own ComfyUI pipeline (see below) | Yours |

**Why Astro over Next.js here:** this is a cinematic marketing site, not an app.
Astro ships zero JS by default and hydrates only the islands you mark —
the WebGL stage mounts with a custom `client:afterload` directive (after first
paint, GPU devices only), everything else is static HTML.
Next.js would ship a full React runtime for content that's mostly static with
a few 3D moments. Tradeoff to know: Astro islands are separate React roots, so
if a 3D scene ever needs lots of live shared state with surrounding UI,
a single-tree React app (Next.js) is simpler. For scroll-driven cinematic
sites, that rarely comes up.

## Quickstart

Click **Use this template** on GitHub to create your own repository, then clone
your new repository and run:

```bash
npm install
npm run dev      # → http://localhost:4321  (add /?studio for Theatre Studio)
npm run build    # static output in dist/
npm start        # serve dist/ with compression, caching and security headers
```

Deploy `dist/` anywhere static: Vercel, Netlify, Cloudflare Pages, GitHub Pages.
Never serve `npm run dev` publicly: it ships ~27 MB of unminified dev modules.

## What's wired up

The page is one film, `LENGTH` units long, played across `SCREENS` viewport
heights of scrolling (both in `src/film/choreography.js`):

1. **Ember**: letter-by-letter headline; the camera pushes into the core.
2. **Studio**: the statement rises in; the core steps aside.
3. **Work**: the media panel settles from 1.18× as the caption rises; the core
   hides behind the panel, glow spilling round its edges.
4. **Craft**: the outlined-type marquee band.
5. **Contact**: the CTA, with the core rising from below like a sunrise.

Scroll *velocity* is thrust: embers stream faster and the core distorts harder
while you move. A chapter rail (bottom left) shows where you are in the film.

### Choreographing

Every animated value is a keyframe in `src/film/choreography.js`:

```js
'Statement / heading': scene(1.3, 2.2, 3.6, 4.2), // in, hold, out
'Stage / Core': { x: [[0, 0], [2.4, 1.7, 'out']], ... },
```

To tune it visually, run `npm run dev` and open `/?studio`. Theatre Studio
lists every object; scrub, drag keyframes and edit curves. Export the project
from Studio and save the file as `src/film/state.json`: it then takes
precedence over `choreography.js`. Studio is never included in production
builds.

### The markup API (in `src/scripts/film.js`)

- `data-film="Sheet / object"`: element driven by that object (`opacity`,
  `y` in vh, `scale`)
- `data-chapter="id"`: tabbing into it plays the film to that chapter, so
  keyboard focus never lands on something invisible
- `a[href="#id"]`: plays the film to chapter `id` instead of jumping
- `data-split-chars`: letter assembly on load (keeps nested `<em>`)

### Graceful paths

- **No GPU** (software WebGL, blocklisted drivers): the 3D bundle is never
  downloaded. A CSS molten-core poster follows the same choreography.
- **`prefers-reduced-motion`** or **no JS**: no film. The page is a normal
  stacked document with a still poster.
- **Performance**: Lighthouse mobile scores 100/100/100/100, with 0 ms TBT
  and 44 KB on first load. WebGL hydrates after the page has loaded.

## Generating artwork with your ComfyUI stack

Your loaders — `krea2_turbo_fp8_scaled` (UNet) · `qwen3vl_4b_fp8_scaled` (CLIP) ·
`qwen_image_vae` (VAE) — are a text-to-image pipeline for cinematic key art.
A starter API-format workflow is at `public/workflows/krea2-turbo-txt2img.json`
(import via ComfyUI's API-format workflow loader).

**Starting-point settings** (distilled turbo model — verify against the model card):
- Steps 6–10, CFG ~1.0, sampler `euler`, scheduler `simple`
- 1920×1080 for hero/showcase panels, 1600×2000 for portrait cards
- If latents come out wrong-shaped, swap `EmptyLatentImage` for the 16-channel
  empty-latent node matching the Qwen Image VAE

**Prompt direction for this aesthetic** — dark warm near-black backgrounds
(`#0a0908`), ember-orange rim light (`#e2552c`), volumetric glow, cinematic
vignette, film-grain-free clean renders (grain is added in post via CSS/canvas):

> `cinematic dark hero artwork, molten ember fissures in black volcanic stone,
>  warm orange rim light, deep shadows, volumetric glow, ultra detailed,
>  dark moody atmosphere, no text, no watermark`

Drop finished renders in `public/assets/` and uncomment the `<img>` in
`src/pages/index.astro` (the showcase slot is waiting at
`public/assets/showcase.jpg`).

## Project structure

```
src/
  pages/index.astro          # the stage: scenes + data attributes
  film/choreography.js       # the timeline: every keyframe + chapters
  film/project.js            # shared Theatre project, Lenis hand-off, Studio in dev
  scripts/film.js            # Lenis → playhead, DOM scenes, nav/focus, chapter rail
  components/Hero3D.jsx      # r3f-scroll-rig GlobalCanvas: core, embers, bloom
  directives/afterload.js    # client:afterload — after load, GPU-only hydration
  styles/global.css          # tokens, type, document mode + film mode
server.mjs                   # production static server (npm start)
public/
  assets/                    # your ComfyUI renders go here
  workflows/                 # ComfyUI workflow JSONs
```
