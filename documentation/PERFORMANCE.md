# India Species Atlas: performance

Started in Gate 1. The Gate 0 baseline (bundles, assets, page loads, hazards) is in [`PREMIUM_UPGRADE_PLAN.md` §5](PREMIUM_UPGRADE_PLAN.md#5-performance-baseline). This file tracks each gate against it.

## How it is measured

- **Build:** a production build (`npm run build`) served by `vite preview`. The baseline is the Gate 0 build, kept and served side by side so both are measured on the same machine in the same session.
- **Client:** headless Chromium (Playwright 1.63) with SwiftShader WebGL.
- **Profiles:**
  - *Desktop:* 1440 × 900, no throttling.
  - *Phone:* 390 × 844 at DPR 2 with touch, **4× CPU slowdown and a 9 Mbps / 60 ms link** (DevTools protocol throttling).
- **Metrics:** FCP, LCP, CLS and TBT come from `PerformanceObserver` (TBT = the sum of long-task time over 50 ms in the first ~5 s). Each value is the **median of three runs**. Transfer is the bytes received in that window.
- **Caveats.** These are lab numbers, not field data.
  - Under SwiftShader, WebGL runs on the CPU. The home page's TBT of about 3.2 s and the `/species` gallery's TBT are mostly software rasterisation, and they are the same before and after. On a real GPU they are far smaller.
  - Transfer in a 5 s window moves with lazy-loading timing (±200 kB between runs), so the asset table below is the reliable view of payload.
  - No Lighthouse binary is installed on this machine; the vitals above stand in for it.

## Gate 1 — before → after

| Page | Profile | LCP | CLS | TBT |
|---|---|---|---|---|
| `/` | desktop | 644 → 976 ms ¹ | 0.007 → 0.008 | 3209 → 3226 ms ² |
| `/` | phone | 1704 → 1708 ms | 0.008 → 0.008 | 3226 → 3917 ms ² |
| `/atlas` | desktop | 1428 → 1500 ms | 0.049 → **0.000** | 74 → 102 ms |
| `/atlas` | phone | 2960 → 2604 ms | 0.197 → **0.000** | 676 → 568 ms |
| `/species` | desktop | 868 → 768 ms | 0.105 → **0.000** | 1699 → 1688 ms ² |
| `/species` | phone | 1128 → 1024 ms | 0.162 → **0.000** | 2025 → 1483 ms ² |
| `/conservation` | desktop | 856 → 804 ms | 0.210 → **0.010** | 70 → 63 ms |
| `/conservation` | phone | 1840 → 1792 ms | 0.224 → **0.001** | 541 → 691 ms |

¹ The home LCP element is the hero headline. It ranged from 616 to 976 ms across Gate 1 runs (the earlier Gate 1 run measured 616 ms), which is run-to-run noise rather than a change.
² Dominated by software WebGL; see caveats.

**The clear result is layout stability.** CLS on the working pages was 0.1–0.22 ("needs improvement"/"poor"). The cause was the footer: it sat above the fold while a lazy route's code loaded, then was pushed off-screen when the page arrived. The route placeholder is now a full screen tall, and CLS is 0.00–0.01 everywhere.

### Assets

| Item | Before | After |
|---|---|---|
| Photo for small slots (dome tiles, cards, compare, profile at DPR 1, phone scenes) | 1400 px JPG, 12 files = **2.68 MB** | 720 px WebP, 12 files = **0.67 MB** (−75%) |
| Dome's blurred backdrop | full JPG (up to 607 kB) blurred by 60 px | the 720 px WebP (6–147 kB) |
| `<img>` intrinsic size | none, so boxes resize as photos land | `width`/`height` on every photograph |
| `india-states.geojson` on `/atlas` | fetched twice (132 kB × 2) | fetched once, shared by every map |
| Main JS chunk | 155.7 kB gzip | 156.9 kB gzip (+1.2 kB: photo helper, tab keys, focus trap) |
| CSS | 25.3 kB gzip | 26.0 kB gzip |

### Runtime hazards from Gate 0

| Hazard | Gate 1 |
|---|---|
| HeroStage scroll listener not RAF-throttled | **Fixed**: one update per animation frame. |
| `setPhase` called on every scrubbed frame (species scene, conservation chapter) | **Fixed**: React is reached only when the phase changes. |
| GeoProgress `setShown` on every scroll frame | **Fixed**: only when visibility flips. |
| `html { scroll-behavior: smooth }` fighting Lenis; Lenis CSS not imported | **Fixed**: smooth behaviour applies only without Lenis; `lenis.css` imported. |
| CurvedLoop read reduced motion once | **Fixed**: follows the preference live. |
| Two continuous CurvedLoop RAF loops while on screen | Kept. Each costs one `setAttribute` per frame and stops off-screen; the drift is the design. |
| DomeGallery `setCenter` per frame | Already bails out when the centre does not change; no change. |
| InteractiveStat `setState` per frame | At most one render per integer step (values ≤ 12 here); no change. |
| Hero builds a plate atlas with plates off | One empty 1024 × 256 canvas; negligible, left alone. |
| `chapters.ts` reads `getBoundingClientRect` per frame | RAF-throttled, about six elements; left for Gate 8. |
| Dome tiles animate `filter` per frame while dragging | Left for Gate 8 measurement on a real GPU. |

### Decision: the 3D hero on phones

The plan proposed showing the flat India on narrow screens so phones would not download three.js (136 kB gzip). **Gate 1 does not do this.**

- **Visual cost.** On a phone the relief with its 52 lit localities is the strongest image in the opening. The flat outline is noticeably weaker (compare `phone-02-hero-mid` with the reduced-motion hero), and the brief is that a cleaner but visually worse result is reverted.
- **Performance cost.** It is small and already contained:
  - three.js is a lazy chunk, fetched after first paint, so it does not block FCP or LCP;
  - phone scroll frames measured p50/p95 16.7 ms at Gate 0;
  - `canRender3D()` already sends weak devices to the flat map: Save-Data, 2G, ≤ 2 GB memory, ≤ 2 cores, reduced motion, and a failed WebGL probe;
  - the scene steps itself down at runtime and bails to flat if still too slow.

This is revisited in Gate 4 (spatial atlas), where the camera's phone framing is redesigned anyway.
