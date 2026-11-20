import gsap from 'gsap';
import type { Direction, Focus, Scene, Transition } from '../../types/video-story';
import { STORY_CONFIG as CONFIG } from './config';
import { renderStill } from './still';

export function showPanel(panel: HTMLElement, direction: Direction) {
  return gsap.fromTo(
    panel,
    { autoAlpha: 0, y: 40 * direction },
    { autoAlpha: 1, y: 0, duration: CONFIG.panelDuration },
  );
}

export function hidePanel(panel: HTMLElement, direction: Direction) {
  return gsap.to(panel, { autoAlpha: 0, y: -40 * direction, duration: CONFIG.panelDuration });
}

export function showStill(scene: Scene, focus: Focus | null, delay = 0) {
  renderStill(scene.forward, scene.still, focus);
  return gsap.to(scene.still, { autoAlpha: 1, duration: CONFIG.stillFadeIn, delay });
}

export function hideStill(scene: Scene) {
  return gsap.to(scene.still, { autoAlpha: 0, duration: CONFIG.stillFadeOut });
}

export function zoomToFocus(scene: Scene, travelSeconds: number) {
  const duration = Math.min(CONFIG.focusDuration, Math.max(travelSeconds, 0.3));
  return gsap.to(scene.zoom, {
    scale: CONFIG.focusZoom,
    xPercent: CONFIG.focusShiftX,
    duration,
    delay: Math.max(0, travelSeconds - duration),
    ease: 'power2.inOut',
    overwrite: 'auto',
  });
}

export function zoomOut(scene: Scene, travelSeconds: number) {
  return gsap.to(scene.zoom, {
    scale: 1,
    xPercent: 0,
    duration: Math.min(CONFIG.focusDuration, Math.max(travelSeconds, 0.3)),
    ease: 'power2.inOut',
    overwrite: 'auto',
  });
}

export function restZoom(focus: Focus | null) {
  return focus ? { scale: CONFIG.focusZoom, xPercent: CONFIG.focusShiftX } : { scale: 1, xPercent: 0 };
}

export function transitionScenes(from: Scene, to: Scene, type: Transition) {
  gsap.set(from.el, { zIndex: 1 });
  gsap.set(to.el, { zIndex: 2 });
  const hideFrom = () => gsap.set(from.el, { autoAlpha: 0, scale: 1, xPercent: 0, yPercent: 0 });

  if (type === 'cut') {
    const { x, y, scale } = to.align;
    return gsap.fromTo(
      to.el,
      { autoAlpha: 1, xPercent: x, yPercent: y, scale },
      { xPercent: 0, yPercent: 0, scale: 1, duration: CONFIG.alignDuration, ease: 'power2.out', onComplete: hideFrom },
    );
  }

  if (type === 'zoom') {
    const scale = CONFIG.zoomTransitionScale;
    return gsap
      .timeline({ defaults: { duration: CONFIG.zoomTransition, ease: 'power2.inOut' }, onComplete: hideFrom })
      .fromTo(to.el, { autoAlpha: 0, scale }, { autoAlpha: 1, scale: 1 })
      .to(from.el, { scale }, 0);
  }

  return gsap
    .timeline({ onComplete: hideFrom })
    .fromTo(to.el, { autoAlpha: 0 }, { autoAlpha: 1, duration: CONFIG.fadeTransition, ease: 'none' });
}
