import type Lenis from 'lenis';


export type Transition = 'fade' | 'zoom' | 'cut';

export interface SceneAlign {
  x?: number;
  y?: number;
  scale?: number;
}

export interface StoryScene {
  name: string;
  video: string;
  transition?: Transition;
  align?: SceneAlign;
  start?: number;
}

export interface VideoStoryProps {
  scenes: StoryScene[];
}

export interface StoryPanelProps {
  id: string;
  scene: string;
  time?: number;
  focus?: { x: number; y: number };
  align?: 'center' | 'right';
}


export interface StoryOptions {
  scroll: Lenis | null;
}

export type Direction = 1 | -1;

export interface Focus {
  x: number;
  y: number;
}

export interface Player {
  playForwardTo(time: number): Promise<void>;
}

export interface Scene {
  el: HTMLElement;
  zoom: HTMLElement;
  still: HTMLCanvasElement;
  name: string;
  forward: HTMLVideoElement;
  player: Player;
  transition: Transition;
  align: Required<SceneAlign>;
  start: number;
}

export interface Step {
  scene: Scene;
  panel: HTMLElement;
  time: number;
  focus: Focus | null;
}
