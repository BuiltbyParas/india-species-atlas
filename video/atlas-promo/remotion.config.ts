/**
 * Remotion CLI configuration for the India Species Atlas promotional film.
 * Used by `npm run video:promo:*` (passed with --config). It only affects the
 * film's bundle; the website is built by Vite and never sees this file.
 */
import { Config } from '@remotion/cli/config';

Config.setEntryPoint('video/atlas-promo/index.ts');
// Shares the documentary engine's asset folder: fonts, NOAA/Natural Earth
// data, full-size photographs, and the promo's own generated `promo/` files.
Config.setPublicDir('video/public');
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);
Config.setCodec('h264');
Config.setPixelFormat('yuv420p');
Config.setOverwriteOutput(true);
// Software GL: the film uses no WebGL, and the hardware 'angle' path was seen
// to corrupt composited tiles on one frame (two copies of the title). swangle
// renders every frame identically.
Config.setChromiumOpenGlRenderer('swangle');

Config.overrideWebpackConfig((config) => ({
  ...config,
  module: {
    ...config.module,
    rules: [
      ...(config.module?.rules ?? []),
      // The canonical boundary file is imported straight from the site's
      // public/ folder, so the film and the site cannot drift apart.
      { test: /\.geojson$/, type: 'json' },
    ],
  },
}));
