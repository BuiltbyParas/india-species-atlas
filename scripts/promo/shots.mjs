import { Recorder, easeInOut, lerp, smoother } from './recorder.mjs';

const { split } = Recorder;

/**
 * Waits for the basemap to stop changing.
 *
 * Not simply "every tile is loaded": Leaflet keeps the previous zoom level's
 * tiles in the DOM until the new ones arrive, and a tile the server never
 * answers for never gets its loaded class at all, so that condition can stay
 * false forever. What matters is that the count has stopped moving.
 */
async function waitForTiles(rec, timeout = 12000) {
  await rec.page
    .waitForFunction(
      () => {
        const tiles = document.querySelectorAll('.leaflet-tile');
        if (!tiles.length) return false;
        const pending = [...tiles].filter(
          (t) => !t.classList.contains('leaflet-tile-loaded'),
        ).length;
        if (pending === 0) return true;
        const state = (window.__tileWait ??= { pending: -1, stable: 0 });
        state.stable = pending === state.pending ? state.stable + 1 : 0;
        state.pending = pending;
        return state.stable >= 5;
      },
      { timeout, polling: 200 },
    )
    .catch(() => console.warn('  ! basemap still settling — recording anyway'));
  await rec.page.evaluate(() => {
    delete window.__tileWait;
  });
  await rec.tick(6);
}

/** Viewport-space centre of an element, without scrolling the page to it. */
async function centreOf(rec, selector, nth = 0) {
  const box = await rec.page.locator(selector).nth(nth).boundingBox();
  if (!box) throw new Error(`no box for ${selector}`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2, box };
}

/**
 * Drags the map by a fixed pixel offset, one increment per frame.
 *
 * The pointer is brought to rest before the button is released: Leaflet reads
 * the last few pointer samples to decide whether to throw the map into an
 * inertial glide, and a glide is timed by the browser rather than by us, which
 * would put motion in the video that the frame counter does not control.
 */
async function dragMap(rec, frames, from, dx, dy, ease = smoother) {
  await rec.page.mouse.move(from.x, from.y);
  await rec.page.mouse.down();
  await rec.animate(frames, (t) => {
    const e = ease(t);
    return rec.page.mouse.move(from.x + dx * e, from.y + dy * e);
  });
  await rec.hold(3); // pointer at rest, so no inertial throw
  await rec.page.mouse.up();
}

/**
 * The six shots, in order.
 *
 * `run` is handed the exact number of frames the shot must produce and splits
 * that budget across its own beats, so re-timing the video — by changing the
 * narration, say — re-times the choreography with it instead of desynchronising
 * from it.
 */
export const SHOTS = [
  {
    id: 'hero',
    minSeconds: 11,
    narration: [
      'The India Species Atlas maps where India’s threatened species live.',
      'Twelve species, each introduced over the landscape it belongs to.',
    ],
    captions: [
      { text: 'India Species Atlas', eyebrow: 'Interactive biodiversity atlas', at: 0.5, seconds: 4 },
      { text: '12 species, verified IUCN Red List data', at: 6.2, seconds: 4.4 },
    ],
    async run(rec, frames) {
      await rec.goto('/');
      // The scene fades itself in over 900 ms of real time once it has a frame
      // on screen, and that fade is the browser's, not ours.
      await rec.tick(20);
      await rec.settle(1800);

      const runway = await rec.page.evaluate(() => {
        const section = document.querySelector('main section');
        return Math.max(1, section.getBoundingClientRect().height - window.innerHeight);
      });

      const [lead, journey, tail] = split(frames, [3, 91, 6]);
      await rec.scrollTo(0);
      await rec.hold(lead);
      // Mostly constant speed, with the ends softened. A pure ease-in-out
      // spends its first second moving twenty pixels, which reads as the video
      // having stalled rather than as the camera setting off.
      const ramp = (t) => 0.72 * t + 0.28 * smoother(t);
      await rec.animate(journey, (t) => rec.scrollTo(ramp(t) * runway * 0.97));
      await rec.hold(tail);
    },
  },

  {
    id: 'map',
    minSeconds: 8,
    warm: true,
    narration: [
      'An interactive map, with a status-coded pin for every mapped location.',
    ],
    captions: [
      { text: 'Interactive map of India’s threatened species', at: 0.4, seconds: 5.2 },
    ],
    async run(rec, frames) {
      await rec.goto('/atlas');
      await waitForTiles(rec);
      await rec.settle(600);

      // Put the map itself in the frame rather than the page heading above it.
      const mapTop = await rec.page.evaluate(
        () => document.querySelector('.leaflet-container').getBoundingClientRect().top + window.scrollY,
      );
      const target = mapTop - 96;

      const [settle, scroll, pause, pan, zoom, hold] = split(frames, [4, 11, 3, 41, 16, 25]);
      await rec.scrollTo(0);
      await rec.hold(settle);
      await rec.animate(scroll, (t) => rec.scrollTo(smoother(t) * target));
      await rec.hold(pause);

      // Pan by however far it takes to bring a real locality to the middle of
      // the map rather than by a guessed number of pixels, so the move still
      // lands on the Western Ghats if the dataset or the layout shifts.
      const map = await centreOf(rec, '.leaflet-container');
      const tahr = await centreOf(rec, '.leaflet-marker-icon[title^="Nilgiri Tahr"]');
      // A pin is anchored at its point, which is the bottom of its box.
      const dx = map.x - (tahr.box.x + tahr.box.width / 2);
      const dy = map.y - (tahr.box.y + tahr.box.height);
      // The grip starts out over the Arabian Sea: a drag that begins on a
      // marker is swallowed by the marker instead of panning the map.
      const grip = {
        x: map.box.x + map.box.width * 0.22,
        y: map.box.y + map.box.height * 0.74,
      };
      await dragMap(rec, pan - 3, grip, dx, dy);

      // Zoom about the centre, which is now the locality just panned to.
      await rec.page.mouse.move(map.x, map.y);
      const firstStep = Math.max(6, Math.floor(zoom / 2));
      await rec.page.mouse.wheel(0, -120);
      await rec.hold(firstStep);
      await rec.page.mouse.wheel(0, -120);
      await rec.hold(zoom - firstStep);

      await waitForTiles(rec, 8000);
      await rec.hold(hold);
    },
  },

  {
    id: 'profile',
    minSeconds: 8.5,
    warm: true,
    narration: [
      'Open any pin for a full profile — habitat, threats, and the programmes working to protect it.',
    ],
    captions: [{ text: 'Tap any pin for a full species profile', at: 0.4, seconds: 4.6 }],
    async run(rec, frames) {
      await rec.goto('/atlas');
      await waitForTiles(rec);
      const mapTop = await rec.page.evaluate(
        () => document.querySelector('.leaflet-container').getBoundingClientRect().top + window.scrollY,
      );
      await rec.scrollTo(mapTop - 96);
      await rec.settle(500);

      const [open, popup, drawer, read] = split(frames, [4, 18, 12, 66]);

      // Fifty-two pins overlap heavily at the India view, so whichever one sits
      // under a given coordinate is down to Leaflet's stacking order. Sending
      // the event to the named marker keeps the shot on the same species every
      // run; nothing is lost visually, because a capture never draws a cursor.
      const pin = rec.page.locator('.leaflet-marker-icon[title^="Bengal Tiger"]').first();
      await rec.hold(open);
      await pin.dispatchEvent('click');
      await rec.hold(popup);

      const profileButton = rec.page.locator('.leaflet-popup-content button');
      await profileButton.waitFor({ timeout: 5000 });
      await profileButton.dispatchEvent('click');
      await rec.page.locator('[role="dialog"]').waitFor({ timeout: 5000 });
      await rec.hold(drawer);

      // Read down the profile at a steady pace.
      const scrollable = '[role="dialog"] .scroll-slim';
      const distance = await rec.page.evaluate((sel) => {
        const el = document.querySelector(sel);
        return Math.max(0, el.scrollHeight - el.clientHeight);
      }, scrollable);
      await rec.animate(read, (t) =>
        rec.page.evaluate(
          ({ sel, top }) => {
            document.querySelector(sel).scrollTop = top;
          },
          { sel: scrollable, top: Math.round(smoother(t) * Math.min(distance, 1500)) },
        ),
      );
    },
  },

  {
    id: 'filters',
    minSeconds: 8,
    narration: [
      'Search by name or region, and filter by status, region and habitat.',
    ],
    captions: [{ text: 'Explore by region, status and habitat', at: 0.4, seconds: 5 }],
    async run(rec, frames) {
      await rec.goto('/species');
      await rec.settle(400);

      const [lead, type, readQuery, scrollDown, clear, scrollUp, filter, showResults] =
        split(frames, [4, 19, 9, 13, 7, 7, 15, 26]);

      await rec.scrollTo(0);
      await rec.hold(lead);

      await rec.page.evaluate(() =>
        document.getElementById('species-search').focus({ preventScroll: true }),
      );
      const query = 'himalaya';
      const perChar = Math.max(1, Math.floor(type / query.length));
      for (const ch of query) {
        await rec.page.keyboard.type(ch, { delay: 0 });
        await rec.hold(perChar);
      }
      await rec.hold(Math.max(0, type - perChar * query.length));
      await rec.hold(readQuery);

      // The results sit below the filter panel on a phone-width layout.
      const resultsTop = await rec.page.evaluate(() => {
        const el = document.querySelector('[aria-live="polite"]');
        return el.getBoundingClientRect().top + window.scrollY - 80;
      });
      await rec.animate(scrollDown, (t) => rec.scrollTo(smoother(t) * resultsTop));
      await rec.hold(clear);

      // Back to the filters under their own steam: cutting the page position
      // would be the one hard jump in an otherwise continuous shot.
      await rec.animate(scrollUp, (t) => rec.scrollTo(resultsTop * (1 - smoother(t))));
      await rec.page.evaluate(() => {
        const input = document.getElementById('species-search');
        const setter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value',
        ).set;
        setter.call(input, '');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });

      const checkbox = rec.page.locator(
        'label:has-text("Critically Endangered (CR)") input[type="checkbox"]',
      );
      const cb = await checkbox.boundingBox();
      await rec.page.mouse.click(cb.x + cb.width / 2, cb.y + cb.height / 2);
      await rec.hold(filter);

      const filteredTop = await rec.page.evaluate(() => {
        const el = document.querySelector('[aria-live="polite"]');
        return el.getBoundingClientRect().top + window.scrollY - 80;
      });
      await rec.animate(showResults, (t) => rec.scrollTo(smoother(t) * filteredTop));
    },
  },

  {
    id: 'charts',
    minSeconds: 6.5,
    narration: ['Every chart is computed from the dataset itself — nothing is hard-coded.'],
    captions: [{ text: 'Conservation status, charted from the data', at: 0.4, seconds: 4.6 }],
    async run(rec, frames) {
      await rec.goto('/conservation');
      await rec.settle(400);

      const { from, to } = await rec.page.evaluate(() => {
        const heading = [...document.querySelectorAll('h2')].find((h) =>
          /in numbers/i.test(h.textContent),
        );
        const start = heading.getBoundingClientRect().top + window.scrollY - 90;
        const figures = [...document.querySelectorAll('figure')];
        const last = figures[Math.min(2, figures.length - 1)].getBoundingClientRect();
        return { from: start, to: last.bottom + window.scrollY - window.innerHeight + 40 };
      });

      const [lead, scroll, tail] = split(frames, [8, 80, 12]);
      await rec.scrollTo(from);
      await rec.hold(lead);
      await rec.animate(scroll, (t) => rec.scrollTo(lerp(from, to, easeInOut(t))));
      await rec.hold(tail);
    },
  },
];

/**
 * The closing card. It is a still rather than a shot: the frames are identical,
 * so it is rendered once and held by the editor.
 */
export const END_CARD = {
  id: 'endcard',
  minSeconds: 5.5,
  narration: ['Explore the atlas yourself.'],
  captions: [],
};
