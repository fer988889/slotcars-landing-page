import gsap from 'gsap';
import type { Direction, Scene, Step } from '../../types/video-story';
import { STORY_CONFIG as CONFIG } from './config';
import { hidePanel, restZoom, showPanel } from './effects';
import { copyCanvas, renderStill } from './still';
import { loadVideo, seekTo } from './video';

interface JumpLayer {
  el: HTMLElement;
  zoom: HTMLElement;
  still: HTMLCanvasElement;
}

export type Snapshots = ReturnType<typeof createSnapshots>;
export type Jumper = ReturnType<typeof createJumper>;

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
  renderMissing();

  function save(step: Step) {
    const image = images.get(step) ?? document.createElement('canvas');
    copyCanvas(step.scene.still, image);
    images.set(step, image);
  }

  function find(step: Step) {
    return images.get(step) ?? null;
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
      if (images.has(step)) continue;
      const image = document.createElement('canvas');
      renderStill(video, image, step.focus);
      images.set(step, image);
    }

    video.removeAttribute('src');
    video.load();
  }

  return { save, find };
}

export function createJumper(steps: Step[], layer: JumpLayer, snapshots: Snapshots) {
  const scenes = [...new Set(steps.map((step) => step.scene))];
  const panels = steps.map((step) => step.panel);

  function stop() {
    scenes.forEach((scene) => scene.forward.pause());
    gsap.killTweensOf([layer.el, ...panels, ...scenes.flatMap((scene) => [scene.el, scene.zoom, scene.still])]);
  }

  async function jump(from: Step, to: Step, direction: Direction, isCancelled: () => boolean) {
    panels.filter((panel) => panel !== to.panel).forEach((panel) => hidePanel(panel, direction));
    const snapshot = snapshots.find(to);

    paintLayer(from, to, snapshot);
    await fadeLayer(1);
    if (isCancelled()) return;
    showPanel(to.panel, direction);

    await placeUnderneath(to);
    if (isCancelled()) return;
    paintStill(to, snapshot);
    if (snapshot) gsap.set(layer.el, { autoAlpha: 0 });
    else await fadeLayer(0);
  }

  function paintLayer(from: Step, to: Step, snapshot: HTMLCanvasElement | null) {
    if (snapshot) {
      copyCanvas(snapshot, layer.still);
      gsap.set(layer.zoom, restZoom(to.focus));
      return;
    }
    renderStill(from.scene.forward, layer.still, null);
    gsap.set(layer.zoom, {
      scale: gsap.getProperty(from.scene.zoom, 'scale'),
      xPercent: gsap.getProperty(from.scene.zoom, 'xPercent'),
    });
  }

  function paintStill(to: Step, snapshot: HTMLCanvasElement | null) {
    if (snapshot) copyCanvas(snapshot, to.scene.still);
    else renderStill(to.scene.forward, to.scene.still, to.focus);
    gsap.set(to.scene.still, { autoAlpha: 1 });
    if (!snapshot) snapshots.save(to);
  }

  function fadeLayer(autoAlpha: 0 | 1) {
    return gsap.to(layer.el, { autoAlpha, duration: CONFIG.jumpDuration, ease: 'power2.inOut' });
  }

  async function placeUnderneath(to: Step) {
    const others = scenes.filter((scene) => scene !== to.scene);
    others.forEach(resetScene);
    gsap.set(to.scene.el, { autoAlpha: 1, zIndex: 2, xPercent: 0, yPercent: 0, scale: 1 });
    gsap.set(to.scene.zoom, restZoom(to.focus));

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

  return { jump, stop };
}
