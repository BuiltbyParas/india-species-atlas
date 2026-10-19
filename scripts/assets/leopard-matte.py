"""
The snow leopard's matte, rebuilt (field-study polish, 12 Oct 2026).

The previous matte was a hand-drawn polygon blurred 34 px: a soft crop that kept a margin of the photograph's own
snow and rock round the animal, which reads as a pale halo against the drawn terrace. This replaces it with a cut
along the animal's outline plus the ledge it stands on:

  1. seeds: the earlier isnet trial mask (body, head, legs; it lost the tail and kept a block of snow under the
     chest) eroded, minus snow-coloured pixels; hand-placed polygons for the tail and the near foreleg; everything
     outside the old matte is background;
  2. OpenCV GrabCut, seeded by those, finds the outline;
  3. the outline is softened with a guided filter (the photograph is the guide), so fur at the edge keeps partial
     alpha instead of a hard cut;
  4. the ledge under the paws is kept from the old matte, faded softly downward, so the animal still stands on
     something and the tail still hangs over it;
  5. colour decontamination: inside the soft edge the snow's colour is replaced by the fur's own, pulled in from
     the interior, and every transparent pixel is filled with the nearest fur colour, so neither the edge nor the
     texture's smaller mip levels carry the white of the background back in.

Run (needs numpy + opencv; any venv that has them):
  python scripts/assets/leopard-matte.py <original.jpg> <isnet-trial-mask.png> <old-matted.webp> <out.webp> [preview-dir]
The output has the same size and placement as the old file (the original padded into 1955 × 1381 at 190, 200).
"""
import sys
import cv2
import numpy as np

orig_path, isnet_path, old_path, out_path = sys.argv[1:5]
preview = sys.argv[5] if len(sys.argv) > 5 else None

old = cv2.imread(old_path, cv2.IMREAD_UNCHANGED)  # BGRA, 1955 × 1381, the padded habitat with the soft matte
H, W = old.shape[:2]
OX, OY = 190, 200
orig = cv2.imread(orig_path)
oh, ow = orig.shape[:2]
img = old[:, :, :3].copy()
img[OY:OY + oh, OX:OX + ow] = orig  # the original's own pixels where it has them
old_a = old[:, :, 3].astype(np.float32) / 255.0

def at(poly):
    """Polygon in the original's pixels → a mask in the padded frame."""
    m = np.zeros((H, W), np.uint8)
    cv2.fillPoly(m, [np.array([(x + OX, y + OY) for x, y in poly], np.int32)], 255)
    return m > 0

isnet = cv2.imread(isnet_path, 0)
isnet = cv2.resize(isnet, (ow, oh), interpolation=cv2.INTER_LINEAR)
body = np.zeros((H, W), np.uint8)
body[OY:OY + oh, OX:OX + ow] = isnet
body = body > 127

f = img.astype(np.float32)
b, g, r = f[:, :, 0], f[:, :, 1], f[:, :, 2]
lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
chroma = f.max(2) - f.min(2)
# Snow in this photograph is near white and a little blue, and bluer still in shade; the fur is warm (cream, tan)
# or neutral grey.
snow = ((lum > 150) & (chroma < 26) & (b - r > -8)) | ((lum > 70) & (chroma < 36) & (b - r > 4))

# The tail (lost by the trial mask) and the near foreleg (partly lost), in the original's pixels.
tail = at([(1100, 600), (1112, 700), (1130, 780), (1160, 860), (1195, 950), (1222, 1050), (1238, 1181),
           (1385, 1181), (1352, 1100), (1325, 1000), (1305, 900), (1278, 800), (1255, 700), (1232, 600), (1215, 520)])
foreleg = at([(312, 470), (322, 560), (330, 640), (342, 700), (372, 738), (425, 735), (438, 660), (430, 560), (405, 470)])
# The block of snow the trial mask kept, between the forelegs under the chest.
gap = at([(430, 590), (520, 560), (610, 620), (640, 780), (560, 800), (450, 760)])

mask = np.full((H, W), cv2.GC_PR_BGD, np.uint8)
probable = cv2.dilate(body.astype(np.uint8), np.ones((15, 15), np.uint8)) > 0
mask[probable | tail | foreleg] = cv2.GC_PR_FGD
sure = cv2.erode(body.astype(np.uint8), np.ones((25, 25), np.uint8)) > 0
mask[sure & ~snow & ~gap] = cv2.GC_FGD
mask[cv2.erode(tail.astype(np.uint8), np.ones((31, 31), np.uint8)) > 0] = cv2.GC_FGD
mask[(old_a < 0.08)] = cv2.GC_BGD
# Snow is background wherever it is not deep inside the body (the trial mask's block of snow included).
deep = cv2.erode(body.astype(np.uint8), np.ones((61, 61), np.uint8)) > 0
mask[snow & ~deep & ~tail] = cv2.GC_BGD
mask[gap & snow] = cv2.GC_BGD

bgd = np.zeros((1, 65), np.float64)
fgd = np.zeros((1, 65), np.float64)
cv2.grabCut(img, mask, None, bgd, fgd, 6, cv2.GC_INIT_WITH_MASK)
hard = np.isin(mask, (cv2.GC_FGD, cv2.GC_PR_FGD)).astype(np.float32)
# Keep the largest piece only (stray islands of rock the colour of fur).
n, lab, stats, _ = cv2.connectedComponentsWithStats((hard > 0.5).astype(np.uint8), 8)
if n > 1:
    keep = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    hard = (lab == keep).astype(np.float32)
# Fill pin-holes inside the body.
hard = cv2.morphologyEx(hard, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))

def guided(I, p, rad, eps):
    """He et al.'s guided filter, grey guide."""
    box = lambda x: cv2.boxFilter(x, -1, (2 * rad + 1, 2 * rad + 1))
    mi, mp = box(I), box(p)
    cov = box(I * p) - mi * mp
    var = box(I * I) - mi * mi
    a = cov / (var + eps)
    bb = mp - a * mi
    return box(a) * I + box(bb)

guide = lum / 255.0
soft = guided(guide, hard, 6, 1e-3)
soft = np.clip(soft, 0, 1)
# Never wider than a few pixels beyond the cut, never holes inside it.
outer = cv2.dilate(hard, np.ones((9, 9), np.uint8))
inner = cv2.erode(hard, np.ones((7, 7), np.uint8))
animal = np.maximum(np.minimum(soft, outer), inner)
animal = cv2.GaussianBlur(animal, (0, 0), 0.8)

# The ledge under the paws, from the old matte: whole near the paws, fading downward and outward into the drawn snow.
# The far paws stand on a snow ledge: kept softly, its snow becomes the drawn snow in the scene.
ledge_poly = at([(560, 880), (1110, 846), (1175, 1000), (1225, 1181), (560, 1181), (500, 1000)])
ledge = cv2.GaussianBlur(ledge_poly.astype(np.float32), (0, 0), 22) * old_a
# The near forepaw rests on a rock: solid at its top, where the paw is, sinking into the snow below.
rock_poly = at([(318, 736), (455, 724), (478, 790), (452, 870), (372, 892), (322, 830)])
rows = (np.arange(H, dtype=np.float32) - OY)[:, None]
sink = np.clip((900 - rows) / 110, 0, 1)
rock = cv2.GaussianBlur(rock_poly.astype(np.float32), (0, 0), 3.5) * sink
ledge = np.maximum(ledge, rock)
alpha = np.maximum(animal, ledge)

# Decontaminate: the fur's colour pulled outward from where the animal is solid, by a normalised blur at growing
# radii (each pixel takes the nearest solid fur's colour), used inside the soft edge and in all transparent pixels.
core = (animal > 0.9).astype(np.float32)
fill = np.zeros_like(f)
have = np.zeros((H, W), np.float32)
for sigma in (2, 4, 8, 16, 32, 64, 128):
    wsum = cv2.GaussianBlur(core, (0, 0), sigma)
    csum = cv2.GaussianBlur(f * core[:, :, None], (0, 0), sigma)
    est = csum / np.maximum(wsum[:, :, None], 1e-6)
    take = (have < 0.5) & (wsum > 0.02)
    fill[take] = est[take]
    have[take] = 1
fill[have < 0.5] = f[have < 0.5]
# Where the edge is snow-coloured, the fur's colour; where it is fur, its own. Not on the ledge (its snow stays snow).
edge = (animal > 0.02) & (animal < 0.9) & (ledge < 0.05)
snowish = np.clip((lum - 120) / 60, 0, 1) * np.clip((30 - chroma) / 20, 0, 1)
k = np.where(edge, np.maximum(snowish, 1 - animal), 0)[:, :, None]
out = f * (1 - k) + fill * k
# Transparent pixels: the nearest colour of what is drawn (fur, or the ledge's snow), so mip levels do not bleed white.
ledge_fill = np.where((ledge > 0.02)[:, :, None], f, fill)
out = np.where((alpha < 0.02)[:, :, None], np.where((ledge > 0.005)[:, :, None], ledge_fill, fill), out)

bgra = np.dstack([np.clip(out, 0, 255).astype(np.uint8), np.clip(alpha * 255 + 0.5, 0, 255).astype(np.uint8)])
cv2.imwrite(out_path, bgra, [cv2.IMWRITE_WEBP_QUALITY, 86])
print('written', out_path, bgra.shape, 'alpha>0.5 px', int((alpha > 0.5).sum()), 'old', int((old_a > 0.5).sum()))

if preview:
    for name, bg in (('dark', (80, 52, 40)), ('snow', (235, 228, 222)), ('mid', (120, 110, 100))):
        back = np.full_like(f, bg, dtype=np.float32)
        comp = out * alpha[:, :, None] + back * (1 - alpha[:, :, None])
        cv2.imwrite(f'{preview}/new-over-{name}.jpg', cv2.resize(comp.astype(np.uint8), (W // 2, H // 2)), [cv2.IMWRITE_JPEG_QUALITY, 88])
    cv2.imwrite(f'{preview}/new-alpha.png', cv2.resize((alpha * 255).astype(np.uint8), (W // 2, H // 2)))
    seeds = img.copy()
    seeds[mask == cv2.GC_FGD] = (0, 200, 0)
    seeds[mask == cv2.GC_BGD] = (0, 0, 160)
    cv2.imwrite(f'{preview}/new-seeds.jpg', cv2.resize(seeds, (W // 2, H // 2)), [cv2.IMWRITE_JPEG_QUALITY, 80])
