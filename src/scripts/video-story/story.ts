import gsap from 'gsap';
import type Lenis from 'lenis';
import type { Direction, Step, StoryOptions } from '../../types/video-story';
import { STORY_CONFIG as CONFIG } from './config';
import { hidePanel, hideStill, showPanel, showStill, transitionScenes, zoomOut, zoomToFocus } from './effects';
import { listenScrollGestures } from './gestures';
import { buildSteps, findScenes, readFocus } from './scenes';
import { endTime, loadVideo, whenTimeReaches } from './video';

export async function initVideoStory({ scroll }: StoryOptions) {
  const story = document.querySelector<HTMLElement>('[data-story]');
  const media = story?.querySelector<HTMLElement>('[data-story-media]');
  if (!story || !media) return;

  const scenes = findScenes(media);
  const panels = gsap.utils.toArray<HTMLElement>('[data-panel]', story);
  if (scenes.length === 0 || panels.length === 0) return;

  gsap.set(scenes.slice(1).map((scene) => scene.el), { autoAlpha: 0 });
  const allLoaded = Promise.all(scenes.map((scene) => loadVideo(scene.forward)));
  if (!(await loadVideo(scenes[0].forward))) return;

  const firstFocus = readFocus(panels[0]);
  if (!scroll) {
    showStill(scenes[0], firstFocus).progress(1);
    gsap.set(panels[0], { autoAlpha: 1 });
    return;
  }

  let goToSection: ((section: HTMLElement) => void) | null = null;
  document.addEventListener('click', (event) => {
    const link = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
    const section = link?.hash ? document.querySelector<HTMLElement>(link.hash) : null;
    if (!section) return;
    event.preventDefault();
    goToSection?.(section);
  });

  scroll.stop();
  await showStill(scenes[0], firstFocus, CONFIG.introDelay);
  await showPanel(panels[0], 1);

  const loaded = await allLoaded;
  const usable = scenes.filter((_, i) => loaded[i]);
  goToSection = startNavigation(story, scroll, buildSteps(usable, panels));
}

function startNavigation(story: HTMLElement, scroll: Lenis, steps: Step[]) {
  const lastStep = steps.length - 1;
  let currentStep = 0;
  let isAnimating = false;

  const gestures = listenScrollGestures(onGesture);

  function onGesture(direction: Direction) {
    if (isAnimating) return;
    const target = currentStep + direction;
    if (target > lastStep) releaseScroll();
    else if (target >= 0) goToStep(target);
  }

  async function goToStep(target: number) {
    isAnimating = true;
    const from = steps[currentStep];
    const to = steps[target];
    const direction: Direction = target > currentStep ? 1 : -1;

    hidePanel(from.panel, direction);
    hideStill(from.scene);

    if (from.scene === to.scene) await travel(from, to, direction);
    else await changeScene(from, to, direction);

    showStill(to.scene, to.focus);
    await showPanel(to.panel, direction);

    currentStep = target;
    isAnimating = false;
    gestures.reset();
  }

  function travel(from: Step | null, to: Step, direction: Direction) {
    const { scene } = to;
    const rate = direction === 1 ? CONFIG.playbackRate : CONFIG.reverseRate;
    const seconds = Math.abs(scene.forward.currentTime - to.time) / rate;
    if (from?.focus) zoomOut(scene, seconds);
    if (to.focus) zoomToFocus(scene, seconds);
    return direction === 1 ? scene.player.playForwardTo(to.time) : scene.player.playBackwardTo(to.time);
  }

  async function changeScene(from: Step, to: Step, direction: Direction) {
    const out = from.scene;

    if (direction === 1) {
      const end = endTime(out.forward);
      const type = to.scene.transition;
      const overlap = type === 'cut' ? 0 : type === 'zoom' ? CONFIG.zoomTransition : CONFIG.fadeTransition;
      if (from.focus) zoomOut(out, (end - out.forward.currentTime) / CONFIG.playbackRate);

      const finishing = out.player.playForwardTo(end);
      await whenTimeReaches(out.forward, end - overlap * CONFIG.playbackRate);
      const transition = transitionScenes(out, to.scene, type, 1);
      const arriving = travel(null, to, 1);
      await transition;
      await Promise.all([finishing, arriving]);
      return;
    }

    if (from.focus) zoomOut(out, out.forward.currentTime / CONFIG.reverseRate);
    await out.player.playBackwardTo(0);
    const transition = transitionScenes(out, to.scene, out.transition === 'cut' ? 'cut' : 'fade', -1);
    const arriving = travel(null, to, -1);
    await transition;
    await arriving;
  }

  function releaseScroll(target: HTMLElement | number = story.offsetHeight) {
    const hasContentBelow = document.documentElement.scrollHeight > window.innerHeight + 1;
    if (!hasContentBelow) return;
    gestures.disable();
    scroll.start();
    scroll.scrollTo(target, { duration: 1.2 });
  }

  let hasLeftStory = false;
  let isReturning = false;
  scroll.on('scroll', () => {
    if (gestures.isEnabled() || isReturning) return;
    if (scroll.scroll > story.offsetHeight / 2) hasLeftStory = true;
    const isNearStory = scroll.scroll < story.offsetHeight * CONFIG.returnThreshold;
    if (!hasLeftStory || !isNearStory || scroll.direction !== -1) return;

    isReturning = true;
    scroll.stop();
    const position = { y: window.scrollY };
    gsap.to(position, {
      y: 0,
      duration: CONFIG.returnDuration,
      ease: 'power2.out',
      onUpdate: () => window.scrollTo(0, position.y),
      onComplete: () => {
        isReturning = false;
        hasLeftStory = false;
        gestures.enable(true);
      },
    });
  });

  return (section: HTMLElement) => {
    if (isAnimating || isReturning) return;
    if (gestures.isEnabled()) releaseScroll(section);
    else scroll.scrollTo(section, { duration: 1.2 });
  };
}
