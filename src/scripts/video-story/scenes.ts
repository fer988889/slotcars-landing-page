import gsap from 'gsap';
import type { Focus, Scene, Step, Transition } from '../../types/video-story';
import { createPlayer } from './player';
import { getStopTimes } from './video';

export function findScenes(media: HTMLElement): Scene[] {
  return gsap.utils.toArray<HTMLElement>('[data-scene]', media).flatMap((el) => {
    const forward = el.querySelector<HTMLVideoElement>('[data-video="forward"]');
    const reverse = el.querySelector<HTMLVideoElement>('[data-video="reverse"]');
    const zoom = el.querySelector<HTMLElement>('[data-scene-zoom]');
    const still = el.querySelector<HTMLCanvasElement>('[data-still]');
    if (!forward || !zoom || !still) return [];
    return [{
      el,
      zoom,
      still,
      name: el.dataset.scene ?? '',
      forward,
      player: createPlayer(forward, reverse),
      transition: readTransition(el.dataset.transition),
      align: {
        x: Number(el.dataset.alignX ?? 0),
        y: Number(el.dataset.alignY ?? 0),
        scale: Number(el.dataset.alignScale ?? 1),
      },
    }];
  });
}

function readTransition(value: string | undefined): Transition {
  return value === 'zoom' || value === 'cut' ? value : 'fade';
}

export function readFocus(panel: HTMLElement): Focus | null {
  const { focusX, focusY } = panel.dataset;
  if (focusX === undefined || focusY === undefined) return null;
  return { x: Number(focusX) / 100, y: Number(focusY) / 100 };
}

export function buildSteps(scenes: Scene[], panels: HTMLElement[]): Step[] {
  return scenes.flatMap((scene, index) => {
    const scenePanels = panels.filter((panel) => panel.dataset.scene === scene.name);
    const times = getStopTimes(scene.forward, scenePanels.length, index === 0);
    return scenePanels.map((panel, i) => ({
      scene,
      panel,
      time: panel.dataset.time ? Number(panel.dataset.time) : times[i],
      focus: readFocus(panel),
    }));
  });
}
