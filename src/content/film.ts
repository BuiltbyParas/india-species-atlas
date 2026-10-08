import type { FilmRequest } from '../interaction/media';

const base = `${import.meta.env.BASE_URL}media/`;

/**
 * "Lines on the Map", the atlas's 69-second film, as a web encode of the
 * finished promo (1280 × 720, 30 fps): AV1 where the browser can decode it,
 * H.264 otherwise. The film itself is unchanged; this is only its web copy.
 */
export const FILM: FilmRequest = {
  kind: 'film',
  title: 'Lines on the Map',
  sources: [
    { src: `${base}lines-on-the-map-720.av1.mp4`, type: 'video/mp4; codecs="av01.0.05M.08, opus"' },
    { src: `${base}lines-on-the-map-720.h264.mp4`, type: 'video/mp4' },
  ],
  poster: `${base}lines-on-the-map-poster.webp`,
  captions: { src: `${base}lines-on-the-map.en.vtt`, label: 'English', lang: 'en' },
  aspect: 16 / 9,
};

/** The running time, as it is printed beside every way into the film. */
export const FILM_RUNTIME = '1:09';
