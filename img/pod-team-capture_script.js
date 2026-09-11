/**
 * capture.js — for pod-team-animation.html
 *
 * Captures the "teams merging into a pod" key image as an exact, seamless
 * loop of PNG frames. Pauses every CSS animation and steps each one to a
 * precise timestamp before each screenshot so the loop closes perfectly.
 *
 * Run:
 *   node pod-team-capture_script.js
 *
 * Then encode with the ffmpeg commands at the bottom of this file.
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// ---- settings -------------------------------------------------------------

const HTML_FILE   = 'pod-team-animation.html';
const OUT_DIR     = 'pod-team-frames';

const LOOP_MS     = 7000; // must match the animation-duration in the CSS
const FPS         = 20;
const WIDTH       = 1000;
const HEIGHT      = 600;
const SCALE       = 2;

// ---------------------------------------------------------------------------

const FRAME_COUNT = Math.round((LOOP_MS / 1000) * FPS);
const FRAME_STEP  = LOOP_MS / FRAME_COUNT;

(async () => {
  if (!fs.existsSync(HTML_FILE)) {
    console.error(`Can't find ${HTML_FILE}. Save it next to this script first.`);
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

  await page.evaluate(() => document.fonts.ready);
  await new Promise(r => setTimeout(r, 500));

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
 *   ffmpeg -framerate 20 -i pod-team-frames/frame-%04d.png \
 *     -vf "scale=1000:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=256:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3" \
 *     -loop 0 pod-team.gif
 * --------------------------------------------------------------------------- */
