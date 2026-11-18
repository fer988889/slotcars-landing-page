import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!reduceMotion) {
  // 1) Scroll suave. Lenis avisa a ScrollTrigger en cada scroll.
  const lenis = new Lenis();
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);

  // 2) Parallax del hero: cada capa se mueve distinto mientras scrolleás.
  //    data-speed bajo = se mueve poco (parece lejos). Alto = se mueve mucho (parece cerca).
  gsap.utils.toArray<HTMLElement>('.hero [data-speed]').forEach((el) => {
    const speed = parseFloat(el.dataset.speed ?? '1');
    gsap.to(el, {
      yPercent: speed * 25,
      ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
    });
  });

  // 3) Parallax de fondo en una banda: el fondo se desplaza más lento que el contenido.
  gsap.utils.toArray<HTMLElement>('[data-bg-parallax]').forEach((el) => {
    gsap.fromTo(el, { yPercent: -15 }, {
      yPercent: 15,
      ease: 'none',
      scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });

  // 4) Aparición al entrar en pantalla.
  gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
    gsap.from(el, {
      y: 60, opacity: 0, duration: 0.9, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 85%' },
    });
  });
}
