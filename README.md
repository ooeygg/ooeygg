# Ember — Immersive Starter

A free & open-source starter for cinematic, scroll-driven websites in the
Aalto Digital Atelier vein: WebGL hero, buttery scroll, pinned scrubbed
sections, editorial type. Nothing here costs money; every layer is MIT /
open-source / gratis.

## The stack

| Layer | Tool | License |
|---|---|---|
| Framework | [Astro](https://astro.build) — static-first, islands | MIT |
| 3D islands | React + [@react-three/fiber](https://r3f.docs.pmnd.rs) + [drei](https://drei.docs.pmnd.rs) | MIT |
| Scroll animation | [GSAP + ScrollTrigger](https://gsap.com) (all plugins free) | Free |
| Smooth scroll | [Lenis](https://lenis.darkroom.engineering) | MIT |
| Imagery | Your own ComfyUI pipeline (see below) | Yours |

**Why Astro over Next.js here:** this is a cinematic marketing site, not an app.
Astro ships zero JS by default and hydrates only the islands you mark —
the WebGL hero mounts with `client:visible`, everything else is static HTML.
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
npm run dev      # → http://localhost:4321
npm run build    # static output in dist/
npm run preview
```

Deploy `dist/` anywhere static: Vercel, Netlify, Cloudflare Pages, GitHub Pages.

## What's wired up

- **Hero** — R3F canvas island (ember particles + molten distorted core,
  bloom + vignette post-processing), letter-by-letter headline assembly,
  scroll cue. The island only hydrates when scrolled into view.
- **Statement** — two-column editorial section, fade-up reveals.
- **Pinned showcase** — section pins for 180% of viewport while a GSAP
  timeline scrubs the media zoom-out and caption rise.
- **Marquee** — infinite outlined-type ticker.
- **Footer** — big CTA + footer bar.

### The animation API (all in `src/scripts/scroll.js`)

Sprinkle data attributes in any `.astro` template:

- `data-reveal` — fade-up on enter
- `data-speed="0.3"` — parallax layer (0 = fixed feel, 1 = normal)
- `data-split-chars` — hero-style letter assembly on load (keeps nested `<em>`)
- `data-pin` on a section — pins it; `[data-pin-media]` / `[data-pin-caption]`
  inside get scrubbed automatically

`prefers-reduced-motion` is respected: Lenis smoothing, parallax, pinning and
splits all stand down.

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
`src/pages/index.astro` (the pinned showcase slot is waiting at
`public/assets/showcase.jpg`).

## Project structure

```
src/
  pages/index.astro        # the demo page — sections + data attributes
  components/Hero3D.jsx    # R3F island (client:visible)
  scripts/scroll.js        # Lenis + GSAP wiring, the data-attribute API
  styles/global.css        # tokens, type, sections, marquee
public/
  assets/                  # your ComfyUI renders go here
  workflows/               # ComfyUI workflow JSONs
```
