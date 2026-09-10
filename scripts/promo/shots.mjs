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
 * Drags something by a fixed pixel offset, one increment per frame.
 *
 * Used by every shot that turns a thing with the pointer: the Leaflet map, the
 * species gallery's ring and the 3D conservation stage.
 *
 * The pointer is brought to rest before the button is released: Leaflet reads
 * the last few pointer samples to decide whether to throw the map into an
 * inertial glide, and a glide is timed by the browser rather than by us, which
 * would put motion in the video that the frame counter does not control. The
 * two 3D stages settle to whole steps on release instead, and a pause before
 * letting go suits them too.
 */
async function drag(rec, frames, from, dx, dy, ease = smoother) {
  await rec.page.mouse.move(from.x, from.y);
  await rec.page.mouse.down();
  await rec.animate(frames, (t) => {
    const e = ease(t);
    return rec.page.mouse.move(from.x + dx * e, from.y + dy * e);
  });
  await rec.hold(3); // pointer at rest, so no inertial throw
  await rec.page.mouse.up();
}

/** The stages the two opt-in WebGL views draw into. */
const GALLERY_STAGE = '[role="group"][aria-label^="Species gallery"]';
const SITES_STAGE = '[role="group"][aria-label^="Conservation programmes"]';

/**
 * Waits for one of those stages to be built and visible.
 *
 * Two clocks are involved and neither can be hurried. The scene's first frame
 * is drawn inside a `requestAnimationFrame` callback, which in a recording only
 * runs when this script ticks the virtual clock — so the poll ticks as well as
 * waits. The fade that follows is a CSS transition on the canvas, timed by the
 * browser at 700 ms of real time rather than by the frame counter, so it is
 * waited out here instead of being photographed half-done.
 */
async function waitForStage(rec, selector, tries = 60) {
  const visible = () =>
    rec.page.evaluate((sel) => {
      const canvas = document.querySelector(sel)?.querySelector('canvas');
      return Boolean(canvas) && canvas.style.opacity === '1';
    }, selector);
  for (let i = 0; i < tries; i++) {
    await rec.settle(250);
    if (await visible()) {
      await rec.settle(1400);
      return;
    }
  }
  console.warn('  ! 3D stage never reported ready — recording anyway');
}

/** Viewport-space box of an element, without scrolling the page to it. */
async function boxOf(rec, selector) {
  const box = await rec.page.locator(selector).first().boundingBox();
  if (!box) throw new Error(`no box for ${selector}`);
  return box;
}

/**
 * The eight shots, in order.
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
      await drag(rec, pan - 3, grip, dx, dy);

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
    id: 'sites3d',
    minSeconds: 9,
    warm: true,
    narration: [
      'Conservation mode can raise the map — a step for every state a programme covers.',
      'A marker stands at each programme site; the step marks whether, not how much.',
    ],
    captions: [{ text: 'Conservation mode, raised out of the map', at: 2.4, seconds: 4.4 }],
    async run(rec, frames) {
      // Straight into Conservation mode, which the page reads off the query
      // string, so the shot opens on the flat map the toggle is an alternative
      // to rather than on the Species mode two clicks away from it.
      await rec.goto('/atlas?mode=conservation');
      await waitForTiles(rec);
      await rec.settle(500);

      // Framed from the mode switch down, so the toggle being pressed and the
      // mode it belongs to are both in shot.
      const modeTop = await rec.page.evaluate(
        () =>
          document.querySelector('[role="tablist"][aria-label="Map mode"]').getBoundingClientRect()
            .top + window.scrollY,
      );
      await rec.scrollTo(modeTop - 70);
      await rec.tick(6);
      await rec.settle(400);

      const [flat, arrive, swingOut, swingBack, rest, pick] =
        split(frames, [14, 16, 12, 22, 8, 28]);
      await rec.hold(flat);

      // The view is opt-in, so the toggle is pressed rather than deep-linked.
      // What follows it — building the relief and fading the canvas up — is on
      // the browser's clock, so it is waited out between frames instead of
      // being photographed half-done.
      await rec.page.locator('button:has-text("3D sites")').dispatchEvent('click');
      await waitForStage(rec, SITES_STAGE);
      await rec.hold(arrive);

      // Turn the stage out to one limit and back. The scene holds the view
      // within 32° of north-up, and 900 px of drag is a full turn, so 78 px is
      // exactly the range; the upward component lowers the camera with it,
      // which is what makes the raised states read as raised rather than as
      // shaded. Coming back to where it started matters: the marker beat is
      // the longest one in the shot and it should sit on the framing the view
      // opens in, not on the edge of its own swing.
      const stage = await boxOf(rec, SITES_STAGE);
      const grip = { x: stage.x + stage.width / 2, y: stage.y + stage.height * 0.62 };
      await drag(rec, swingOut - 3, grip, -78, -22);
      await drag(rec, swingBack - 3, { x: grip.x - 78, y: grip.y - 22 }, 78, 22);
      await rec.hold(rest);

      // Select a marker the way the site's own screen-reader list does, which
      // is the same selection a click on the marker makes. Naming the site
      // keeps the shot on the same programme every run, and a capture never
      // draws a cursor, so nothing is lost by not aiming at it.
      await rec.page
        .locator('ul.sr-only li button', { hasText: 'Project Elephant' })
        .first()
        .evaluate((el) => el.focus({ preventScroll: true }));
      await rec.settle(250);
      await rec.hold(pick);
    },
  },

  {
    id: 'gallery',
    minSeconds: 9,
    narration: [
      'The species directory is a ring you turn, bringing any species to the front.',
      'The cards are modelled; the photographs on them are real.',
    ],
    captions: [{ text: 'Turn the gallery to browse the species', at: 0.5, seconds: 4.6 }],
    async run(rec, frames) {
      await rec.goto('/species');
      await rec.settle(400);

      // The gallery builds nothing until its section is near the viewport, so
      // the shot's opening position is also what starts it.
      const stageTop = await rec.page.evaluate(
        (sel) => document.querySelector(sel).getBoundingClientRect().top + window.scrollY,
        GALLERY_STAGE,
      );
      await rec.scrollTo(stageTop - 150);
      await rec.tick(6);
      await waitForStage(rec, GALLERY_STAGE);

      const [lead, turn, rest, stepOne, stepTwo, tail] = split(frames, [10, 30, 14, 16, 16, 14]);
      await rec.hold(lead);

      // 190 px of drag turns the ring by one card, so this sweep brings the
      // third species round; the ring settles on a whole card when the button
      // is released.
      const stage = await boxOf(rec, GALLERY_STAGE);
      const grip = { x: stage.x + stage.width * 0.78, y: stage.y + stage.height * 0.55 };
      await drag(rec, turn - 3, grip, -380, 0);

      // Then let the hand come back to the middle. The camera follows the
      // pointer, so a pointer left parked at the edge of the stage holds the
      // ring at a skew for the rest of the shot, with the card that ought to
      // be centred pushed against one side.
      const from = { x: grip.x - 380, y: grip.y };
      const middle = { x: stage.x + stage.width / 2, y: stage.y + stage.height / 2 };
      await rec.animate(rest, (t) => {
        const e = smoother(t);
        return rec.page.mouse.move(
          lerp(from.x, middle.x, e),
          lerp(from.y, middle.y, e),
        );
      });

      // Then the same move on the control beside the caption, which is the
      // other way the page offers. The event is sent to the button rather than
      // clicked at, so the pointer stays over the stage and the camera holds
      // the framing the drag left it in.
      const next = rec.page.locator('button[aria-label="Next species"]');
      await next.dispatchEvent('click');
      await rec.hold(stepOne);
      await next.dispatchEvent('click');
      await rec.hold(stepTwo);
      await rec.hold(tail);
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
      // The directory opens on the gallery, which the shot before this one has
      // just been through. Switching to the grid keeps the two shots from
      // showing the same thing twice, and it is the view a filtered result set
      // is easiest to read in: a filter change rebuilds the ring from scratch,
      // and the fade that follows is the browser's rather than ours.
      await rec.page.locator('[role="tablist"][aria-label="Directory view"] button:has-text("Grid")').dispatchEvent('click');
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
