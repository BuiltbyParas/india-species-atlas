/**
 * The site's typefaces, Newsreader and Geist (SIL OFL), from the film's asset
 * folder (fetched by `npm run video:data`). Rendering waits until every face
 * has loaded, so no frame is ever drawn in a fallback font.
 */
import { continueRender, delayRender, staticFile } from 'remotion';

const FACES: Array<[family: string, file: string, descriptors: FontFaceDescriptors]> = [
  ['Newsreader', 'fonts/newsreader.woff2', { weight: '200 700', style: 'normal' }],
  ['Newsreader', 'fonts/newsreader-italic.woff2', { weight: '200 600', style: 'italic' }],
  ['Geist', 'fonts/geist.woff2', { weight: '300 700', style: 'normal' }],
];

let loaded: Promise<void> | null = null;

export function loadFonts(): Promise<void> {
  if (loaded) return loaded;
  const handle = delayRender('fonts');
  loaded = Promise.all(
    FACES.map(async ([family, file, desc]) => {
      const face = new FontFace(family, `url(${staticFile(file)}) format('woff2')`, desc);
      await face.load();
      document.fonts.add(face);
    }),
  ).then(
    () => continueRender(handle),
    (err) => {
      console.error('[atlas-promo] font failed to load', err);
      continueRender(handle);
    },
  );
  return loaded;
}
