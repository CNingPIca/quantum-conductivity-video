import React, {useLayoutEffect, useRef} from 'react';
import {useInk} from '../theme';
import {spark as spark2d, ember as ember2d, particles as particles2d} from './fx';
import {clamp, Ease, ease, lerp, V2} from './util';

/* ------------------------------------------------------------------
 * 轻量透视引擎：世界 y 轴向上；相机 eye → target。
 * 用 Canvas2D 画发丝线 / 版画球体 / 火花，按深度做雾化和线宽变化，
 * 以获得参考片里那种曲线、曲面与空间纵深感（不需要 WebGL）。
 * ------------------------------------------------------------------ */

export type V3 = [number, number, number];
export const v3 = (x: number, y: number, z: number): V3 => [x, y, z];
export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const len = (a: V3) => Math.sqrt(dot(a, a));
export const norm = (a: V3): V3 => mul(a, 1 / (len(a) || 1));
export const lerp3 = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

export type Proj = {x: number; y: number; z: number; s: number};
export type Cam3 = {eye: V3; target: V3; fov: number; roll: number};
export type Lens = {
  cam: Cam3;
  F: number;
  fwd: V3;
  right: V3;
  up: V3;
  project: (p: V3) => Proj;
};

export function lens(cam: Cam3): Lens {
  const fwd = norm(sub(cam.target, cam.eye));
  let right = cross(fwd, [0, 1, 0]);
  if (len(right) < 1e-4) right = [1, 0, 0];
  right = norm(right);
  let up = cross(right, fwd);
  const r = (cam.roll * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  const r2 = add(mul(right, c), mul(up, s));
  up = sub(mul(up, c), mul(right, s));
  right = r2;
  const F = 540 / Math.tan(((cam.fov / 2) * Math.PI) / 180);
  return {
    cam,
    F,
    fwd,
    right,
    up,
    project: (p: V3) => {
      const d = sub(p, cam.eye);
      const z = dot(d, fwd);
      return {x: 960 + (F * dot(d, right)) / z, y: 540 - (F * dot(d, up)) / z, z, s: F / z};
    },
  };
}

/** 球坐标绕目标环绕：az 方位角、el 仰角（度），r 距离 */
export const orbit = (target: V3, r: number, az: number, el: number): V3 => {
  const a = (az * Math.PI) / 180;
  const e = (el * Math.PI) / 180;
  return [target[0] + r * Math.cos(e) * Math.sin(a), target[1] + r * Math.sin(e), target[2] + r * Math.cos(e) * Math.cos(a)];
};

export type Cam3Key = {f: number; eye?: V3; target?: V3; fov?: number; roll?: number; ez?: Ease};
export function cam3At(f: number, ks: Cam3Key[]): Cam3 {
  let cur: Cam3 = {eye: [0, 0, 1000], target: [0, 0, 0], fov: 45, roll: 0};
  const full = ks.map((k) => (cur = {eye: k.eye ?? cur.eye, target: k.target ?? cur.target, fov: k.fov ?? cur.fov, roll: k.roll ?? cur.roll}));
  if (f <= ks[0].f) return full[0];
  for (let i = 1; i < ks.length; i++) {
    if (f <= ks[i].f) {
      const e = (ks[i].ez ?? ease.inOutCubic)((f - ks[i - 1].f) / (ks[i].f - ks[i - 1].f));
      const a = full[i - 1];
      const b = full[i];
      return {eye: lerp3(a.eye, b.eye, e), target: lerp3(a.target, b.target, e), fov: lerp(a.fov, b.fov, e), roll: lerp(a.roll, b.roll, e)};
    }
  }
  return full[full.length - 1];
}

/** 屏幕运动量（用于开关运动模糊） */
export function cam3Speed(f: number, ks: Cam3Key[]) {
  const a = lens(cam3At(f, ks));
  const b = lens(cam3At(f - 1, ks));
  const p = a.cam.target;
  const pa = a.project(p);
  const pb = b.project(p);
  const q: V3 = add(p, mul(a.right, 300));
  const qa = a.project(q);
  const qb = b.project(q);
  return Math.max(Math.hypot(pa.x - pb.x, pa.y - pb.y), Math.hypot(qa.x - qb.x, qa.y - qb.y));
}

/* ---------------- 绘制上下文 ---------------- */
export type Pen = {
  ctx: CanvasRenderingContext2D;
  L: Lens;
  fg: [number, number, number];
  bg: string;
  paper: boolean;
  fogNear: number;
  fogFar: number;
  near: number;
  nearFade: number;
};

const fogA = (P: Pen, z: number) => clamp(1 - (z - P.fogNear) / (P.fogFar - P.fogNear), 0, 1) * clamp((z - P.near) / (P.nearFade - P.near), 0, 1);
const rgba = (c: [number, number, number], a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

/** 3D 线段（近平面裁剪、按深度雾化，线宽随距离变化） */
export function line3(P: Pen, a: V3, b: V3, o: {w?: number; a?: number; color?: [number, number, number]; dash?: number[]} = {}) {
  const L = P.L;
  let pa = L.project(a);
  let pb = L.project(b);
  if (pa.z < P.near && pb.z < P.near) return;
  if (pa.z < P.near || pb.z < P.near) {
    const da = dot(sub(a, L.cam.eye), L.fwd);
    const db = dot(sub(b, L.cam.eye), L.fwd);
    const t = (P.near - da) / (db - da);
    const m = lerp3(a, b, t);
    if (pa.z < P.near) pa = L.project(m);
    else pb = L.project(m);
  }
  const z = (pa.z + pb.z) / 2;
  const alpha = (o.a ?? 1) * fogA(P, z);
  if (alpha <= 0.01) return;
  const ctx = P.ctx;
  ctx.strokeStyle = rgba(o.color ?? P.fg, alpha);
  ctx.lineWidth = clamp((o.w ?? 1.2) * Math.sqrt(L.F / z), 0.5, 4);
  if (o.dash) ctx.setLineDash(o.dash);
  ctx.beginPath();
  ctx.moveTo(pa.x, pa.y);
  ctx.lineTo(pb.x, pb.y);
  ctx.stroke();
  if (o.dash) ctx.setLineDash([]);
}

/** 3D 折线 */
export function poly3(P: Pen, pts: V3[], o: {w?: number; a?: number; color?: [number, number, number]; closed?: boolean; dash?: number[]} = {}) {
  for (let i = 1; i < pts.length; i++) line3(P, pts[i - 1], pts[i], o);
  if (o.closed && pts.length > 2) line3(P, pts[pts.length - 1], pts[0], o);
}

/** 3D 平面上的圆（normal 为法向） */
export function ring3(P: Pen, c: V3, r: number, normal: V3, o: {w?: number; a?: number; color?: [number, number, number]; seg?: number; dash?: number[]} = {}) {
  const n = norm(normal);
  let u = cross(n, [0, 1, 0]);
  if (len(u) < 1e-4) u = cross(n, [1, 0, 0]);
  u = norm(u);
  const v = cross(n, u);
  const seg = o.seg ?? 48;
  const pts: V3[] = [];
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    pts.push(add(c, add(mul(u, Math.cos(a) * r), mul(v, Math.sin(a) * r))));
  }
  poly3(P, pts, o);
}

/** 版画球体（离子）：遮挡底色 + 右下排线 + 轮廓；返回投影 */
export function sphere3(P: Pen, c: V3, r: number, o: {a?: number; solid?: boolean; label?: string} = {}) {
  const q = P.L.project(c);
  if (q.z < P.near) return null;
  const R = r * q.s;
  const alpha = (o.a ?? 1) * fogA(P, q.z);
  if (alpha <= 0.01 || R < 0.4) return q;
  const ctx = P.ctx;
  ctx.save();
  ctx.globalAlpha = alpha;
  if (R < 3) {
    ctx.fillStyle = rgba(P.fg, 0.8);
    ctx.beginPath();
    ctx.arc(q.x, q.y, Math.max(R, 0.8), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return q;
  }
  ctx.beginPath();
  ctx.arc(q.x, q.y, R, 0, Math.PI * 2);
  ctx.fillStyle = o.solid ? rgba(P.fg, 1) : P.bg;
  ctx.fill();
  if (!o.solid) {
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = rgba(P.fg, 0.75);
    ctx.lineWidth = Math.max(0.6, Math.min(1.2, R / 14));
    const gap = Math.max(2.6, R / 5.5);
    for (let d = -R * 1.5; d < R * 1.5; d += gap) {
      ctx.beginPath();
      ctx.moveTo(q.x + d - R, q.y - R);
      ctx.lineTo(q.x + d + R, q.y + R);
      ctx.stroke();
    }
    ctx.fillStyle = P.bg;
    ctx.beginPath();
    ctx.arc(q.x - R * 0.24, q.y - R * 0.24, R * 0.74, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.strokeStyle = rgba(P.fg, 0.95);
  ctx.lineWidth = Math.max(0.7, Math.min(1.6, R / 10));
  ctx.beginPath();
  ctx.arc(q.x, q.y, R, 0, Math.PI * 2);
  ctx.stroke();
  if (o.label && R > 8) {
    ctx.fillStyle = o.solid ? P.bg : rgba(P.fg, 1);
    ctx.font = `600 ${Math.round(R * 0.8)}px "IBM Plex Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(o.label, q.x - (o.solid ? 0 : R * 0.1), q.y + (o.solid ? 0 : R * 0.06));
  } else if (!o.solid && R > 6) {
    ctx.lineWidth = Math.max(0.8, R / 14);
    ctx.beginPath();
    ctx.moveTo(q.x - R * 0.52, q.y - R * 0.24);
    ctx.lineTo(q.x + R * 0.04, q.y - R * 0.24);
    ctx.moveTo(q.x - R * 0.24, q.y - R * 0.52);
    ctx.lineTo(q.x - R * 0.24, q.y + R * 0.04);
    ctx.stroke();
  }
  ctx.restore();
  return q;
}

/** 曲面线框：fn(u, v) → 点；画 nu 条 u 线、nv 条 v 线 */
export function mesh3(
  P: Pen,
  fn: (u: number, v: number) => V3,
  o: {nu?: number; nv?: number; res?: number; w?: number; a?: number; color?: [number, number, number]; vOnly?: boolean; uOnly?: boolean} = {},
) {
  const nu = o.nu ?? 16;
  const nv = o.nv ?? 16;
  const res = o.res ?? 40;
  if (!o.vOnly)
    for (let i = 0; i <= nu; i++) {
      const u = i / nu;
      const pts: V3[] = [];
      for (let k = 0; k <= res; k++) pts.push(fn(u, k / res));
      poly3(P, pts, o);
    }
  if (!o.uOnly)
    for (let j = 0; j <= nv; j++) {
      const v = j / nv;
      const pts: V3[] = [];
      for (let k = 0; k <= res; k++) pts.push(fn(k / res, v));
      poly3(P, pts, o);
    }
}

/** 透视下的火花（屏幕尺寸随距离变化） */
export function spark3(G: CanvasRenderingContext2D, L: Lens, p: V3, t: number, size = 1, I = 1, paper = false, minS = 0.25, maxS = 3) {
  const q = L.project(p);
  if (q.z < 20) return null;
  const s = clamp(size * q.s, minS, maxS);
  spark2d(G, q.x, q.y, t, s, I, paper);
  return q;
}
export function ember3(G: CanvasRenderingContext2D, L: Lens, p: V3, size = 1, I = 1, paper = false) {
  const q = L.project(p);
  if (q.z < 20) return null;
  ember2d(G, q.x, q.y, clamp(size * q.s, 0.2, 1.9), I, paper);
  return q;
}
export function particles3(G: CanvasRenderingContext2D, L: Lens, t: number, headAt: (tb: number) => V3 | null, o: Parameters<typeof particles2d>[3] = {}) {
  particles2d(
    G,
    t,
    (tb) => {
      const h = headAt(tb);
      if (!h) return null;
      const q = L.project(h);
      return q.z > 20 ? {x: q.x, y: q.y} : null;
    },
    o,
  );
}

/** 发光的 3D 折线 */
export function glow3(G: CanvasRenderingContext2D, L: Lens, pts: V3[], w = 1, I = 1, paper = false) {
  const ps: V2[] = [];
  for (const p of pts) {
    const q = L.project(p);
    if (q.z > 20) ps.push({x: q.x, y: q.y});
  }
  if (ps.length < 2 || I <= 0) return;
  const path = () => {
    G.beginPath();
    G.moveTo(ps[0].x, ps[0].y);
    for (let i = 1; i < ps.length; i++) G.lineTo(ps[i].x, ps[i].y);
  };
  if (paper) {
    path();
    G.strokeStyle = `rgba(255,77,18,${I})`;
    G.lineWidth = 2.4 * w;
    G.stroke();
    return;
  }
  path();
  G.strokeStyle = `rgba(194,29,11,${0.22 * I})`;
  G.lineWidth = 16 * w;
  G.stroke();
  G.strokeStyle = `rgba(255,77,18,${0.4 * I})`;
  G.lineWidth = 6 * w;
  G.stroke();
  G.strokeStyle = `rgba(255,138,61,${I})`;
  G.lineWidth = 2.4 * w;
  G.stroke();
  G.strokeStyle = `rgba(255,230,205,${0.7 * I})`;
  G.lineWidth = 0.9 * w;
  G.stroke();
}

/**
 * 空间层：两张画布——墨线（source-over）与发光（lighter）。
 * ink(P) 画发丝线/球体；glow(G, L) 画火花。
 */
/* ---------------- 仿辉光（bloom） ---------------- */
let BLOOM_A: HTMLCanvasElement | null = null;
let BLOOM_B: HTMLCanvasElement | null = null;
let BLOOM_C: HTMLCanvasElement | null = null;
const mk = (w: number, h: number) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
};

/**
 * 把发光层（以及可选的墨线层）缩小、模糊后叠加回来：两级半径（≈16px / ≈48px）。
 * amount ≈ 0.3 为常态，关键镜头脉冲到 1–1.6。
 */
export function bloomPass(dst: CanvasRenderingContext2D, glowSrc: HTMLCanvasElement | null, inkSrc: HTMLCanvasElement | null, amount: number, inkAmount = 0) {
  dst.setTransform(1, 0, 0, 1, 0, 0);
  dst.clearRect(0, 0, 1920, 1080);
  if (amount <= 0.01 && inkAmount <= 0.01) return;
  BLOOM_A = BLOOM_A ?? mk(480, 270);
  BLOOM_B = BLOOM_B ?? mk(480, 270);
  BLOOM_C = BLOOM_C ?? mk(240, 135);
  const A = BLOOM_A.getContext('2d')!;
  A.globalCompositeOperation = 'source-over';
  A.clearRect(0, 0, 480, 270);
  A.globalCompositeOperation = 'lighter';
  if (glowSrc && amount > 0.01) {
    A.globalAlpha = 1;
    A.drawImage(glowSrc, 0, 0, 480, 270);
  }
  if (inkSrc && inkAmount > 0.01) {
    A.globalAlpha = Math.min(1, inkAmount);
    A.drawImage(inkSrc, 0, 0, 480, 270);
  }
  A.globalAlpha = 1;
  const B = BLOOM_B.getContext('2d')!;
  B.clearRect(0, 0, 480, 270);
  B.filter = 'blur(4px)';
  B.drawImage(BLOOM_A, 0, 0);
  B.filter = 'none';
  const C = BLOOM_C.getContext('2d')!;
  C.clearRect(0, 0, 240, 135);
  C.filter = 'blur(6px)';
  C.drawImage(BLOOM_A, 0, 0, 240, 135);
  C.filter = 'none';
  dst.globalCompositeOperation = 'lighter';
  dst.imageSmoothingEnabled = true;
  dst.imageSmoothingQuality = 'high';
  const k = Math.max(amount, inkAmount);
  let rem = k;
  while (rem > 0.01) {
    dst.globalAlpha = Math.min(1, rem);
    dst.drawImage(BLOOM_B, 0, 0, 1920, 1080);
    dst.globalAlpha = Math.min(1, rem * 0.9);
    dst.drawImage(BLOOM_C, 0, 0, 1920, 1080);
    rem -= 1;
  }
  dst.globalAlpha = 1;
}

/** 常态辉光 + 关键时刻的脉冲：hits 为帧号，hl 为半衰期（帧） */
export const bloomAt = (f: number, base: number, hits: number[], amp = 1, hl = 6) =>
  base + hits.reduce((s, h) => s + (f >= h ? amp * Math.pow(0.5, (f - h) / hl) : 0), 0);

/**
 * 空间层：三张画布——墨线（source-over）、发光（lighter）、辉光（screen）。
 * ink(P) 画发丝线/球体；glow(G, L) 画火花；bloom 控制辉光强度。
 */
export const Space: React.FC<{
  cam: Cam3;
  ink?: (P: Pen) => void;
  glow?: (G: CanvasRenderingContext2D, L: Lens) => void;
  fog?: [number, number];
  nearFade?: number;
  bloom?: number;
  inkBloom?: number;
}> = ({cam, ink, glow, fog = [600, 6000], nearFade, bloom = 0.35, inkBloom = 0}) => {
  const theme = useInk();
  const r1 = useRef<HTMLCanvasElement>(null);
  const r2 = useRef<HTMLCanvasElement>(null);
  const r3 = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const L = lens(cam);
    const paper = theme.mode === 'paper';
    const c1 = r1.current?.getContext('2d');
    if (c1) {
      c1.setTransform(1, 0, 0, 1, 0, 0);
      c1.clearRect(0, 0, 1920, 1080);
      c1.lineCap = 'round';
      c1.lineJoin = 'round';
      if (ink) ink({ctx: c1, L, fg: paper ? [10, 10, 11] : [238, 233, 223], bg: paper ? '#EEE9DF' : '#0A0A0B', paper, fogNear: fog[0], fogFar: fog[1], near: 30, nearFade: nearFade ?? 60});
    }
    const c2 = r2.current?.getContext('2d');
    if (c2) {
      c2.setTransform(1, 0, 0, 1, 0, 0);
      c2.clearRect(0, 0, 1920, 1080);
      c2.globalCompositeOperation = paper ? 'source-over' : 'lighter';
      c2.lineCap = 'round';
      c2.lineJoin = 'round';
      if (glow) glow(c2, L);
    }
    const c3 = r3.current?.getContext('2d');
    if (c3 && !paper) bloomPass(c3, glow ? r2.current : null, ink ? r1.current : null, bloom, inkBloom);
  });
  return (
    <>
      <canvas ref={r1} width={1920} height={1080} style={{position: 'absolute', inset: 0}} />
      <canvas ref={r2} width={1920} height={1080} style={{position: 'absolute', inset: 0, pointerEvents: 'none'}} />
      <canvas ref={r3} width={1920} height={1080} style={{position: 'absolute', inset: 0, pointerEvents: 'none', mixBlendMode: 'screen'}} />
    </>
  );
};

/** 线框长方体 */
export function box3(P: Pen, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, o: {w?: number; a?: number; color?: [number, number, number]} = {}) {
  const c: V3[] = [
    [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1],
    [x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0],
  ];
  const E = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
  E.forEach(([p, q]) => line3(P, c[p], c[q], {w: o.w ?? 1.3, a: o.a, color: o.color}));
}

/** 正面（z = z1 平面）上的 45° 排线，用于表示“被占据” */
export function hatch3(P: Pen, x0: number, x1: number, y0: number, y1: number, z: number, o: {gap?: number; w?: number; a?: number; color?: [number, number, number]} = {}) {
  const gap = o.gap ?? 22;
  const H = y1 - y0;
  for (let d = -H; d < x1 - x0; d += gap) {
    let xa = x0 + d;
    let ya = y0;
    let xb = x0 + d + H;
    let yb = y1;
    if (xa < x0) {
      ya = y0 + (x0 - xa);
      xa = x0;
    }
    if (xb > x1) {
      yb = y1 - (xb - x1);
      xb = x1;
    }
    if (ya >= yb) continue;
    line3(P, [xa, ya, z], [xb, yb, z], {w: o.w ?? 0.8, a: o.a ?? 0.75, color: o.color});
  }
}
