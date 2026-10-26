"use client";

/**
 * "Colors follow the background" — the idea behind Wallpaper Engine's "adjust Windows color" and
 * Android's Material You: the app's accent color (every `brand-*` class) is taken from the person's
 * background (uploaded photo or preset gradient) instead of the fixed indigo.
 *
 * Like Material You, the background is broken down into a few clearly different candidate colors
 * ("swatches", e.g. the green of a uniform AND the orange of a floor), ranked by how much of the
 * picture they cover and how colorful they are. The best one is used automatically; Settings shows
 * all of them so the person can pick another. The chosen color is then expanded into a full
 * light-to-dark scale (brand-50…700) that keeps text readable.
 *
 * How it is applied: tailwind.config.ts defines brand-50…700 as `rgb(var(--brand-N) / <alpha>)`,
 * with the indigo defaults in globals.css; turning this on overrides those variables on <html>.
 * Opt-in and per device (like light/dark mode), so nobody's app changes color without choosing it.
 */

const PREF_KEY = "adaptive-colors";
const CHOICE_KEY = "adaptive-colors-choice";
const CACHE_PREFIX = "adaptive-colors-swatches:";
export const ADAPTIVE_COLORS_EVENT = "adaptive-colors-change";

export const BRAND_SHADES = [50, 100, 300, 400, 500, 600, 700] as const;
type Shade = (typeof BRAND_SHADES)[number];
export type RGB = [number, number, number];
export type Palette = Record<Shade, RGB>;

/** What a background is identified by (for caching and for remembering the person's pick). */
export interface BackgroundSource {
  url?: string | null;
  gradientCss?: string | null;
}
export function sourceKey(source: BackgroundSource): string | null {
  return source.url ?? source.gradientCss ?? null;
}

// ---- preferences (this device only) ----

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeStorage(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // storage blocked (private mode) — the choice just won't survive a reload
  }
}
function notify() {
  window.dispatchEvent(new Event(ADAPTIVE_COLORS_EVENT));
}

export function getAdaptiveColorsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return readStorage(PREF_KEY) === "on";
}

export function setAdaptiveColorsEnabled(on: boolean) {
  writeStorage(PREF_KEY, on ? "on" : "off");
  notify();
}

/** The swatch the person picked for this background, or null = automatic (the top-ranked one).
 *  Tied to the background it was picked from, so changing the background goes back to automatic. */
export function getChosenColor(source: BackgroundSource): RGB | null {
  const key = sourceKey(source);
  const raw = readStorage(CHOICE_KEY);
  if (!key || !raw) return null;
  try {
    const parsed = JSON.parse(raw) as { source: string; color: RGB };
    return parsed.source === key ? parsed.color : null;
  } catch {
    return null;
  }
}

export function setChosenColor(source: BackgroundSource, color: RGB | null) {
  const key = sourceKey(source);
  writeStorage(CHOICE_KEY, key && color ? JSON.stringify({ source: key, color }) : null);
  notify();
}

/** Overrides the brand color variables; null puts the default indigo back. */
export function applyPalette(palette: Palette | null) {
  const style = document.documentElement.style;
  for (const shade of BRAND_SHADES) {
    if (palette) style.setProperty(`--brand-${shade}`, palette[shade].join(" "));
    else style.removeProperty(`--brand-${shade}`);
  }
}

// ---- color math ----

function rgbToHsl([r, g, b]: RGB): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): RGB {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

function luminance([r, g, b]: RGB): number {
  const c = [r, g, b].map((v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

/** Contrast of a color against white (white text on it, or it as text on a white card). */
function contrastWithWhite(rgb: RGB): number {
  return 1.05 / (luminance(rgb) + 0.05);
}

function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/**
 * A full brand scale from one color: its hue (and a tamed saturation), at the same lightness steps as
 * the default indigo scale. The darker shades are pushed darker when needed so white text on brand-600
 * buttons, and brand-600/700 text on white, stays readable (≥ 4.5:1) — a yellow or light-green
 * background would otherwise produce unreadable buttons.
 */
export function buildPalette(source: RGB): Palette {
  const [h, s0, sourceL] = rgbToHsl(source);
  // Grayish backgrounds keep a quiet, slate-like accent instead of being pushed into a loud hue.
  // Muted colors (olive, khaki) keep their own saturation so they still look like themselves.
  const s = s0 < 0.25 ? Math.max(0.14, s0) : Math.min(0.85, s0);
  const at = (l: number) => hslToRgb(h, s, l);
  const darkEnough = (l: number, min: number) => {
    let x = l;
    while (contrastWithWhite(at(x)) < min && x > 0.15) x -= 0.02;
    return x;
  };
  // brand-600 (buttons) keeps the picture's own lightness when it is a mid/dark color — a dark olive
  // lifted to 50% lightness turns into khaki and no longer looks like the uniform it came from.
  const l600 = darkEnough(Math.min(0.5, Math.max(0.28, sourceL)), 4.6);
  const l500 = darkEnough(Math.min(0.6, l600 + 0.1), 3);
  const l700 = darkEnough(Math.min(0.42, l600 - 0.07), 6);
  return {
    50: at(0.965),
    100: at(0.925),
    300: at(0.8),
    400: at(0.7),
    500: at(l500),
    600: at(l600),
    700: at(l700),
  };
}

// ---- breaking a picture down into candidate colors ----

const MAX_SWATCHES = 4;

/**
 * Up to 4 clearly different colors of a picture, best first (same approach as Material You):
 *  1. ignore near-black, near-white and gray pixels (walls, paper, shadows);
 *  2. cluster the rest into groups of similar color (k-means), so each real area of the picture —
 *     a uniform, a desk, skin, trees — becomes one group with its true average color (grouping by hue
 *     alone mixed e.g. an olive uniform with nearby skin and wood tones);
 *  3. score each group mostly by how much of the picture it covers, plus a bonus for being colorful;
 *  4. pick the best groups that are far enough apart in hue to look different — starting strict and
 *     relaxing until 4 are found or nothing is left.
 * An all-gray picture gives one swatch: its average color.
 */
export function extractSwatches(data: Uint8ClampedArray): RGB[] {
  const points: RGB[] = [];
  const avg = [0, 0, 0];
  let total = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    const rgb: RGB = [data[i], data[i + 1], data[i + 2]];
    avg[0] += rgb[0];
    avg[1] += rgb[1];
    avg[2] += rgb[2];
    total++;
    const c = (Math.max(...rgb) - Math.min(...rgb)) / 255;
    const l = (Math.max(...rgb) + Math.min(...rgb)) / 510;
    if (c < 0.1 || l < 0.08 || l > 0.95) continue;
    points.push(rgb);
  }
  if (total === 0) return [];
  if (points.length < total * 0.02) return [avg.map((v) => Math.round(v / total)) as RGB];

  // k-means, started from points spread evenly across the hue circle (deterministic: same picture,
  // same colors every time).
  // Deliberately more groups than needed: similar ones are joined below, and starting finer keeps the
  // result stable (with 8, a mid-sized area like a uniform could get absorbed into its neighbours).
  const K = Math.min(16, points.length);
  const byHue = [...points].sort((a, b) => rgbToHsl(a)[0] - rgbToHsl(b)[0]);
  let centers: RGB[] = Array.from({ length: K }, (_, i) => byHue[Math.floor(((i + 0.5) * byHue.length) / K)]);
  let members: RGB[][] = [];
  for (let iter = 0; iter < 12; iter++) {
    members = centers.map(() => []);
    for (const p of points) {
      let best = 0;
      let bestD = Infinity;
      centers.forEach((c, j) => {
        const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2;
        if (d < bestD) {
          bestD = d;
          best = j;
        }
      });
      members[best].push(p);
    }
    const next = members
      .filter((m) => m.length > 0)
      .map((m) => [0, 1, 2].map((ch) => m.reduce((s, p) => s + p[ch], 0) / m.length) as RGB);
    if (next.length === centers.length && next.every((c, j) => c.every((v, ch) => Math.abs(v - centers[j][ch]) < 0.5))) break;
    centers = next;
  }

  // One real area often ends up as two groups (a lit and a shaded part of the same uniform or desk) —
  // join groups whose colors are close, so its full size counts toward its score.
  type Group = { color: RGB; size: number };
  const groups: Group[] = members
    .filter((m) => m.length > 0)
    .map((m) => ({ color: [0, 1, 2].map((ch) => m.reduce((s, p) => s + p[ch], 0) / m.length) as RGB, size: m.length }));
  const MERGE_DISTANCE = 45;
  let merged = true;
  while (merged) {
    merged = false;
    outer: for (let a = 0; a < groups.length; a++) {
      for (let b = a + 1; b < groups.length; b++) {
        const [x, y] = [groups[a], groups[b]];
        if (Math.hypot(x.color[0] - y.color[0], x.color[1] - y.color[1], x.color[2] - y.color[2]) < MERGE_DISTANCE) {
          const size = x.size + y.size;
          groups[a] = { color: [0, 1, 2].map((ch) => (x.color[ch] * x.size + y.color[ch] * y.size) / size) as RGB, size };
          groups.splice(b, 1);
          merged = true;
          break outer;
        }
      }
    }
  }

  const candidates = [];
  for (const group of groups) {
    const share = group.size / total;
    if (share < 0.01) continue;
    const color = group.color.map(Math.round) as RGB;
    const chroma = (Math.max(...color) - Math.min(...color)) / 255;
    const score = share * 70 + (chroma - 0.3) * (chroma < 0.3 ? 10 : 30);
    candidates.push({ hue: rgbToHsl(color)[0], score, color });
  }
  candidates.sort((a, b) => b.score - a.score);

  let picked: typeof candidates = [];
  // Hue differences in a real photo are often small (an olive uniform and an orange desk are under 20°
  // apart), so the last step goes down to 15° — the same floor Material You uses.
  for (const minDistance of [90, 60, 45, 30, 20, 15]) {
    picked = [];
    for (const c of candidates) {
      if (picked.every((p) => hueDistance(p.hue, c.hue) >= minDistance)) picked.push(c);
      if (picked.length === MAX_SWATCHES) break;
    }
    if (picked.length === MAX_SWATCHES) break;
  }
  if (picked.length > 0) return picked.map((p) => p.color);
  return [avg.map((v) => Math.round(v / total)) as RGB];
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // the storage bucket allows it; needed to read pixels back
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function readCachedSwatches(key: string): RGB[] | null {
  const raw = readStorage(CACHE_PREFIX + key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as RGB[];
  } catch {
    return null;
  }
}

/** Swatches of the most recent background (only one is cached) — used at startup, before the team
 *  data has loaded, so the app doesn't open in indigo and then switch. */
export function lastCachedSource(): { key: string; swatches: RGB[] } | null {
  try {
    const k = Object.keys(window.localStorage).find((x) => x.startsWith(CACHE_PREFIX));
    if (!k) return null;
    const swatches = readCachedSwatches(k.slice(CACHE_PREFIX.length));
    return swatches ? { key: k.slice(CACHE_PREFIX.length), swatches } : null;
  } catch {
    return null;
  }
}

/** The candidate colors of a background, cached per background so it is only analysed once. */
export async function swatchesForBackground(source: BackgroundSource): Promise<RGB[]> {
  const key = sourceKey(source);
  if (!key) return [];
  const cached = readCachedSwatches(key);
  if (cached) return cached;

  const SIZE = 64;
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [];

  if (source.url) {
    try {
      const img = await loadImage(source.url);
      ctx.drawImage(img, 0, 0, SIZE, SIZE);
    } catch {
      return [];
    }
  } else {
    const colors = (source.gradientCss ?? "").match(/#[0-9a-f]{6}/gi) ?? [];
    if (colors.length === 0) return [];
    const gradient = ctx.createLinearGradient(0, 0, SIZE, SIZE);
    colors.forEach((c, i) => gradient.addColorStop(colors.length === 1 ? 0 : i / (colors.length - 1), c));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, SIZE, SIZE);
  }

  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, SIZE, SIZE).data;
  } catch {
    return []; // a cross-origin image without permission — keep the default colors
  }
  const swatches = extractSwatches(data);
  // Only the latest background is worth keeping.
  try {
    for (const k of Object.keys(window.localStorage)) {
      if (k.startsWith(CACHE_PREFIX)) window.localStorage.removeItem(k);
    }
  } catch {
    // ignore
  }
  writeStorage(CACHE_PREFIX + key, JSON.stringify(swatches));
  return swatches;
}

/** The color to use: the person's pick for this background if it is still one of its swatches, else the best swatch. */
export function resolveSeed(source: BackgroundSource, swatches: RGB[]): RGB | null {
  const chosen = getChosenColor(source);
  if (chosen && swatches.some((s) => s.join() === chosen.join())) return chosen;
  return swatches[0] ?? null;
}
