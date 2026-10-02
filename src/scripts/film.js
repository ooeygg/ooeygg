/* The film runtime: Lenis turns wheel/touch/keys into one heavy, smoothed progress
   value; that progress scrubs the Theatre timeline; Theatre drives every scene.
   Nothing on the page ever scrolls — the stage is fixed and scenes play in place.

   Markup API:
     [data-film="Sheet / object"]  element animated by that object (opacity, y in vh, scale)
     [data-chapter="id"]           focusing inside it plays the film to that chapter
     a[href="#id"]                 plays the film to chapter `id`
     [data-split-chars]            letter-by-letter assembly on load
   Film mode is switched on before first paint by an inline script in index.astro
   (html.is-film); without it (reduced motion, no JS) the page is a normal document. */
import Lenis from 'lenis';
import { sheet as sheetReady, rafDriver, coreProps, provideLenis, types } from '../film/project.js';
import { LENGTH, chapters } from '../film/choreography.js';

const film = document.documentElement.classList.contains('is-film');

/* — Letter-by-letter headline assembly (Web Animations, no library) — */
function splitNode(node) {
  if (node.nodeType === 3) {
    // Words are unbreakable boxes of letters; the spaces between them stay real spaces.
    const frag = document.createDocumentFragment();
    for (const token of node.textContent.split(/(\s+)/)) {
      if (!token) continue;
      if (/^\s+$/.test(token)) {
        frag.append(' ');
        continue;
      }
      const word = document.createElement('span');
      word.className = 'word';
      word.setAttribute('aria-hidden', 'true');
      for (const ch of token) {
        const s = document.createElement('span');
        s.className = 'char';
        s.textContent = ch;
        word.appendChild(s);
      }
      frag.appendChild(word);
    }
    node.replaceWith(frag);
  } else if (node.nodeType === 1) {
    [...node.childNodes].forEach(splitNode);
  }
}
let charIndex = 0;
for (const el of film ? document.querySelectorAll('[data-split-chars]') : []) {
  const label = document.createElement('span');
  label.className = 'sr-only';
  label.textContent = el.textContent.trim();
  splitNode(el);
  el.prepend(label);
  for (const ch of el.querySelectorAll('.char')) {
    ch.animate([{ transform: 'translateY(120%)' }, { transform: 'translateY(0)' }], {
      duration: 1100,
      delay: 350 + charIndex++ * 22,
      easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
      fill: 'backwards',
    });
  }
}

if (film) {
  const sheet = await sheetReady;
  const { sequence } = sheet;

  /* — DOM scenes — */
  const sceneProps = {
    opacity: types.number(1, { range: [0, 1] }),
    y: types.number(0, { range: [-40, 40] }),
    scale: types.number(1, { range: [0.5, 1.5] }),
  };
  for (const el of document.querySelectorAll('[data-film]')) {
    sheet.object(el.dataset.film, sceneProps).onValuesChange(({ opacity, y, scale }) => {
      el.style.opacity = opacity;
      el.style.transform = `translate3d(0, ${y}vh, 0) scale(${scale})`;
      // Invisible scenes must not catch clicks meant for the visible one.
      el.style.pointerEvents = opacity < 0.05 ? 'none' : '';
    }, rafDriver);
  }

  /* — The CSS poster core follows the WebGL core (and stands in for it without a GPU) — */
  const posterCore = document.querySelector('.hero-poster-core');
  sheet.object('Stage / Core', coreProps).onValuesChange(({ x, y, scale }) => {
    // ~26vh per scene unit at the default camera distance
    posterCore.style.transform = `translate3d(${x * 26}vh, ${-y * 26}vh, 0) scale(${scale})`;
  }, rafDriver);

  /* — Scroll → timeline, all in one frame — */
  const lenis = new Lenis({
    lerp: 0.075,
    wheelMultiplier: 0.85,
    syncTouch: true,
    syncTouchLerp: 0.075,
    touchInertiaExponent: 1.7,
  });
  provideLenis(lenis);

  const rail = document.querySelector('.film-progress');
  const railFill = rail.querySelector('.film-progress-fill');
  const railLabel = rail.querySelector('.film-progress-label');
  let shownChapter;

  function frame(time) {
    lenis.raf(time);
    const progress = lenis.limit ? Math.min(Math.max(lenis.animatedScroll / lenis.limit, 0), 1) : 0;
    sequence.position = progress * LENGTH;
    rafDriver.tick(time);
    railFill.style.transform = `scaleX(${progress})`;
    const chapter = chapters.findLast((c) => sequence.position >= c.at - 0.6) ?? chapters[0];
    if (chapter !== shownChapter) {
      shownChapter = chapter;
      railLabel.textContent = `${String(chapters.indexOf(chapter) + 1).padStart(2, '0')} — ${chapter.label}`;
      // The last chapter's footer bar owns the bottom edge.
      rail.classList.toggle('is-done', chapter === chapters.at(-1));
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  const play = (id, immediate = false) => {
    const chapter = chapters.find((c) => c.id === id);
    if (chapter) lenis.scrollTo((chapter.at / LENGTH) * lenis.limit, { duration: 2.2, immediate });
  };

  /* — In-page links play the film to a chapter instead of jumping — */
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    e.preventDefault();
    play(link.getAttribute('href').slice(1) || 'hero');
  });

  /* — Tabbing into a scene plays the film to it, so focus never lands on something invisible — */
  document.addEventListener('focusin', (e) => {
    const scene = e.target.closest('[data-chapter]');
    if (scene) play(scene.dataset.chapter);
  });

  if (location.hash) play(location.hash.slice(1), true);
}
