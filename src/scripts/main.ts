import Lenis from 'lenis';
import { initVideoStory } from './video-story/story';

history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const scroll = prefersReducedMotion ? null : new Lenis({ autoRaf: true });

initVideoStory({ scroll });
