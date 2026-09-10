/**
 * Tunables for the promo-video pipeline.
 *
 * Everything the video's shape depends on lives here: the capture geometry,
 * the frame rate, the narration voice, and the palette the captions and end
 * card are drawn in. The choreography itself is in `shots.mjs`.
 */

/** Where the deployed atlas lives. Overridable with `--url`. */
export const PUBLIC_URL = 'https://builtbyparas.github.io/india-species-atlas/';

/** The local preview server the browser is actually driven against. */
export const LOCAL_ORIGIN = 'http://localhost:4173';
export const PREVIEW_PORT = 4173;

export const FPS = 30;

/**
 * The page is driven at a phone-sized CSS viewport and captured at 2× device
 * pixels, which lands exactly on a 1080×1920 Reels frame with no rescaling.
 *
 * Recording the *mobile* layout is deliberate. A 1080-wide desktop layout puts
 * 14 px body text into a frame that a phone shows at roughly 1:1, which is
 * unreadable in a Reel; the mobile layout doubles it. It is also what the
 * audience for this video would actually see if they opened the link.
 */
export const CAPTURE = { width: 540, height: 960, scale: 2 };

export const VIDEO = {
  width: CAPTURE.width * CAPTURE.scale,
  height: CAPTURE.height * CAPTURE.scale,
};

/** Cross-dissolve between shots, in seconds. */
export const TRANSITION = 0.4;

/** Fade to black at the very end, in seconds. */
export const TAIL_FADE = 0.6;

export const VOICE = 'en-IN-PrabhatNeural';
/** Slightly under default pace — the copy is dense and the visuals are slow. */
export const VOICE_RATE = '-6%';

/** Silence held before the first narration line of a shot, in seconds. */
export const NARRATION_LEAD_IN = 0.35;
/** Silence held after a shot's last narration line, in seconds. */
export const NARRATION_TAIL = 0.7;

/** Caption fade, in seconds. */
export const CAPTION_FADE = 0.35;

/**
 * If the user supplies a music bed with `--music`, it is mixed in this far
 * below the narration. No track ships with this repo on purpose.
 */
export const MUSIC_GAIN = 0.1;

/** Kept in sync with `src/theme.ts`. */
export const PALETTE = {
  forest950: '#0a1710',
  forest900: '#0f1f17',
  forest700: '#1c3a2b',
  forest400: '#5aa47e',
  forest300: '#8fc7aa',
  canvas: '#f6f4ec',
};

/**
 * Chromium flags that put WebGL on the real GPU rather than SwiftShader.
 * The hero is a three.js scene; software rendering makes each captured frame
 * roughly fifteen times more expensive. Dropped automatically if the browser
 * refuses to start with them.
 */
export const GPU_ARGS = [
  '--use-gl=angle',
  '--use-angle=gl-egl',
  '--enable-gpu',
  '--ignore-gpu-blocklist',
  '--enable-gpu-rasterization',
];

export const BROWSER_ARGS = [
  '--hide-scrollbars',
  '--force-color-profile=srgb',
  '--disable-lcd-text',
  '--mute-audio',
];

/**
 * Injected into every page before recording.
 *
 * `scroll-behavior: smooth` is right for a person and wrong for a recorder:
 * the frames are captured one at a time and the scroll position must be
 * exactly what the choreography asked for, not somewhere along a browser-timed
 * easing curve. The caret is hidden for the same reason a blinking cursor is
 * distracting in a screen recording.
 */
export const RECORDING_CSS = `
  html { scroll-behavior: auto !important; }
  input, textarea { caret-color: transparent !important; }
  /* Chrome puts a focus ring on an SVG path the moment a drag starts on it,
     drawn around the whole bounding box — so panning the map leaves a large
     white rectangle over a state. It is a pointer-interaction artefact rather
     than something a visitor sees, and suppressing it here takes no keyboard
     affordance away from the site itself. */
  .leaflet-container *:focus { outline: none !important; }
`;
