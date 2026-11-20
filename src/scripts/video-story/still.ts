import type { Focus } from '../../types/video-story';
import { STORY_CONFIG as CONFIG } from './config';

const supportsCanvasFilter = 'filter' in CanvasRenderingContext2D.prototype;
let helper: HTMLCanvasElement | null = null;

export function renderStill(video: HTMLVideoElement, canvas: HTMLCanvasElement, focus: Focus | null) {
  const scale = focus ? 1 : 0.5;
  const width = Math.round(video.videoWidth * scale);
  const height = Math.round(video.videoHeight * scale);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return;
  drawBlurred(ctx, video, width, height, CONFIG.blurPx * scale);
  if (!focus) return;

  ctx.fillStyle = `rgb(0 0 0 / ${CONFIG.focusDarken})`;
  ctx.fillRect(0, 0, width, height);
  drawSharpEllipse(ctx, video, width, height, focus);
}

function drawBlurred(ctx: CanvasRenderingContext2D, video: HTMLVideoElement, width: number, height: number, blur: number) {
  if (supportsCanvasFilter) {
    const margin = blur * 2; 
    ctx.filter = `blur(${blur}px)`;
    ctx.drawImage(video, -margin, -margin, width + margin * 2, height + margin * 2);
    ctx.filter = 'none';
    return;
  }

  const small = getHelper(Math.ceil(width / blur), Math.ceil(height / blur));
  const smallCtx = small.getContext('2d')!;
  smallCtx.imageSmoothingQuality = 'high';
  smallCtx.drawImage(video, 0, 0, small.width, small.height);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(small, 0, 0, width, height);
}

function drawSharpEllipse(ctx: CanvasRenderingContext2D, video: HTMLVideoElement, width: number, height: number, focus: Focus) {
  const layer = getHelper(width, height);
  const layerCtx = layer.getContext('2d')!;
  layerCtx.drawImage(video, 0, 0, width, height);

  const cx = focus.x * width;
  const cy = focus.y * height;
  const rx = CONFIG.focusRadius.x * width;
  const ry = CONFIG.focusRadius.y * height;
  const gradient = layerCtx.createRadialGradient(0, 0, 0, 0, 0, 1);
  gradient.addColorStop(0.75, '#000');
  gradient.addColorStop(1, 'rgb(0 0 0 / 0)');

  layerCtx.globalCompositeOperation = 'destination-in';
  layerCtx.setTransform(rx, 0, 0, ry, cx, cy);
  layerCtx.fillStyle = gradient;
  layerCtx.fillRect(-cx / rx, -cy / ry, width / rx, height / ry);
  layerCtx.setTransform(1, 0, 0, 1, 0, 0);
  layerCtx.globalCompositeOperation = 'source-over';

  ctx.drawImage(layer, 0, 0);
}

export function copyCanvas(source: HTMLCanvasElement, target: HTMLCanvasElement) {
  if (target.width !== source.width || target.height !== source.height) {
    target.width = source.width;
    target.height = source.height;
  }
  target.getContext('2d', { alpha: false })?.drawImage(source, 0, 0);
}

function getHelper(width: number, height: number) {
  helper ??= document.createElement('canvas');
  helper.width = width;
  helper.height = height;
  return helper;
}
