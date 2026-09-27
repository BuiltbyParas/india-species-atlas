#!/usr/bin/env node
/**
 * Entry point for every `npm run video:*` command.
 *
 * Picks the film before anything else loads, because the timeline, caches
 * and export names all follow the film:
 *
 *   --film doc      the five-minute documentary (default)
 *   --film promo    the 69-second promo
 *
 * A shot id also selects its film on its own: S001–S040 are the
 * documentary's, S01–S19 the promo's.
 */
const argv = process.argv.slice(2);
const i = argv.indexOf('--film');
let film = i >= 0 ? argv[i + 1] : process.env.VIDEO_FILM;
if (!film && argv[0] === 'shot') {
  const id = argv.slice(1).find((a) => /^S\d+$/i.test(a));
  if (id) film = /^S\d\d$/i.test(id) ? 'promo' : 'doc';
}
process.env.VIDEO_FILM = film ?? 'doc';
await import('./commands.mjs');
