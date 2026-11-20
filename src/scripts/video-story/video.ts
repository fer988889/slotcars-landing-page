const END_MARGIN = 0.05;

export function loadVideo(video: HTMLVideoElement): Promise<boolean> {
  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) return Promise.resolve(true);
  if (video.error) return Promise.resolve(false);
  return new Promise((resolve) => {
    video.addEventListener('loadeddata', () => resolve(true), { once: true });
    video.addEventListener('error', () => resolve(false), { once: true });
  });
}

export function endTime(video: HTMLVideoElement): number {
  return video.duration - END_MARGIN;
}

export function getStopTimes(video: HTMLVideoElement, stopCount: number, startAt: number | null): number[] {
  const end = endTime(video);
  if (startAt === null) return Array.from({ length: stopCount }, (_, i) => (end * (i + 1)) / stopCount);
  if (stopCount <= 1) return [startAt];
  return Array.from({ length: stopCount }, (_, i) => startAt + ((end - startAt) * i) / (stopCount - 1));
}

export function whenTimeReaches(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    const check = () => (video.currentTime >= time || video.paused ? resolve() : requestAnimationFrame(check));
    check();
  });
}

export function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  if (Math.abs(video.currentTime - time) > 0.01) video.currentTime = time;
  if (!video.seeking) return Promise.resolve();
  return new Promise((resolve) => {
    video.addEventListener('seeked', () => resolve(), { once: true });
  });
}

export function playUntil(video: HTMLVideoElement, time: number, rate: number): Promise<void> {
  return new Promise((resolve) => {
    const checkEachFrame = () => {
      if (video.currentTime >= time || video.ended) {
        video.pause();
        resolve();
      } else {
        requestAnimationFrame(checkEachFrame);
      }
    };

    video.playbackRate = rate;
    video
      .play()
      .then(() => requestAnimationFrame(checkEachFrame))
      .catch(() => {
        video.currentTime = time;
        resolve();
      });
  });
}
