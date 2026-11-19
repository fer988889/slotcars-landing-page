import type { Player } from '../../types/video-story';
import { STORY_CONFIG as CONFIG } from './config';
import { endTime, playUntil, rewindTo, seekTo } from './video';

export function createPlayer(forward: HTMLVideoElement, reverse: HTMLVideoElement | null): Player {
  const mirrorTime = (video: HTMLVideoElement, time: number) => video.duration - time;

  const isReverseReady = (video: HTMLVideoElement | null): video is HTMLVideoElement =>
    video !== null && !video.error && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;

  function prepareReverse() {
    if (isReverseReady(reverse)) seekTo(reverse, mirrorTime(reverse, forward.currentTime));
  }

  return {
    async playForwardTo(time: number) {
      await playUntil(forward, time, CONFIG.playbackRate);
      prepareReverse();
    },

    async playBackwardTo(time: number) {
      if (!isReverseReady(reverse)) return await rewindTo(forward, time, CONFIG.rewindSpeed);

      await seekTo(reverse, mirrorTime(reverse, forward.currentTime));
      reverse.style.visibility = 'visible';
      // Sin llegar al final exacto del invertido: algunos navegadores muestran un cuadro negro ahí.
      await playUntil(reverse, Math.min(mirrorTime(reverse, time), endTime(reverse)), CONFIG.reverseRate);

      // El original va al mismo frame donde frenó el invertido, así el cambio no salta.
      await seekTo(forward, Math.max(0, mirrorTime(reverse, reverse.currentTime)));
      reverse.style.visibility = 'hidden';
      prepareReverse();
    },
  };
}
