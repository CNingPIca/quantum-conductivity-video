// 数学 / 动画小工具。大部分移植自 mexicat/pdoom-video 的 app/src/engine/util.ts
// (MIT License, Copyright (c) 2026 Giacomo Magnanini)。
// 一切都是时间（或种子）的纯函数，保证逐帧渲染结果确定。

export const clamp = (x: number, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const invLerp = (a: number, b: number, x: number) => (a === b ? 0 : (x - a) / (b - a));
export const remap = (x: number, a: number, b: number, c: number, d: number, clampIt = true) => {
  const t = invLerp(a, b, x);
  return lerp(c, d, clampIt ? clamp(t) : t);
};
export const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const fract = (x: number) => x - Math.floor(x);
export const mod = (x: number, m: number) => ((x % m) + m) % m;
export const TAU = Math.PI * 2;

export type Ease = (t: number) => number;
export const ease = {
  linear: (t: number) => t,
  inQuad: (t: number) => t * t,
  outQuad: (t: number) => 1 - (1 - t) * (1 - t),
  inOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  inCubic: (t: number) => t * t * t,
  outCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outQuart: (t: number) => 1 - Math.pow(1 - t, 4),
  outQuint: (t: number) => 1 - Math.pow(1 - t, 5),
  inExpo: (t: number) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
  outExpo: (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inOutExpo: (t: number) =>
    t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
  outBack: (t: number, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
};

/** x 在 [a, b] 区间内的缓动进度（已钳制） */
export const prog = (x: number, a: number, b: number, fn: Ease = ease.linear) => fn(clamp((x - a) / (b - a)));

/** 阻尼弹簧对阶跃的响应（0 → 1，带过冲） */
export const springStep = (t: number, freq = 4, damping = 0.35) => {
  if (t <= 0) return 0;
  const w = TAU * freq;
  return 1 - Math.exp(-damping * w * t) * Math.cos(w * Math.sqrt(1 - damping * damping) * t);
};

/** 事件后的指数衰减脉冲（t0 处为 1，半衰期 hl，单位与 t 相同） */
export const pulse = (t: number, t0: number, hl = 4) => (t < t0 ? 0 : Math.pow(0.5, (t - t0) / hl));

/** 无状态哈希 → [0,1) */
export function hash(...xs: number[]) {
  let h = 2166136261 >>> 0;
  for (const x of xs) {
    h ^= Math.floor(x * 1000003) | 0;
    h = Math.imul(h, 16777619);
    h ^= h >>> 13;
    h = Math.imul(h, 0x5bd1e995);
    h ^= h >>> 15;
  }
  return (h >>> 0) / 4294967296;
}

const fadeQ = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
export function noise1(x: number, seed = 0) {
  const i = Math.floor(x);
  const f = x - i;
  return lerp(hash(i, seed) * 2 - 1, hash(i + 1, seed) * 2 - 1, fadeQ(f));
}
export function noise2(x: number, y: number, seed = 0) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = fadeQ(x - ix);
  const fy = fadeQ(y - iy);
  const a = hash(ix, iy, seed);
  const b = hash(ix + 1, iy, seed);
  const c = hash(ix, iy + 1, seed);
  const d = hash(ix + 1, iy + 1, seed);
  return lerp(lerp(a, b, fx), lerp(c, d, fx), fy) * 2 - 1;
}

/** 关键帧插值：key i 的 ease 决定通往 key i 的那一段 */
export type Key = [time: number, value: number, easeFn?: Ease];
export function keys(t: number, ks: Key[]): number {
  if (ks.length === 0) return 0;
  if (t <= ks[0][0]) return ks[0][1];
  for (let i = 1; i < ks.length; i++) {
    const k = ks[i];
    if (t <= k[0]) {
      const p = ks[i - 1];
      const u = (t - p[0]) / (k[0] - p[0]);
      return lerp(p[1], k[1], (k[2] ?? ease.inOutCubic)(u));
    }
  }
  return ks[ks.length - 1][1];
}

export type V2 = {x: number; y: number};
export const dist = (a: V2, b: V2) => Math.hypot(a.x - b.x, a.y - b.y);

export function polylineLengths(pts: V2[]) {
  const L = new Float32Array(pts.length);
  for (let i = 1; i < pts.length; i++) L[i] = L[i - 1] + dist(pts[i - 1], pts[i]);
  return L;
}

export function pointAtLength(pts: V2[], L: Float32Array, s: number): {x: number; y: number; angle: number} {
  const n = pts.length;
  if (n === 0) return {x: 0, y: 0, angle: 0};
  if (n === 1) return {x: pts[0].x, y: pts[0].y, angle: 0};
  s = clamp(s, 0, L[n - 1]);
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (L[mid] < s) lo = mid;
    else hi = mid;
  }
  const a = pts[lo];
  const b = pts[hi];
  const seg = L[hi] - L[lo];
  const u = seg > 0 ? (s - L[lo]) / seg : 0;
  return {x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), angle: Math.atan2(b.y - a.y, b.x - a.x)};
}

/** 折线截取到长度 s（用于“画笔”逐步画出） */
export function partialPolyline(pts: V2[], L: Float32Array, s: number): V2[] {
  const out: V2[] = [];
  if (pts.length === 0) return out;
  out.push(pts[0]);
  for (let i = 1; i < pts.length; i++) {
    if (L[i] <= s) out.push(pts[i]);
    else {
      const p = pointAtLength(pts, L, s);
      out.push({x: p.x, y: p.y});
      break;
    }
  }
  return out;
}

export const ptsAttr = (pts: V2[]) => pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
