import gsap from 'gsap';
import type Lenis from 'lenis';
import type { Direction, Focus, Scene, Step, StoryOptions } from '../../types/video-story';
import { STORY_CONFIG as CONFIG } from './config';
import { hidePanel, hideStill, showPanel, showStill, transitionScenes, zoomOut, zoomToFocus } from './effects';
import { listenScrollGestures } from './gestures';
import { createJumper, createSnapshots, findJumpLayer, type Jumper, type Snapshots } from './jump';
import { buildSteps, findScenes, readFocus } from './scenes';
import { endTime, loadVideo, seekTo, whenTimeReaches } from './video';

const PAGE_SCROLL_DURATION = 1.2;

export async function initVideoStory({ scroll }: StoryOptions) {
  const story = document.querySelector<HTMLElement>('[data-story]');
  const media = story?.querySelector<HTMLElement>('[data-story-media]');
  const jumpLayer = media ? findJumpLayer(media) : null;
  if (!story || !media || !jumpLayer) return;

  const scenes = findScenes(media);
  const panels = gsap.utils.toArray<HTMLElement>('[data-panel]', story);
  if (scenes.length === 0 || panels.length === 0) return;

  gsap.set(scenes.slice(1).map((scene) => scene.el), { autoAlpha: 0 });
  const allLoaded = Promise.all(scenes.map((scene) => loadVideo(scene.forward)));
  if (!(await loadVideo(scenes[0].forward))) return;
  await seekTo(scenes[0].forward, scenes[0].start);

  const firstFocus = readFocus(panels[0]);
  if (!scroll) {
    showStill(scenes[0], firstFocus).progress(1);
    gsap.set(panels[0], { autoAlpha: 1 });
    return;
  }

  let pendingTarget: HTMLElement | null = null;
  let navigateTo = (target: HTMLElement) => {
    pendingTarget = target;
    if (!isStoryPanel(target)) scrollOutOfStory(scroll, target);
  };
  listenAnchorLinks((target) => navigateTo(target));

  scroll.stop();
  playIntro(scenes[0], panels[0], firstFocus);

  const loaded = await allLoaded;
  const steps = buildSteps(scenes.filter((_, i) => loaded[i]), panels);
  const snapshots = createSnapshots(steps);
  snapshots.save(steps[0]);
  const jumper = createJumper(steps, jumpLayer, snapshots);
  navigateTo = startNavigation(story, scroll, steps, snapshots, jumper);
  if (pendingTarget) navigateTo(pendingTarget);
}

async function playIntro(scene: Scene, panel: HTMLElement, focus: Focus | null) {
  await showStill(scene, focus, CONFIG.introDelay);
  await showPanel(panel, 1);
}

function isStoryPanel(target: HTMLElement) {
  return target.matches('[data-panel]');
}

function scrollOutOfStory(scroll: Lenis, target: HTMLElement | number) {
  scroll.start();
  scroll.scrollTo(target, { duration: PAGE_SCROLL_DURATION });
}

function listenAnchorLinks(onLink: (target: HTMLElement) => void) {
  document.addEventListener('click', (event) => {
    const link = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
    const target = link?.hash ? document.querySelector<HTMLElement>(link.hash) : null;
    if (!target) return;
    event.preventDefault();
    onLink(target);
  });
}

type StepAnimation = (from: Step, to: Step, isCancelled: () => boolean) => Promise<void>;

function startNavigation(story: HTMLElement, scroll: Lenis, steps: Step[], snapshots: Snapshots, jumper: Jumper) {
  const lastStep = steps.length - 1;
  let currentStep = 0;
  let isAnimating = false;
  let hasLeftStory = false;
  let activeRun = 0;
  let returning: Promise<void> | null = null;

  const gestures = listenScrollGestures(onGesture);
  scroll.on('scroll', onPageScroll);

  return navigateTo;

  function onGesture(direction: Direction) {
    if (isAnimating) return;
    const target = currentStep + direction;
    if (target > lastStep) releaseScroll();
    else if (direction === 1) runStep(target, playForward);
    else if (target >= 0) runStep(target, (from, to, isCancelled) => jumper.jump(from, to, -1, isCancelled));
  }

  async function navigateTo(target: HTMLElement) {
    if (!isStoryPanel(target)) {
      if (gestures.isEnabled()) releaseScroll(target);
      else scroll.scrollTo(target, { duration: PAGE_SCROLL_DURATION });
      return;
    }

    const stepIndex = steps.findIndex((step) => step.panel === target);
    if (stepIndex === -1) return;

    const run = ++activeRun;
    if (!gestures.isEnabled()) await returnToStory(PAGE_SCROLL_DURATION, false);
    if (run !== activeRun) return;
    if (stepIndex === currentStep && !isAnimating) return;

    jumper.stop();
    const direction: Direction = stepIndex >= currentStep ? 1 : -1;
    await runStep(stepIndex, (from, to, isCancelled) => jumper.jump(from, to, direction, isCancelled));
  }

  async function runStep(target: number, animate: StepAnimation) {
    const run = ++activeRun;
    const isCancelled = () => run !== activeRun;

    isAnimating = true;
    await animate(steps[currentStep], steps[target], isCancelled);
    if (isCancelled()) return;

    currentStep = target;
    isAnimating = false;
    gestures.reset();
  }

  async function playForward(from: Step, to: Step, isCancelled: () => boolean) {
    hidePanel(from.panel, 1);
    hideStill(from.scene);

    if (from.scene === to.scene) await travel(from, to);
    else await changeScene(from, to, isCancelled);
    if (isCancelled()) return;

    showStill(to.scene, to.focus);
    snapshots.save(to);
    await showPanel(to.panel, 1);
  }

  function travel(from: Step | null, to: Step) {
    const { scene } = to;
    const seconds = Math.abs(scene.forward.currentTime - to.time) / CONFIG.playbackRate;
    if (from?.focus) zoomOut(scene, seconds);
    if (to.focus) zoomToFocus(scene, seconds);
    return scene.player.playForwardTo(to.time);
  }

  async function changeScene(from: Step, to: Step, isCancelled: () => boolean) {
    const out = from.scene;
    const end = endTime(out.forward);
    const type = to.scene.transition;
    const overlap = type === 'cut' ? 0 : type === 'zoom' ? CONFIG.zoomTransition : CONFIG.fadeTransition;
    if (from.focus) zoomOut(out, (end - out.forward.currentTime) / CONFIG.playbackRate);

    const finishing = out.player.playForwardTo(end);
    await whenTimeReaches(out.forward, end - overlap * CONFIG.playbackRate);
    if (isCancelled()) return;
    const transition = transitionScenes(out, to.scene, type);
    const arriving = travel(null, to);
    await transition;
    await Promise.all([finishing, arriving]);
  }

  function releaseScroll(target: HTMLElement | number = story.offsetHeight) {
    const hasContentBelow = document.documentElement.scrollHeight > window.innerHeight + 1;
    if (!hasContentBelow) return;
    gestures.disable();
    scrollOutOfStory(scroll, target);
  }

  function onPageScroll() {
    if (gestures.isEnabled() || returning) return;
    if (scroll.scroll > story.offsetHeight / 2) hasLeftStory = true;
    const isNearStory = scroll.scroll < story.offsetHeight * CONFIG.returnThreshold;
    if (hasLeftStory && isNearStory && scroll.direction === -1) returnToStory(CONFIG.returnDuration, true);
  }

  function returnToStory(duration: number, keepCurrentGesture: boolean) {
    returning ??= scrollBackToStory(duration, keepCurrentGesture).finally(() => {
      returning = null;
    });
    return returning;
  }

  async function scrollBackToStory(duration: number, keepCurrentGesture: boolean) {
    scroll.stop();
    const position = { y: window.scrollY };
    await gsap.to(position, {
      y: 0,
      duration,
      ease: 'power2.out',
      onUpdate: () => window.scrollTo(0, position.y),
    });
    hasLeftStory = false;
    gestures.enable(keepCurrentGesture);
  }
}
