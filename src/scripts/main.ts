import Lenis from 'lenis';
import { initVideoStory } from './video-story/story';

// Siempre arranca arriba: si el navegador restaura la posición (ej. al recargar estando en Contacto),
// los videos bloquean el scroll con la página a mitad de camino y queda trabada.
history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const scroll = prefersReducedMotion ? null : new Lenis({ autoRaf: true });
initVideoStory({ scroll });
