/**
 * capture-vds-flow.js
 *
 * Captures the VDS demand-flow animation as an exact, seamless loop of
 * PNG frames — same deterministic approach as the earlier animations:
 * every CSS animation on the page is paused and stepped to a precise
 * timestamp before each screenshot, so frames never drop or drift and
 * the loop closes perfectly.
 *
 * Setup:
 *   npm init -y
 *   npm install puppeteer
 *
 * Run:
 *   node capture-vds-flow.js
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// ---- settings -------------------------------------------------------------

const HTML_FILE   = 'vds-flow.html'; // save the artifact next to this script
const OUT_DIR     = 'vds-flow-frames';

const LOOP_MS     = 5333;  // matches the 5.333s animation-duration used throughout (8s sped up 1.5x)
const FPS         = 24;    // the pulses and slides are quick enough to
                            // benefit from the higher frame rate here
const WIDTH       = 2100;
const HEIGHT      = 1330;  // matches the 2100x1330 canvas
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

  // Let the webfont land before capturing, or early frames render in a
  // fallback face and the text metrics shift slightly once Raleway loads.
  await page.evaluate(() => document.fonts.ready);
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
 * GIF — two-pass with a custom palette. This animation is mostly flat
 * colour blocks (squares, circles, buckets) rather than soft gradients,
 * which GIF's 256-colour palette handles well — should look clean:
 *
 *   ffmpeg -framerate 24 -i vds-flow-frames/frame-%04d.png \
 *     -vf "scale=1400:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=256:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3" \
 *     -loop 0 vds-flow.gif
 *
 * If the file is too heavy, drop width and framerate together:
 *
 *   ffmpeg -framerate 18 -i vds-flow-frames/frame-%04d.png \
 *     -vf "fps=18,scale=1100:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3" \
 *     -loop 0 vds-flow.gif
 *
 *
 * MP4 — smaller file, sharper text on the narration captions than GIF
 * would give at the same width:
 *
 *   ffmpeg -framerate 24 -i vds-flow-frames/frame-%04d.png \
 *     -vf "scale=1400:600:flags=lanczos,format=yuv420p" \
 *     -c:v libx264 -crf 18 -preset slow -movflags +faststart vds-flow.mp4
 *
 *
 * WebM:
 *
 *   ffmpeg -framerate 24 -i vds-flow-frames/frame-%04d.png \
 *     -vf "scale=1400:600:flags=lanczos" \
 *     -c:v libvpx-vp9 -crf 32 -b:v 0 vds-flow.webm
 *
 *
 * Poster frame — around frame 0060 lands mid-fetch-phase with a square
 * already visible in the queue, a reasonable single-frame summary:
 *
 *   ffmpeg -i vds-flow-frames/frame-0060.png -q:v 2 vds-flow-poster.jpg
 * --------------------------------------------------------------------------- */
