import type { Player } from '../../types/video-story';
import { STORY_CONFIG as CONFIG } from './config';
import { playUntil } from './video';

export function createPlayer(forward: HTMLVideoElement): Player {
  return {
    async playForwardTo(time: number) {
      await playUntil(forward, time, CONFIG.playbackRate);
    },
  };
}
