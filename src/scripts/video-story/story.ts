import gsap from 'gsap';
import type Lenis from 'lenis';
import type { Direction, Step, StoryOptions } from '../../types/video-story';
import { STORY_CONFIG as CONFIG } from './config';
import { hidePanel, hideStill, showPanel, showStill, transitionScenes, zoomOut, zoomToFocus } from './effects';
import { listenScrollGestures } from './gestures';
import { createJump, createSnapshots, findJumpLayer } from './jump';
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

  let navigateTo: ((target: HTMLElement) => void) | null = null;
  listenAnchorLinks((target) => navigateTo?.(target));

  scroll.stop();
  await showStill(scenes[0], firstFocus, CONFIG.introDelay);
  await showPanel(panels[0], 1);

  const loaded = await allLoaded;
  const steps = buildSteps(scenes.filter((_, i) => loaded[i]), panels);
  const snapshots = createSnapshots(steps);
  snapshots.save(steps[0]);
  navigateTo = startNavigation(story, scroll, steps, snapshots, createJump(steps, jumpLayer, snapshots));
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

type Snapshots = ReturnType<typeof createSnapshots>;
type Jump = ReturnType<typeof createJump>;

function startNavigation(story: HTMLElement, scroll: Lenis, steps: Step[], snapshots: Snapshots, jump: Jump) {
  const lastStep = steps.length - 1;
  let currentStep = 0;
  let isAnimating = false;
  let isReturning = false;
  let hasLeftStory = false;

  const gestures = listenScrollGestures(onGesture);
  scroll.on('scroll', onPageScroll);

  return navigateTo;

  function onGesture(direction: Direction) {
    if (isAnimating) return;
    const target = currentStep + direction;
    if (target > lastStep) releaseScroll();
    else if (direction === 1) runStep(target, playForward);
    else if (target >= 0) runStep(target, (from, to) => jump(from, to, -1));
  }

  async function navigateTo(target: HTMLElement) {
    if (isAnimating || isReturning) return;

    const stepIndex = steps.findIndex((step) => step.panel === target);
    if (stepIndex === -1) {
      if (gestures.isEnabled()) releaseScroll(target);
      else scroll.scrollTo(target, { duration: PAGE_SCROLL_DURATION });
      return;
    }

    if (!gestures.isEnabled()) await returnToStory(PAGE_SCROLL_DURATION, false);
    if (stepIndex === currentStep) return;
    const direction: Direction = stepIndex > currentStep ? 1 : -1;
    await runStep(stepIndex, (from, to) => jump(from, to, direction));
  }

  async function runStep(target: number, animate: (from: Step, to: Step) => Promise<void>) {
    isAnimating = true;
    await animate(steps[currentStep], steps[target]);
    currentStep = target;
    isAnimating = false;
    gestures.reset();
  }

  async function playForward(from: Step, to: Step) {
    hidePanel(from.panel, 1);
    hideStill(from.scene);

    if (from.scene === to.scene) await travel(from, to);
    else await changeScene(from, to);

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

  async function changeScene(from: Step, to: Step) {
    const out = from.scene;
    const end = endTime(out.forward);
    const type = to.scene.transition;
    const overlap = type === 'cut' ? 0 : type === 'zoom' ? CONFIG.zoomTransition : CONFIG.fadeTransition;
    if (from.focus) zoomOut(out, (end - out.forward.currentTime) / CONFIG.playbackRate);

    const finishing = out.player.playForwardTo(end);
    await whenTimeReaches(out.forward, end - overlap * CONFIG.playbackRate);
    const transition = transitionScenes(out, to.scene, type);
    const arriving = travel(null, to);
    await transition;
    await Promise.all([finishing, arriving]);
  }

  function releaseScroll(target: HTMLElement | number = story.offsetHeight) {
    const hasContentBelow = document.documentElement.scrollHeight > window.innerHeight + 1;
    if (!hasContentBelow) return;
    gestures.disable();
    scroll.start();
    scroll.scrollTo(target, { duration: PAGE_SCROLL_DURATION });
  }

  function onPageScroll() {
    if (gestures.isEnabled() || isReturning) return;
    if (scroll.scroll > story.offsetHeight / 2) hasLeftStory = true;
    const isNearStory = scroll.scroll < story.offsetHeight * CONFIG.returnThreshold;
    if (hasLeftStory && isNearStory && scroll.direction === -1) returnToStory(CONFIG.returnDuration, true);
  }

  async function returnToStory(duration: number, keepCurrentGesture: boolean) {
    isReturning = true;
    scroll.stop();
    const position = { y: window.scrollY };
    await gsap.to(position, {
      y: 0,
      duration,
      ease: 'power2.out',
      onUpdate: () => window.scrollTo(0, position.y),
    });
    isReturning = false;
    hasLeftStory = false;
    gestures.enable(keepCurrentGesture);
  }
}
