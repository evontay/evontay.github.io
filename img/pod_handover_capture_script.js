/**
 * capture-handover.js
 *
 * Captures the pod rep handover animation as an exact, seamless loop of
 * PNG frames — same deterministic approach as before: every CSS animation
 * on the page is paused and stepped to a precise timestamp before each
 * screenshot, so frames never drop or drift and the loop closes perfectly.
 *
 * Setup:
 *   npm init -y
 *   npm install puppeteer
 *
 * Run:
 *   node capture-handover.js
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// ---- settings -------------------------------------------------------------

const HTML_FILE   = 'pod_handover_animation.html'; // save the artifact next to this script
const OUT_DIR     = 'handover-frames';

const LOOP_MS     = 10000; // matches the 10s animation-duration used throughout
const FPS         = 24;    // a bit higher than the reorg piece — useful here
                            // since the torch drag and confetti have faster motion
const WIDTH       = 1000;
const HEIGHT      = 600;   // matches the 10:6 canvas
const SCALE       = 2;     // retina capture, downscale later for crisper output

// ---------------------------------------------------------------------------

const FRAME_COUNT = Math.round((LOOP_MS / 1000) * FPS);
const FRAME_STEP  = LOOP_MS / FRAME_COUNT;

(async () => {
  if (!fs.existsSync(HTML_FILE)) {
    console.error(`Can't find ${HTML_FILE}. Save the artifact as that filename first.`);
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--force-device-scale-factor=' + SCALE, '--font-render-hinting=none'],
  });

  const page = await browser.newPage();
  await page.setViewport({
    width: WIDTH,
    height: HEIGHT,
    deviceScaleFactor: SCALE,
  });

  await page.goto('file://' + path.resolve(HTML_FILE), {
    waitUntil: 'networkidle0',
  });

  await new Promise(r => setTimeout(r, 300));

  // Freeze every animation so nothing advances between screenshots.
  await page.evaluate(() => {
    document.getAnimations().forEach(a => a.pause());
  });

  console.log(`Capturing ${FRAME_COUNT} frames at ${FPS}fps...`);

  for (let i = 0; i < FRAME_COUNT; i++) {
    const t = i * FRAME_STEP;

    await page.evaluate((time) => {
      document.getAnimations().forEach(a => { a.currentTime = time; });
    }, t);

    const name = String(i).padStart(4, '0');
    await page.screenshot({
      path: path.join(OUT_DIR, `frame-${name}.png`),
      omitBackground: false,
    });

    if (i % 20 === 0) {
      process.stdout.write(`  frame ${i}/${FRAME_COUNT}\r`);
    }
  }

  console.log(`\nDone. ${FRAME_COUNT} frames written to ./${OUT_DIR}/`);
  await browser.close();
})();

/* ---------------------------------------------------------------------------
 * ENCODING
 *
 * GIF — two-pass with a custom palette. The confetti burst is the one part
 * of this animation that genuinely benefits from more colours in the
 * palette, so bump max_colors up if the confetti looks muddy or banded:
 *
 *   ffmpeg -framerate 24 -i handover-frames/frame-%04d.png \
 *     -vf "scale=1000:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=256:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3" \
 *     -loop 0 pod-handover.gif
 *
 * If the file is too heavy, drop width and framerate together:
 *
 *   ffmpeg -framerate 18 -i handover-frames/frame-%04d.png \
 *     -vf "fps=18,scale=800:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3" \
 *     -loop 0 pod-handover.gif
 *
 *
 * MP4 — recommended over GIF here specifically, since confetti color
 * fidelity degrades more visibly under GIF's 256-colour limit than the
 * softer gradients in the earlier reorg animation did:
 *
 *   ffmpeg -framerate 24 -i handover-frames/frame-%04d.png \
 *     -vf "scale=1000:600:flags=lanczos,format=yuv420p" \
 *     -c:v libx264 -crf 18 -preset slow -movflags +faststart pod-handover.mp4
 *
 *
 * WebM:
 *
 *   ffmpeg -framerate 24 -i handover-frames/frame-%04d.png \
 *     -vf "scale=1000:600:flags=lanczos" \
 *     -c:v libvpx-vp9 -crf 32 -b:v 0 pod-handover.webm
 *
 *
 * Poster frame — around frame 0170 lands mid-confetti-burst, which is
 * probably the most eye-catching still to use as a fallback/thumbnail:
 *
 *   ffmpeg -i handover-frames/frame-0170.png -q:v 2 pod-handover-poster.jpg
 * --------------------------------------------------------------------------- */
