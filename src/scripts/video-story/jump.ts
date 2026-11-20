import gsap from 'gsap';
import type { Direction, Scene, Step } from '../../types/video-story';
import { STORY_CONFIG as CONFIG } from './config';
import { hidePanel, restZoom, showPanel } from './effects';
import { copyCanvas, renderStill } from './still';
import { loadVideo, seekTo } from './video';

const RENDER_TIMEOUT_MS = 1500;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

interface JumpLayer {
  el: HTMLElement;
  zoom: HTMLElement;
  still: HTMLCanvasElement;
}

export function findJumpLayer(media: HTMLElement): JumpLayer | null {
  const el = media.querySelector<HTMLElement>('[data-jump]');
  const zoom = el?.querySelector<HTMLElement>('[data-jump-zoom]');
  const still = el?.querySelector<HTMLCanvasElement>('[data-jump-still]');
  if (!el || !zoom || !still) return null;
  gsap.set(el, { autoAlpha: 0 });
  gsap.set(still, { autoAlpha: 1 });
  return { el, zoom, still };
}

export function createSnapshots(steps: Step[]) {
  const images = new Map<Step, HTMLCanvasElement>();
  const allRendered = renderMissing();

  function save(step: Step) {
    const image = images.get(step) ?? document.createElement('canvas');
    copyCanvas(step.scene.still, image);
    images.set(step, image);
  }

  async function get(step: Step) {
    if (!images.has(step)) await Promise.race([allRendered, wait(RENDER_TIMEOUT_MS)]);
    return images.get(step) ?? renderFrom(step.scene.forward, step);
  }

  async function renderMissing() {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';

    for (const step of steps) {
      if (images.has(step)) continue;
      const src = step.scene.forward.currentSrc;
      if (video.src !== src) {
        video.src = src;
        if (!(await loadVideo(video))) continue;
      }
      await seekTo(video, step.time);
      if (!images.has(step)) images.set(step, renderFromCurrentFrame(video, step));
    }

    video.removeAttribute('src');
    video.load();
  }

  async function renderFrom(video: HTMLVideoElement, step: Step) {
    await seekTo(video, step.time);
    const image = renderFromCurrentFrame(video, step);
    images.set(step, image);
    return image;
  }

  function renderFromCurrentFrame(video: HTMLVideoElement, step: Step) {
    const image = document.createElement('canvas');
    renderStill(video, image, step.focus);
    return image;
  }

  return { save, get };
}

export function createJump(steps: Step[], layer: JumpLayer, snapshots: ReturnType<typeof createSnapshots>) {
  const scenes = [...new Set(steps.map((step) => step.scene))];

  return async function jump(from: Step, to: Step, direction: Direction) {
    hidePanel(from.panel, direction);
    const image = await snapshots.get(to);

    await coverWith(image, to);
    await placeUnderneath(image, to);
    gsap.set(layer.el, { autoAlpha: 0 });

    await showPanel(to.panel, direction);
  };

  function coverWith(image: HTMLCanvasElement, to: Step) {
    copyCanvas(image, layer.still);
    gsap.set(layer.zoom, restZoom(to.focus));
    return gsap.fromTo(layer.el, { autoAlpha: 0 }, { autoAlpha: 1, duration: CONFIG.jumpDuration, ease: 'power2.inOut' });
  }

  async function placeUnderneath(image: HTMLCanvasElement, to: Step) {
    const others = scenes.filter((scene) => scene !== to.scene);
    gsap.killTweensOf(scenes.flatMap((scene) => [scene.el, scene.zoom, scene.still]));

    others.forEach(resetScene);
    gsap.set(to.scene.el, { autoAlpha: 1, zIndex: 2, xPercent: 0, yPercent: 0, scale: 1 });
    gsap.set(to.scene.zoom, restZoom(to.focus));
    copyCanvas(image, to.scene.still);
    gsap.set(to.scene.still, { autoAlpha: 1 });

    await Promise.all([
      seekTo(to.scene.forward, to.time),
      ...others.map((scene) => seekTo(scene.forward, scene.start)),
    ]);
  }

  function resetScene(scene: Scene) {
    gsap.set(scene.el, { autoAlpha: 0, zIndex: 1, xPercent: 0, yPercent: 0, scale: 1 });
    gsap.set(scene.zoom, restZoom(null));
    gsap.set(scene.still, { autoAlpha: 0 });
  }
}
