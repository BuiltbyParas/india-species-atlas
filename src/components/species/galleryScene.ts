import * as THREE from 'three';

/**
 * The species gallery: a ring of photographic cards in real 3D space.
 *
 * What is on the cards is photography — a real, credited, openly-licensed
 * picture of the animal — and what is three-dimensional is the *card*: an
 * extruded slab with thickness and a bevelled edge, standing on a ring the
 * viewer turns. That distinction is the honest one, and the interface says it
 * in words as well. There is no 3D model of any animal here, because none
 * exists for these twelve species at a standard this project could cite.
 *
 * Framework-agnostic on purpose, like `heroScene.ts`: React owns the DOM
 * caption and the fallbacks, this owns the pixels.
 */

export interface GalleryCard {
  id: string;
  commonName: string;
  scientificName: string;
  statusCode: string;
  statusName: string;
  statusColor: string;
  src: string;
}

export interface GalleryOptions {
  canvas: HTMLCanvasElement;
  cards: GalleryCard[];
  /** The card now nearest the front of the ring. */
  onFocus?: (index: number) => void;
  /** The focused card was clicked or tapped. */
  onActivate?: (index: number) => void;
  onFirstFrame?: () => void;
  /** The device cannot hold a usable frame rate. Hand back to the flat grid. */
  onTooSlow?: () => void;
}

export interface Gallery {
  resize: (width: number, height: number) => void;
  setActive: (active: boolean) => void;
  /** Turn the ring to a card. */
  focus: (index: number) => void;
  /** Turn the ring by whole cards. */
  step: (delta: number) => void;
  /** Vertical position of the section in the viewport, -1 → 1. */
  setScroll: (offset: number) => void;
  dispose: () => void;
}

/* ------------------------------------------------------------------ layout */

/** Card face, in world units. Portrait, close to 5:7. */
const CARD_W = 1.12;
const CARD_H = 1.56;
const CARD_DEPTH = 0.055;
const CARD_RADIUS = 0.075;
/** Bevel on the slab's edge. It is what catches the key light as a card turns. */
const CARD_BEVEL = 0.014;

/** Radius of the ring the cards stand on. */
const RING_RADIUS = 3.6;
/**
 * Angle between neighbouring cards.
 *
 * A fixed pitch rather than "a full circle divided by however many cards there
 * are". The gallery is driven by the page's filters, so the set can be three
 * cards or twelve, and dividing the circle would swing three cards 120° apart
 * — far enough that the two either side of the front one show the viewer their
 * backs. At a fixed pitch the spacing looks the same at any size, and the ring
 * is simply left unfinished when there are not enough cards to close it.
 */
const SLOT_ANGLE = Math.PI / 6;
/**
 * Past this, a card is edge-on and reads as a dark sliver rather than as a
 * card, so it is dropped. The cull is invisible because a slab at 95° presents
 * about a tenth of its width.
 */
const VISIBLE_ANGLE = (95 * Math.PI) / 180;
/** How much further out the focused card sits, so it separates from its neighbours. */
const FOCUS_PUSH = 0.42;
const FOCUS_SCALE = 1.1;
const FOCUS_LIFT = 0.06;

const CAMERA_DISTANCE = 4.25;
const CAMERA_HEIGHT = 0.3;
const LOOK_AT = new THREE.Vector3(0, 0.02, 0.5);

/** Texture resolution of a card face. */
const FACE_W = 640;
const FACE_H = 892;

/* --------------------------------------------------------------- behaviour */

/** Exponential smoothing per frame, for everything that eases. */
const EASE = 0.13;
/** Pixels of horizontal drag that turn the ring by one card. */
const DRAG_PER_CARD = 190;

const SLOW_FRAME_MS = 34;
const SAMPLE_WINDOW = 30;
const SAMPLE_WINDOW_MS = 900;
const DEGRADE_SLOW_FRACTION = 0.5;
const ABANDON_SLOW_FRACTION = 0.68;
const BAD_WINDOWS_BEFORE_ABANDON = 2;

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
const smoothstep = (t: number) => t * t * (3 - 2 * t);

/* ---------------------------------------------------------------- geometry */

function roundedRectShape(width: number, height: number, radius: number) {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;
  const r = Math.min(radius, width / 2, height / 2);
  shape.moveTo(x + r, y);
  shape.lineTo(x + width - r, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + r);
  shape.lineTo(x + width, y + height - r);
  shape.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  shape.lineTo(x + r, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  return shape;
}

/** A soft radial falloff, reused for every glow and for the floor pool. */
function radialTexture(size = 256, inner = 0.0, feather = 1.0) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(
    size / 2, size / 2, (size / 2) * inner,
    size / 2, size / 2, (size / 2) * feather,
  );
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.45, 'rgba(255,255,255,0.42)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function path(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Draws one card face: the photograph, cover-cropped to the card, under a
 * scrim carrying the species' name and IUCN category.
 *
 * The lettering is baked into the texture rather than laid over the canvas as
 * DOM, because every card except the front one is seen at an angle: text in
 * the texture turns with the card and keeps its perspective, which is the
 * whole point of the thing being three-dimensional.
 */
function drawFace(image: HTMLImageElement, card: GalleryCard): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = FACE_W;
  canvas.height = FACE_H;
  const ctx = canvas.getContext('2d')!;
  const radius = (CARD_RADIUS / CARD_W) * FACE_W;

  ctx.save();
  path(ctx, 0, 0, FACE_W, FACE_H, radius);
  ctx.clip();

  // Cover-crop: fill the card and lose the overflow rather than distort.
  const scale = Math.max(FACE_W / image.width, FACE_H / image.height);
  const w = image.width * scale;
  const h = image.height * scale;
  ctx.drawImage(image, (FACE_W - w) / 2, (FACE_H - h) / 2, w, h);

  // A scrim, so the caption reads over whatever the photograph happens to be.
  const scrim = ctx.createLinearGradient(0, FACE_H * 0.52, 0, FACE_H);
  scrim.addColorStop(0, 'rgba(6,15,10,0)');
  scrim.addColorStop(0.55, 'rgba(6,15,10,0.72)');
  scrim.addColorStop(1, 'rgba(6,15,10,0.95)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, FACE_H * 0.52, FACE_W, FACE_H * 0.48);

  // Status chip, top left. Never colour alone: the code is always written out.
  const chipX = 26;
  const chipY = 26;
  ctx.font = '600 25px Inter, system-ui, sans-serif';
  const codeWidth = ctx.measureText(card.statusCode).width;
  const chipW = codeWidth + 62;
  const chipH = 44;
  ctx.fillStyle = 'rgba(6,15,10,0.66)';
  path(ctx, chipX, chipY, chipW, chipH, chipH / 2);
  ctx.fill();
  ctx.strokeStyle = card.statusColor;
  ctx.lineWidth = 2;
  path(ctx, chipX + 1, chipY + 1, chipW - 2, chipH - 2, (chipH - 2) / 2);
  ctx.stroke();
  ctx.fillStyle = card.statusColor;
  ctx.beginPath();
  ctx.arc(chipX + 22, chipY + chipH / 2, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.textBaseline = 'middle';
  ctx.fillText(card.statusCode, chipX + 38, chipY + chipH / 2 + 1);

  // Caption. The common name wraps to at most two lines; the binomial sits
  // under it in italic, exactly as it is set everywhere else on the site.
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#f6f4ec';
  ctx.font = '600 42px Inter, system-ui, sans-serif';
  const lines = wrap(ctx, card.commonName, FACE_W - 68);
  let baseline = FACE_H - 66 - (lines.length - 1) * 50;
  for (const line of lines) {
    ctx.fillText(line, 34, baseline);
    baseline += 50;
  }
  ctx.fillStyle = 'rgba(195,226,211,0.82)';
  ctx.font = 'italic 400 27px Spectral, Georgia, serif';
  ctx.fillText(card.scientificName, 34, FACE_H - 28);
  ctx.restore();

  // A hairline of the status colour around the whole face, which is what makes
  // the card read as a mounted plate rather than a floating photograph.
  ctx.strokeStyle = card.statusColor;
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = 6;
  path(ctx, 3, 3, FACE_W - 6, FACE_H - 6, radius - 3);
  ctx.stroke();
  ctx.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 2);
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`could not load ${src}`));
    image.src = src;
  });
}

/* ------------------------------------------------------------------- scene */

export async function createGallery(options: GalleryOptions): Promise<Gallery> {
  const { canvas, cards, onFocus, onActivate, onFirstFrame, onTooSlow } = options;
  const count = cards.length;
  if (!count) throw new Error('the gallery needs at least one card');

  // Faces carry type, so the fonts have to be there before anything is drawn.
  await document.fonts.ready.catch(() => undefined);
  const images = await Promise.all(cards.map((card) => loadImage(card.src)));

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);

  /* ------------------------------------------------------------- lighting */

  // Deliberately soft. The cards are photographs and the light is there to
  // give the slabs an edge and a falloff as they turn away, not to relight
  // the pictures.
  scene.add(new THREE.AmbientLight(0xdff0e7, 1.15));
  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(2.2, 3.4, 4.2);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x8fc7aa, 0.5);
  rim.position.set(-3.4, 0.8, -2.2);
  scene.add(rim);

  /* ---------------------------------------------------------------- cards */

  const slabGeometry = new THREE.ExtrudeGeometry(
    roundedRectShape(CARD_W, CARD_H, CARD_RADIUS),
    {
      depth: CARD_DEPTH,
      bevelEnabled: true,
      bevelThickness: CARD_BEVEL,
      bevelSize: CARD_BEVEL,
      bevelOffset: 0,
      bevelSegments: 2,
      curveSegments: 10,
    },
  );
  // A bevelled extrusion spans z from -bevelThickness to depth + bevelThickness,
  // not 0 to depth. Shifting by the depth alone leaves the front cap in front
  // of the origin — and the photograph, which sits just off it, buried inside
  // the slab.
  slabGeometry.translate(0, 0, -(CARD_DEPTH + CARD_BEVEL));
  slabGeometry.computeVertexNormals();

  const faceGeometry = new THREE.PlaneGeometry(CARD_W - 0.055, CARD_H - 0.055);
  const glowGeometry = new THREE.PlaneGeometry(CARD_W * 2.5, CARD_H * 2.0);
  const glowTexture = radialTexture();

  const slabMaterial = new THREE.MeshStandardMaterial({
    color: 0x14261c,
    roughness: 0.62,
    metalness: 0.12,
  });

  interface CardNode {
    group: THREE.Group;
    face: THREE.Mesh;
    glow: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
    faceMaterial: THREE.MeshStandardMaterial;
  }

  const ring = new THREE.Group();
  scene.add(ring);
  const nodes: CardNode[] = [];
  const faceMeshes: THREE.Mesh[] = [];

  for (let i = 0; i < count; i++) {
    const card = cards[i];
    const group = new THREE.Group();

    const glowMaterial = new THREE.MeshBasicMaterial({
      map: glowTexture,
      color: new THREE.Color(card.statusColor),
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.z = -0.09;
    glow.renderOrder = -1;
    group.add(glow);

    group.add(new THREE.Mesh(slabGeometry, slabMaterial));

    const faceMaterial = new THREE.MeshStandardMaterial({
      map: drawFace(images[i], card),
      roughness: 0.86,
      metalness: 0.0,
      // Alpha-to-coverage rather than blending: the only transparent pixels
      // are the rounded corners, and cutting them with the multisample mask
      // keeps the cards depth-sorted against each other for free.
      transparent: false,
      alphaTest: 0.5,
      alphaToCoverage: true,
    });
    const face = new THREE.Mesh(faceGeometry, faceMaterial);
    face.position.z = 0.004;
    face.userData.index = i;
    group.add(face);
    faceMeshes.push(face);

    ring.add(group);
    nodes.push({ group, face, glow: glow as CardNode['glow'], faceMaterial });
  }

  /* ---------------------------------------------------------------- floor */

  // A pool of light rather than a surface: it grounds the ring without
  // pretending the cards are standing on anything.
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 18),
    new THREE.MeshBasicMaterial({
      map: radialTexture(256, 0, 0.95),
      color: new THREE.Color('#173226'),
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -CARD_H / 2 - 0.24;
  floor.renderOrder = -2;
  scene.add(floor);

  /* ------------------------------------------------------------- movement */

  /** Where the ring is being asked to go, in cards. Fractional while dragging. */
  let targetIndex = 0;
  /** Where it actually is. */
  let currentIndex = 0;
  let reportedIndex = -1;
  const pointer = { x: 0, y: 0 };
  const pointerEased = { x: 0, y: 0 };
  let scrollOffset = 0;
  let scrollEased = 0;
  let hovered = -1;

  /** Cards are packed tighter than the fixed pitch if there are enough to need it. */
  const slotAngle = Math.min((Math.PI * 2) / count, SLOT_ANGLE);

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  let viewWidth = 1;
  let viewHeight = 1;

  function apply() {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      // Slots away from the front, taking the short way round the ring.
      let offset = i - currentIndex;
      offset -= count * Math.round(offset / count);
      const angle = offset * slotAngle;

      const onStage = Math.abs(angle) < VISIBLE_ANGLE;
      node.group.visible = onStage;
      if (!onStage) continue;

      // 1 at the front of the ring, 0 by the time a card is a full slot away.
      const distance = Math.abs(offset);
      const focus = 1 - smoothstep(clamp(distance, 0, 1));
      const hover = i === hovered ? 1 : 0;
      const lift = Math.max(focus, hover * 0.5);

      const radius = RING_RADIUS + FOCUS_PUSH * focus;
      node.group.position.set(Math.sin(angle) * radius, FOCUS_LIFT * lift, Math.cos(angle) * radius);
      node.group.rotation.y = angle;
      // A slight lean back, so the cards read as standing rather than floating,
      // easing to upright as one comes to the front.
      node.group.rotation.x = -0.055 * (1 - focus * 0.75);
      const scale = 1 + (FOCUS_SCALE - 1) * focus + 0.03 * hover;
      node.group.scale.setScalar(scale);

      // Faded by how squarely the card faces the camera as well as by focus.
      // A glow is a flat plane behind a flat card, so one on the far side of
      // the ring would otherwise show as a pale rectangle floating in a gap.
      const facing = Math.max(0, Math.cos(angle));
      node.glow.material.opacity = (0.06 + 0.52 * focus + 0.09 * hover) * facing * facing;
      // Cards away from the front are dimmed rather than hidden: the ring
      // should read as receding, not as a row of equally-lit thumbnails.
      const dim = 0.55 + 0.45 * Math.max(focus, 0.3 + 0.35 * hover);
      node.faceMaterial.color.setScalar(dim);
    }

    const px = pointerEased.x;
    const py = pointerEased.y;
    camera.position.set(px * 0.85, CAMERA_HEIGHT - py * 0.42 + scrollEased * 0.3, RING_RADIUS + CAMERA_DISTANCE);
    camera.lookAt(LOOK_AT);
    // A touch of roll, which is what sells the parallax as a camera move
    // rather than a layer sliding.
    camera.rotation.z += px * 0.012;
  }

  /* ------------------------------------------------------- adaptive quality */

  let previousFrameAt = 0;
  let sampledFrames = 0;
  let sampledTime = 0;
  let slowFrames = 0;
  let badWindows = 0;
  let degraded = false;
  let cooldown = 0;

  function sampleFrameRate(now: number) {
    const gap = previousFrameAt ? now - previousFrameAt : 0;
    previousFrameAt = now;
    if (cooldown > 0) {
      cooldown--;
      return;
    }
    if (gap <= 0) return;
    sampledTime += gap;
    sampledFrames++;
    if (gap > SLOW_FRAME_MS) slowFrames++;
    if (sampledFrames < SAMPLE_WINDOW && sampledTime < SAMPLE_WINDOW_MS) return;

    const fraction = slowFrames / sampledFrames;
    sampledFrames = 0;
    sampledTime = 0;
    slowFrames = 0;
    if (fraction < DEGRADE_SLOW_FRACTION) {
      badWindows = 0;
      return;
    }
    if (!degraded) {
      degraded = true;
      renderer.setPixelRatio(Math.min(dpr, 1));
      for (const node of nodes) node.glow.visible = false;
      cooldown = 12;
      return;
    }
    if (fraction >= ABANDON_SLOW_FRACTION && ++badWindows >= BAD_WINDOWS_BEFORE_ABANDON) {
      badWindows = 0;
      onTooSlow?.();
    }
  }

  /* ------------------------------------------------------------- the loop */

  let frame = 0;
  let active = true;
  let disposed = false;
  let firstFrameSent = false;
  let settled = false;

  function draw(now: number) {
    frame = 0;
    if (disposed) return;
    sampleFrameRate(now);

    const before = currentIndex;
    currentIndex += (targetIndex - currentIndex) * EASE;
    pointerEased.x += (pointer.x - pointerEased.x) * EASE;
    pointerEased.y += (pointer.y - pointerEased.y) * EASE;
    scrollEased += (scrollOffset - scrollEased) * EASE;

    const moving =
      Math.abs(targetIndex - currentIndex) > 0.0004 ||
      Math.abs(pointer.x - pointerEased.x) > 0.0008 ||
      Math.abs(pointer.y - pointerEased.y) > 0.0008 ||
      Math.abs(scrollOffset - scrollEased) > 0.0008;
    if (!moving) {
      currentIndex = targetIndex;
      pointerEased.x = pointer.x;
      pointerEased.y = pointer.y;
      scrollEased = scrollOffset;
    }

    apply();
    renderer.render(scene, camera);

    if (!firstFrameSent) {
      firstFrameSent = true;
      onFirstFrame?.();
    }

    const nearest = ((Math.round(currentIndex) % count) + count) % count;
    if (nearest !== reportedIndex && Math.abs(currentIndex - Math.round(currentIndex)) < 0.5) {
      reportedIndex = nearest;
      onFocus?.(nearest);
    }

    settled = !moving && before === currentIndex;
    if (moving) invalidate();
  }

  function invalidate() {
    if (disposed || !active || frame) return;
    // A frame resuming an idle scene follows an arbitrarily long pause, which
    // says nothing about how fast this device renders.
    if (settled) previousFrameAt = 0;
    settled = false;
    frame = requestAnimationFrame(draw);
  }

  /* -------------------------------------------------------------- pointer */

  let dragging = false;
  let dragMoved = 0;
  let dragStartX = 0;
  let dragStartIndex = 0;
  let pointerId: number | null = null;

  function toNdc(event: PointerEvent | MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    ndc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    return ndc;
  }

  function pick(event: PointerEvent | MouseEvent) {
    raycaster.setFromCamera(toNdc(event), camera);
    // Only what is on stage: a raycast does not itself skip hidden objects, and
    // a card culled round the back would otherwise still be clickable.
    const candidates = faceMeshes.filter((mesh) => nodes[mesh.userData.index as number].group.visible);
    const hit = raycaster.intersectObjects(candidates, false)[0];
    return hit ? (hit.object.userData.index as number) : -1;
  }

  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    dragging = true;
    dragMoved = 0;
    dragStartX = event.clientX;
    dragStartIndex = targetIndex;
    pointerId = event.pointerId;
    canvas.setPointerCapture(event.pointerId);
    canvas.style.cursor = 'grabbing';
  };

  const onPointerMove = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = clamp(((event.clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
    pointer.y = clamp(((event.clientY - rect.top) / rect.height) * 2 - 1, -1, 1);

    if (dragging) {
      const dx = event.clientX - dragStartX;
      dragMoved = Math.max(dragMoved, Math.abs(dx));
      targetIndex = dragStartIndex - dx / DRAG_PER_CARD;
    } else if (event.pointerType === 'mouse') {
      const index = pick(event);
      if (index !== hovered) {
        hovered = index;
        canvas.style.cursor = index >= 0 ? 'pointer' : 'grab';
      }
    }
    invalidate();
  };

  const endDrag = (event: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    if (pointerId !== null && canvas.hasPointerCapture(pointerId)) {
      canvas.releasePointerCapture(pointerId);
    }
    pointerId = null;
    canvas.style.cursor = hovered >= 0 ? 'pointer' : 'grab';
    // A drag settles on whole cards; a tap is not a drag.
    if (dragMoved > 6) {
      targetIndex = Math.round(targetIndex);
    } else {
      const index = pick(event);
      if (index >= 0) {
        const front = ((Math.round(targetIndex) % count) + count) % count;
        if (index === front) onActivate?.(index);
        else targetIndex = Math.round(targetIndex) + shortestWay(front, index);
      }
    }
    invalidate();
  };

  /** Turns towards a card the short way round rather than unwinding the ring. */
  function shortestWay(from: number, to: number) {
    let delta = (to - from) % count;
    if (delta > count / 2) delta -= count;
    if (delta < -count / 2) delta += count;
    return delta;
  }

  const onPointerLeave = () => {
    pointer.x = 0;
    pointer.y = 0;
    if (hovered !== -1) {
      hovered = -1;
      canvas.style.cursor = 'grab';
    }
    invalidate();
  };

  const onWheel = (event: WheelEvent) => {
    // Only horizontal intent steals the wheel. Vertical scrolling has to keep
    // moving the page, or the gallery becomes a trap halfway down it.
    if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
    event.preventDefault();
    targetIndex = Math.round(targetIndex + Math.sign(event.deltaX));
    invalidate();
  };

  canvas.style.cursor = 'grab';
  canvas.style.touchAction = 'pan-y';
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('pointerleave', onPointerLeave);
  canvas.addEventListener('wheel', onWheel, { passive: false });

  /* --------------------------------------------------------------- public */

  invalidate();

  return {
    resize(width, height) {
      viewWidth = Math.max(1, width);
      viewHeight = Math.max(1, height);
      renderer.setSize(viewWidth, viewHeight, false);
      camera.aspect = viewWidth / viewHeight;
      // Narrow viewports would otherwise crop the ring to a sliver of one
      // card, so the camera backs off as the frame gets tall.
      camera.fov = clamp(38 * Math.max(1, 1.05 / camera.aspect), 38, 62);
      camera.updateProjectionMatrix();
      invalidate();
    },
    setActive(next) {
      if (next === active) return;
      active = next;
      if (active) {
        previousFrameAt = 0;
        invalidate();
      } else if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    },
    focus(index) {
      const front = ((Math.round(targetIndex) % count) + count) % count;
      targetIndex = Math.round(targetIndex) + shortestWay(front, ((index % count) + count) % count);
      invalidate();
    },
    step(delta) {
      targetIndex = Math.round(targetIndex) + delta;
      invalidate();
    },
    setScroll(offset) {
      scrollOffset = clamp(offset, -1, 1);
      invalidate();
    },
    dispose() {
      disposed = true;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', endDrag);
      canvas.removeEventListener('pointercancel', endDrag);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      canvas.removeEventListener('wheel', onWheel);
      slabGeometry.dispose();
      faceGeometry.dispose();
      glowGeometry.dispose();
      glowTexture.dispose();
      slabMaterial.dispose();
      floor.geometry.dispose();
      (floor.material as THREE.MeshBasicMaterial).map?.dispose();
      (floor.material as THREE.Material).dispose();
      for (const node of nodes) {
        node.faceMaterial.map?.dispose();
        node.faceMaterial.dispose();
        node.glow.material.dispose();
      }
      renderer.dispose();
    },
  };
}
