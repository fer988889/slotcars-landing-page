import Lenis from 'lenis';
import { initVideoStory } from './video-story/story';
history.scrollRestoration = 'manual';
window.scrollTo(0, 0);
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const scroll = prefersReducedMotion ? null : new Lenis({ autoRaf: true });
initVideoStory({ scroll }).finally(() => {
  document.documentElement.classList.remove('is-loading');
  const page = window as Window & { __pendingLink?: HTMLAnchorElement };
  const link = page.__pendingLink;
  page.__pendingLink = undefined;
  link?.click();
});
