/* Scroll choreography: Lenis smooth scroll + GSAP ScrollTrigger.
   Declarative API — sprinkle these data attributes in your Astro templates:
     [data-reveal]        fade-up on enter
     [data-speed="0.3"]    parallax (0 = fixed feel, 1 = normal scroll speed)
     [data-split-chars]   hero-style letter-by-letter assembly on load
     [data-pin]           pin the section and scrub its inner timeline
*/
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* — Buttery smooth scroll, wired into GSAP's ticker — */
let lenis = null;
if (!reduceMotion) {
  lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

/* — Letter-by-letter split (preserves nested tags like <em>) — */
function splitNode(node) {
  if (node.nodeType === 3) {
    const frag = document.createDocumentFragment();
    [...node.textContent].forEach((ch) => {
      const s = document.createElement('span');
      s.className = 'char';
      s.setAttribute('aria-hidden', 'true');
      s.textContent = ch === ' ' ? ' ' : ch;
      frag.appendChild(s);
    });
    node.replaceWith(frag);
  } else if (node.nodeType === 1) {
    [...node.childNodes].forEach(splitNode);
  }
}

document.querySelectorAll('[data-split-chars]').forEach((el) => {
  el.setAttribute('aria-label', el.textContent.trim());
  splitNode(el);
  if (!reduceMotion) {
    gsap.fromTo(
      el.querySelectorAll('.char'),
      { yPercent: 120 },
      { yPercent: 0, duration: 1.1, ease: 'power4.out', stagger: 0.022, delay: 0.35 }
    );
  }
});

/* — Fade-up reveals — */
gsap.utils.toArray('[data-reveal]').forEach((el) => {
  gsap.fromTo(
    el,
    { y: 44, opacity: 0 },
    {
      y: 0,
      opacity: 1,
      duration: reduceMotion ? 0 : 1,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%' },
    }
  );
});

/* — Parallax layers — */
if (!reduceMotion) {
  gsap.utils.toArray('[data-speed]').forEach((el) => {
    const speed = parseFloat(el.dataset.speed || '0.5');
    gsap.to(el, {
      yPercent: (1 - speed) * -18,
      ease: 'none',
      scrollTrigger: {
        trigger: el.closest('section') || el,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
      },
    });
  });
}

/* — Pinned, scrubbed showcase — */
const pin = document.querySelector('[data-pin]');
if (pin && !reduceMotion) {
  const tl = gsap.timeline({
    scrollTrigger: { trigger: pin, start: 'top top', end: '+=180%', pin: true, scrub: 1 },
  });
  tl.fromTo('[data-pin-media]', { scale: 1.18 }, { scale: 1, ease: 'none', duration: 1 }, 0).fromTo(
    '[data-pin-caption]',
    { y: 70, opacity: 0 },
    { y: 0, opacity: 1, ease: 'none', duration: 0.6 },
    0.15
  );
}

/* Refresh triggers once webfonts / images settle */
window.addEventListener('load', () => ScrollTrigger.refresh());
