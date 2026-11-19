import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { join, parse } from 'node:path';
import ffmpeg from 'ffmpeg-static';

const VIDEOS_DIR = 'public/videos';
const REVERSE_SUFFIX = '-reverse';
const MARK = 'slotcars-web';

const WEB_FORMAT = [
  '-an',
  '-c:v', 'libx264', '-crf', '22', '-preset', 'veryslow', '-pix_fmt', 'yuv420p',
  '-movflags', '+faststart',
  '-metadata', `comment=${MARK}`,
];

function isProcessed(file) {
  const { stderr } = spawnSync(ffmpeg, ['-hide_banner', '-i', file], { encoding: 'utf8' });
  return stderr.includes(MARK);
}

function encode(input, output, extraArgs = []) {
  console.log(`→ Generando ${output} (puede tardar un minuto)`);
  const result = spawnSync(
    ffmpeg,
    ['-y', '-loglevel', 'error', '-i', input, ...extraArgs, ...WEB_FORMAT, output],
    { stdio: 'inherit' },
  );
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const videos = readdirSync(VIDEOS_DIR).filter(
  (file) => /\.(mp4|mov)$/i.test(file) && !parse(file).name.endsWith(REVERSE_SUFFIX),
);

for (const file of videos) {
  const source = join(VIDEOS_DIR, file);
  const { name } = parse(file);
  const compressed = join(VIDEOS_DIR, `${name}.mp4`);
  const reversed = join(VIDEOS_DIR, `${name}${REVERSE_SUFFIX}.mp4`);

  if (isProcessed(source)) {
    console.log(`✓ ${source} ya está comprimido`);
    if (!existsSync(reversed)) encode(source, reversed, ['-vf', 'reverse']);
    continue;
  }

  encode(source, reversed, ['-vf', 'reverse']);
  const temp = join(VIDEOS_DIR, `${name}.tmp.mp4`);
  encode(source, temp);
  rmSync(source);
  renameSync(temp, compressed);
}
