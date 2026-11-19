import type { Direction } from '../../types/video-story';

const WHEEL_GESTURE_GAP = 200;
const MIN_WHEEL_DELTA = 4;
const MIN_SWIPE = 40;

const KEYS_DOWN = ['ArrowDown', 'PageDown', ' '];
const KEYS_UP = ['ArrowUp', 'PageUp'];

export function listenScrollGestures(onGesture: (direction: Direction) => void) {
  let enabled = true;
  let lastWheelAt = 0;
  let gestureFired = false;
  let touchStartY = 0;

  function onWheel(e: WheelEvent) {
    if (!enabled) return;
    e.preventDefault();

    const now = performance.now();
    if (now - lastWheelAt > WHEEL_GESTURE_GAP) gestureFired = false;
    lastWheelAt = now;

    if (!gestureFired && Math.abs(e.deltaY) >= MIN_WHEEL_DELTA) {
      gestureFired = true;
      onGesture(e.deltaY > 0 ? 1 : -1);
    }
  }

  function onTouchStart(e: TouchEvent) {
    touchStartY = e.touches[0].clientY;
  }

  function onTouchMove(e: TouchEvent) {
    if (enabled) e.preventDefault();
  }

  function onTouchEnd(e: TouchEvent) {
    if (!enabled) return;
    const distance = touchStartY - e.changedTouches[0].clientY;
    if (Math.abs(distance) >= MIN_SWIPE) onGesture(distance > 0 ? 1 : -1);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (!enabled || e.repeat) return;
    if (KEYS_DOWN.includes(e.key)) { e.preventDefault(); onGesture(1); }
    if (KEYS_UP.includes(e.key)) { e.preventDefault(); onGesture(-1); }
  }

  window.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('touchstart', onTouchStart, { passive: true });
  window.addEventListener('touchmove', onTouchMove, { passive: false });
  window.addEventListener('touchend', onTouchEnd);
  window.addEventListener('keydown', onKeyDown);

  return {
    isEnabled: () => enabled,
    enable(keepCurrentGesture = false) {
      enabled = true;
      gestureFired = !keepCurrentGesture;
      lastWheelAt = performance.now();
    },
    disable() {
      enabled = false;
    },
    reset() { gestureFired = false },
  };
}
