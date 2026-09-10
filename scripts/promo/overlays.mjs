import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import QRCode from 'qrcode';
import { PALETTE, VIDEO } from './config.mjs';

const FONT_LINK = `
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Spectral:wght@500;600;700&display=swap">
`;

const BASE_CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: ${VIDEO.width}px; height: ${VIDEO.height}px;
    font-family: Inter, system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  .eyebrow {
    font-size: 23px; font-weight: 600; letter-spacing: 0.22em;
    text-transform: uppercase; color: ${PALETTE.forest300};
  }
`;

/**
 * Captions are drawn in the browser, with the site's own typefaces, rather
 * than with ffmpeg's `drawtext`. It costs one screenshot each and keeps the
 * video's lettering identical to the lettering in the footage underneath it.
 *
 * They sit in the lower third but clear of the bottom 340 px, which is where
 * Instagram lays its own caption and controls over the frame.
 */
function captionHtml({ text, eyebrow }) {
  return `<!doctype html><html><head><meta charset="utf-8">${FONT_LINK}<style>
    ${BASE_CSS}
    body { background: transparent; }
    .scrim {
      position: absolute; left: 0; right: 0; bottom: 0; height: 940px;
      background: linear-gradient(to top,
        rgba(10,23,16,0.94) 0%, rgba(10,23,16,0.86) 26%,
        rgba(10,23,16,0.55) 58%, rgba(10,23,16,0) 100%);
    }
    .block { position: absolute; left: 76px; right: 96px; bottom: 372px; }
    .rule { width: 72px; height: 4px; background: ${PALETTE.forest400}; border-radius: 2px; }
    .eyebrow { margin-top: 26px; }
    h1 {
      margin-top: 18px; font-size: 58px; line-height: 1.18; font-weight: 600;
      letter-spacing: -0.015em; color: ${PALETTE.canvas};
    }
  </style></head><body>
    <div class="scrim"></div>
    <div class="block">
      <div class="rule"></div>
      ${eyebrow ? `<p class="eyebrow">${eyebrow}</p>` : ''}
      <h1>${text}</h1>
    </div>
  </body></html>`;
}

function endCardHtml({ url, qr, stats }) {
  const display = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  return `<!doctype html><html><head><meta charset="utf-8">${FONT_LINK}<style>
    ${BASE_CSS}
    body {
      background:
        radial-gradient(1200px 900px at 50% 18%, rgba(52,125,89,0.22), transparent 70%),
        ${PALETTE.forest950};
      color: ${PALETTE.canvas};
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; text-align: center; padding: 0 90px;
    }
    .mark { width: 92px; height: 92px; border-radius: 22px; background: #14261c;
            display: grid; place-items: center; margin-bottom: 34px; }
    h1 { font-family: Spectral, Georgia, serif; font-size: 76px; font-weight: 600;
         line-height: 1.1; margin-bottom: 22px; }
    .strap { font-size: 30px; line-height: 1.45; color: rgba(246,244,236,0.72); max-width: 780px; }
    .stats { display: flex; gap: 46px; margin: 46px 0 52px;
             border-top: 1px solid ${PALETTE.forest700};
             border-bottom: 1px solid ${PALETTE.forest700}; padding: 30px 0; }
    .stat .n { font-family: Spectral, Georgia, serif; font-size: 52px; font-weight: 600; }
    .stat .l { font-size: 21px; color: rgba(246,244,236,0.6); margin-top: 4px; }
    .qr { background: ${PALETTE.canvas}; padding: 22px; border-radius: 26px; }
    .qr img { display: block; width: 300px; height: 300px; }
    .url { margin-top: 26px; font-size: 30px; font-weight: 600; color: ${PALETTE.forest300};
           word-break: break-all; }
    .cta { margin-top: 12px; font-size: 24px; color: rgba(246,244,236,0.55); }
    .foot { position: absolute; bottom: 300px; font-size: 20px; color: rgba(246,244,236,0.38); }
  </style></head><body>
    <div class="mark">
      <svg viewBox="0 0 64 64" width="56" height="56" aria-hidden="true">
        <path d="M32 12c-7 6-11 12-11 20a11 11 0 0 0 22 0c0-8-4-14-11-20z" fill="${PALETTE.forest400}"/>
        <circle cx="32" cy="34" r="4" fill="${PALETTE.forest950}"/>
      </svg>
    </div>
    <p class="eyebrow">India Species Atlas</p>
    <h1>Explore the atlas</h1>
    <p class="strap">Mapping endangered species and their conservation status in India.</p>
    ${stats.length ? `<div class="stats">${stats
      .map((s) => `<div class="stat"><div class="n">${s.value}</div><div class="l">${s.label}</div></div>`)
      .join('')}</div>` : '<div style="height:52px"></div>'}
    <div class="qr"><img src="${qr}" alt=""></div>
    <p class="url">${display}</p>
    <p class="cta">Scan, or open the link — no app, no account.</p>
    <p class="foot">Student environmental-studies project · IUCN Red List · © OpenStreetMap contributors</p>
  </body></html>`;
}

/** A page sized to the finished frame, at 1:1 device pixels. */
async function overlayPage(browser) {
  const context = await browser.newContext({
    viewport: { width: VIDEO.width, height: VIDEO.height },
    deviceScaleFactor: 1,
  });
  return context.newPage();
}

async function shoot(page, html, file, { transparent }) {
  await page.setContent(html, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(150);
  await page.screenshot({ path: file, omitBackground: transparent });
}

export async function renderCaptions(browser, captions, dir) {
  const page = await overlayPage(browser);
  const out = [];
  for (const [i, caption] of captions.entries()) {
    const file = join(dir, `caption-${String(i).padStart(2, '0')}.png`);
    await shoot(page, captionHtml(caption), file, { transparent: true });
    out.push({ ...caption, file });
  }
  await page.context().close();
  return out;
}

export async function renderEndCard(browser, { url, stats }, dir) {
  // Generated offline with the same library the site itself uses, from the
  // public address rather than the localhost the recording ran against.
  const qr = await QRCode.toDataURL(url, {
    width: 600,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#0f1f17', light: PALETTE.canvas },
  });
  const page = await overlayPage(browser);
  const file = join(dir, 'endcard.png');
  await shoot(page, endCardHtml({ url, qr, stats }), file, { transparent: false });
  await page.context().close();
  return file;
}

/** Reads the headline figures off the site so the end card cannot drift. */
export async function readStats(page, origin) {
  await page.goto(`${origin}/`, { waitUntil: 'domcontentloaded' });
  const text = await page
    .locator('#atlas-capture')
    .innerText()
    .catch(() => '');
  const pick = (re) => text.match(re)?.[1];
  const stats = [
    { value: pick(/(\d+)\s+species/i), label: 'species' },
    { value: pick(/(\d+)\s+ecological regions/i), label: 'ecological regions' },
    { value: pick(/(\d+)\s+states/i), label: 'states & UTs' },
  ].filter((s) => s.value);
  return stats;
}

export async function writeJson(file, data) {
  await writeFile(file, `${JSON.stringify(data, null, 2)}\n`);
}
