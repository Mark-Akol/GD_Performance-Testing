/**
 * Regenerates every launcher/splash asset from one source image.
 *
 *   node scripts/generate-assets.js path/to/logo.png
 *
 * Run this after any rebrand rather than exporting five sizes by hand — the
 * Android inset in particular is easy to get wrong, and a wrong one gets the
 * icon cropped into nonsense on real devices.
 */
const path = require('node:path');
const sharp = require('sharp');

const source = process.argv[2] ?? path.join(__dirname, '..', 'assets', 'icon.png');
const out = (name) => path.join(__dirname, '..', 'assets', name);

// Brand canvas, matching palette.void in src/theme/tokens.ts.
const VOID = { r: 8, g: 7, b: 10, alpha: 1 };
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

async function main() {
  await sharp(source).resize(1024, 1024, { fit: 'cover' }).png().toFile(out('icon.png'));

  // Android masks roughly a third off each edge of an adaptive icon, so the
  // artwork is shrunk to 560px and centred on a 1024px transparent canvas.
  await sharp(source)
    .resize(560, 560, { fit: 'contain', background: TRANSPARENT })
    .extend({ top: 232, bottom: 232, left: 232, right: 232, background: TRANSPARENT })
    .png()
    .toFile(out('adaptive-icon.png'));

  await sharp(source)
    .resize(1200, 1200, { fit: 'contain', background: VOID })
    .png()
    .toFile(out('splash.png'));

  await sharp(source).resize(48, 48, { fit: 'cover' }).png().toFile(out('notification-icon.png'));
  await sharp(source).resize(196, 196, { fit: 'cover' }).png().toFile(out('favicon.png'));

  console.log('Assets regenerated from', source);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
