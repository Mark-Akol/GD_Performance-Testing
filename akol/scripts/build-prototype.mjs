// Packs the web export (`npx expo export -p web`) into one self-contained HTML page:
// the JS bundle inline, and the fonts/images the app uses embedded as data: URIs.
// Handy for sharing a clickable prototype anywhere a single file can be hosted.
//
//   node scripts/build-prototype.mjs [out.html]
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';

const dist = new URL('../dist/', import.meta.url).pathname;
const out = process.argv[2] ?? join(dist, 'akol-prototype.html');

const html = readFileSync(join(dist, 'index.html'), 'utf8');
const bundlePath = html.match(/<script src="\/(_expo\/static\/js\/web\/[^"]+\.js)"/)?.[1];
if (!bundlePath) throw new Error('No bundle found in dist/index.html. Run `npx expo export -p web` first.');
let bundle = readFileSync(join(dist, bundlePath), 'utf8');

// Only embed what Akol actually loads; the other icon fonts ship in the bundle's
// registry but are never requested.
const USED = [
  /Ionicons\.[a-f0-9]+\.ttf$/,
  /DelaGothicOne_400Regular\.[a-f0-9]+\.ttf$/,
  /ChakraPetch_(400Regular|500Medium|500Medium_Italic|600SemiBold|700Bold|700Bold_Italic)\.[a-f0-9]+\.ttf$/,
  /\.png$/,
];
const MIME = { '.ttf': 'font/ttf', '.png': 'image/png' };

let embedded = 0;
let bytes = 0;
bundle = bundle.replace(/"(\/assets\/[^"]+\.(?:ttf|png))"/g, (whole, url) => {
  const file = join(dist, url);
  if (!USED.some((re) => re.test(url)) || !existsSync(file)) return whole;
  const data = readFileSync(file);
  embedded++;
  bytes += data.length;
  return `"data:${MIME[extname(url)]};base64,${data.toString('base64')}"`;
});

// Keep the inline script from closing early.
bundle = bundle.replace(/<\/script/gi, '<\\/script');

const page = `<title>Akol</title>
<meta name="theme-color" content="#FFFFFF">
<style>
  :root { color-scheme: light; --bg: #FFFFFF; }
  html, body { height: 100%; background: var(--bg); }
  body { overflow: hidden; margin: 0; }
  #root { display: flex; height: 100%; flex: 1; }
</style>
<div id="root"></div>
<script>
  // Expo Router routes by pathname; start the app at "/" wherever the page is hosted.
  try { if (location.pathname !== '/') history.replaceState(history.state, '', '/'); } catch (e) {}
</script>
<script>
${bundle}
</script>
`;

writeFileSync(out, page);
console.log(`Wrote ${out}: ${(page.length / 1e6).toFixed(2)} MB, ${embedded} assets embedded (${(bytes / 1e6).toFixed(2)} MB raw)`);
