/* The film: every scroll-driven value on the site, as keyframes on one timeline.
   Positions run 0 → LENGTH; scrolling the full page plays the timeline once.
   Each keyframe is [position, value] or [position, value, ease] where ease shapes the
   segment leaving that keyframe. Tune visually with Theatre Studio (`npm run dev`,
   then open /?studio), export, and save the file as src/film/state.json — it then
   takes precedence over this file. */

export const LENGTH = 10;
/* Viewport heights of scrolling needed to play the whole film. */
export const SCREENS = 8;

/* Where nav links and keyboard focus jump to. */
export const chapters = [
  { id: 'hero', label: 'Ember', at: 0 },
  { id: 'statement', label: 'Studio', at: 2.9 },
  { id: 'showcase', label: 'Work', at: 6.0 },
  { id: 'marquee', label: 'Craft', at: 7.8 },
  { id: 'contact', label: 'Contact', at: LENGTH },
];

/* A scene that rises in, holds, and lifts away. `rise` is in vh. */
const scene = (inFrom, inTo, outFrom, outTo, rise = 8) => ({
  opacity: [[inFrom, 0], [inTo, 1], [outFrom, 1], [outTo, 0]],
  y: [[inFrom, rise, 'out'], [inTo, 0], [outFrom, 0], [outTo, -rise]],
});
const enter = (from, to, rise = 8) => ({
  opacity: [[from, 0], [to, 1]],
  y: [[from, rise, 'out'], [to, 0]],
});

export const tracks = {
  /* ——— DOM scenes (props: opacity, y in vh, scale) ——— */
  'Hero / copy': {
    opacity: [[0, 1], [0.35, 1], [1.4, 0]],
    y: [[0, 0], [1.4, -10, 'in']],
    scale: [[0, 1], [1.4, 0.94]],
  },
  'Hero / cue': { opacity: [[0, 1], [0.5, 0]] },

  'Statement / heading': scene(1.3, 2.2, 3.6, 4.2),
  'Statement / body': scene(1.5, 2.5, 3.6, 4.2, 10),

  'Showcase / scene': scene(4.0, 4.7, 6.8, 7.3, 6),
  'Showcase / media': { scale: [[4.0, 1.18, 'linear'], [6.6, 1]] },
  'Showcase / caption': enter(4.6, 5.4),

  'Marquee / band': scene(7.1, 7.5, 8.2, 8.6, 12),

  'Contact / heading': enter(8.4, 9.2),
  'Contact / cta': enter(8.8, 9.5, 4),
  'Contact / bar': { opacity: [[9.2, 0], [9.8, 1]] },

  /* ——— WebGL stage (units are scene units; the core is ~1.4 radius) ——— */
  'Stage / Camera': {
    z: [[0, 5], [1.5, 3.6], [3, 4.4], [5, 5.2]],
  },
  /* Hero: front and centre → Statement: steps right of the copy → Showcase: hides
     behind the media panel, glow spilling round its edges → Marquee: small and high →
     Contact: rises from below the CTA like a sunrise. */
  'Stage / Core': {
    x: [[0, 0], [1.2, 0], [2.4, 1.7], [3.8, 1.7], [4.8, -1.3], [7.0, -1.3], [8.0, 0]],
    y: [[0, 0], [7.0, 0], [8.0, 1.2], [8.4, 1.2], [9.4, -2.6]],
    scale: [[0, 1], [1.5, 1.15], [3, 0.9], [4.8, 0.8], [7.0, 0.8], [8.0, 0.5], [8.4, 0.5], [9.4, 1.3]],
    glow: [[0, 0.35], [1.5, 0.6], [3.5, 0.35], [8.4, 0.35], [9.4, 0.7]],
  },
  'Stage / Embers': { opacity: [[0, 0.85], [4.5, 0.5], [9, 1]] },
  'Stage / Bloom': { intensity: [[0, 0.9], [9.5, 1.1]] },
};

/* ——— Conversion to Theatre's on-disk project state ——— */

// Bezier handles as [x1, y1, x2, y2] for the segment leaving a keyframe.
const EASES = {
  inOut: [0.5, 0, 0.5, 1],
  out: [0.16, 1, 0.3, 1],
  in: [0.7, 0, 0.84, 0],
  linear: [0.33, 0.33, 0.67, 0.67],
};

export function buildState(sheetId = 'Film') {
  const tracksByObject = {};
  let n = 0;
  for (const [objectKey, props] of Object.entries(tracks)) {
    const trackIdByPropPath = {};
    const trackData = {};
    for (const [prop, frames] of Object.entries(props)) {
      const trackId = `t${n++}`;
      trackIdByPropPath[JSON.stringify([prop])] = trackId;
      trackData[trackId] = {
        type: 'BasicKeyframedTrack',
        __debugName: `${objectKey}:${prop}`,
        keyframes: frames.map(([position, value, ease], i) => {
          const [x1, y1] = EASES[ease ?? 'inOut'];
          const prev = frames[i - 1];
          const [, , x2, y2] = EASES[prev?.[2] ?? 'inOut'];
          return {
            id: `${trackId}k${i}`,
            position,
            value,
            handles: [x2, y2, x1, y1],
            connectedRight: i < frames.length - 1,
            type: 'bezier',
          };
        }),
      };
    }
    tracksByObject[objectKey] = { trackIdByPropPath, trackData };
  }
  return {
    definitionVersion: '0.4.0',
    revisionHistory: [],
    sheetsById: {
      [sheetId]: {
        staticOverrides: { byObject: {} },
        sequence: { type: 'PositionalSequence', length: LENGTH, subUnitsPerUnit: 30, tracksByObject },
      },
    },
  };
}
