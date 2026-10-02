/* The one Theatre project/sheet shared by the page script and the WebGL island.
   Theatre is ticked from Lenis' frame loop (see film.js) via `rafDriver`, so scroll
   input, timeline position, and every animated value land in the same frame. */
// @theatre/core is CommonJS: a default import works both in the browser and when Astro
// prerenders the island in Node (named imports fail there).
import theatre from '@theatre/core';

export const { types } = theatre;
const { getProject, createRafDriver } = theatre;
import { buildState } from './choreography.js';

export const rafDriver = createRafDriver({ name: 'film' });

const saved = Object.values(import.meta.glob('./state.json', { eager: true, import: 'default' }))[0];

let studio = Promise.resolve();
if (import.meta.env.DEV && typeof location !== 'undefined' && new URLSearchParams(location.search).has('studio')) {
  studio = import('@theatre/studio').then((m) => {
    // CommonJS under dynamic import: the API can sit one `default` deeper.
    const s = m.default?.initialize ? m.default : m.default.default;
    s.initialize({ __experimental_rafDriver: rafDriver });
  });
}

export const sheet = studio.then(() => getProject('Ember', { state: saved ?? buildState() }).sheet('Film'));

/* Objects touched by both the page script and the WebGL island must declare the same props. */
export const coreProps = {
  x: 0,
  y: 0,
  scale: types.number(1, { range: [0, 3] }),
  glow: types.number(0.35, { range: [0, 2] }),
};

/* The film's Lenis instance, created by film.js and bridged into r3f-scroll-rig by the island. */
let provide;
export const lenisReady = new Promise((resolve) => (provide = resolve));
export const provideLenis = (lenis) => provide(lenis);
