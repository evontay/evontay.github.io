/**
 * capture.js
 *
 * Captures the reorg key image as an exact, seamless loop of PNG frames.
 *
 * Rather than screen-recording in real time (which drops and duplicates
 * frames), this pauses every CSS animation on the page and steps each one
 * to a precise timestamp before each screenshot. Every frame lands exactly
 * where it should, and the loop closes perfectly.
 *
 * Setup:
 *   npm init -y
 *   npm install puppeteer
 *
 * Run:
 *   node capture.js
 *
 * Then encode with the ffmpeg commands at the bottom of this file.
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// ---- settings -------------------------------------------------------------

const HTML_FILE   = 'reorg-animation.html'; // save the artifact next to this script
const OUT_DIR     = 'frames';

const LOOP_MS     = 13000; // must match the animation-duration in the CSS
const FPS         = 20;    // 20 is plenty for slow organic motion; 25 for smoother
const WIDTH       = 1000;
const HEIGHT      = 600;   // matches the 10:6 crop — update if the canvas size changes again
const SCALE       = 2;     // 2 = retina capture, downscale later for crisper output

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

  // Let the webfont land before capturing, or frame 1 renders in a fallback face.
  await page.evaluate(() => document.fonts.ready);
  await new Promise(r => setTimeout(r, 500));

  // Freeze every animation on the page so nothing advances between screenshots.
  await page.evaluate(() => {
    document.getAnimations().forEach(a => a.pause());
  });

  console.log(`Capturing ${FRAME_COUNT} frames at ${FPS}fps...`);

  for (let i = 0; i < FRAME_COUNT; i++) {
    const t = i * FRAME_STEP;

    // Step every animation to the same point on the timeline.
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
 * GIF — two-pass with a custom palette. The palettegen/paletteuse pair is
 * essential here: the default 256-colour web palette will band badly across
 * the soft blurred gradients. bayer dithering keeps the banding structured
 * rather than noisy, which compresses far better than the default.
 *
 *   ffmpeg -framerate 20 -i frames/frame-%04d.png \
 *     -vf "scale=1000:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=256:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3" \
 *     -loop 0 reorg.gif
 *
 * If the file comes out too heavy, drop the width to 800 and the framerate
 * to 15 — with motion this slow, neither is very noticeable:
 *
 *   ffmpeg -framerate 15 -i frames/frame-%04d.png \
 *     -vf "fps=15,scale=800:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3" \
 *     -loop 0 reorg.gif
 *
 *
 * MP4 — much smaller and far better looking. yuv420p and the even-dimension
 * scale are needed for broad browser and social platform support.
 *
 *   ffmpeg -framerate 20 -i frames/frame-%04d.png \
 *     -vf "scale=1000:600:flags=lanczos,format=yuv420p" \
 *     -c:v libx264 -crf 18 -preset slow -movflags +faststart reorg.mp4
 *
 *
 * WebM — smaller again, good fallback pairing with the MP4.
 *
 *   ffmpeg -framerate 20 -i frames/frame-%04d.png \
 *     -vf "scale=1000:600:flags=lanczos" \
 *     -c:v libvpx-vp9 -crf 32 -b:v 0 reorg.webm
 *
 *
 * For the blog, a looping muted video beats a GIF on both weight and quality:
 *
 *   <video autoplay loop muted playsinline poster="reorg-poster.jpg">
 *     <source src="reorg.webm" type="video/webm">
 *     <source src="reorg.mp4" type="video/mp4">
 *   </video>
 *
 * Pull the poster frame from somewhere legible — frame 0155 sits in the
 * settled phase with the operating model visible, which is the state you'd
 * most want a static preview to show:
 *
 *   ffmpeg -i frames/frame-0155.png -q:v 2 reorg-poster.jpg
 * --------------------------------------------------------------------------- */
