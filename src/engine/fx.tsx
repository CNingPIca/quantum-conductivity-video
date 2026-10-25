import React, {useLayoutEffect, useRef} from 'react';
import {applyCam, Cam} from './camera';
import {hash, TAU, V2} from './util';

/* ------------------------------------------------------------------
 * 发光层：Canvas2D + 加色混合（'lighter'），只画信号橙的东西。
 * 火花头部与迸溅粒子移植自 mexicat/pdoom-video 的 scenes/_motifs.ts（MIT）。
 * ------------------------------------------------------------------ */

export type Draw = (ctx: CanvasRenderingContext2D, cam: Cam) => void;

export const FxCanvas: React.FC<{cam: Cam; draw: Draw; paper?: boolean; screen?: boolean}> = ({cam, draw, paper, screen}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, 1920, 1080);
    if (screen) ctx.setTransform(1, 0, 0, 1, 0, 0);
    else applyCam(ctx, cam);
    ctx.globalCompositeOperation = paper ? 'source-over' : 'lighter';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    draw(ctx, cam);
  });
  return <canvas ref={ref} width={1920} height={1080} style={{position: 'absolute', inset: 0, pointerEvents: 'none'}} />;
};

const SIG = [255, 77, 18];
const rgb = (c: number[], a: number) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

/**
 * 火花：白热内核 + 橙色光晕 + 四条细芒（t 为秒，用于闪烁）。
 * s = 世界坐标下的尺寸系数；传 1/cam.z 可保持屏幕尺寸恒定。
 */
export function spark(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, s = 1, I = 1, paper = false) {
  if (!(I > 0.001) || !Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(s) || s <= 0) return;
  const flick = 0.85 + 0.15 * Math.sin(t * 91.7) * Math.sin(t * 57.3);
  const k = I * flick;
  if (paper) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, I);
    ctx.fillStyle = '#FF4D12';
    ctx.beginPath();
    ctx.arc(x, y, 7 * s, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#C21D0B';
    ctx.lineWidth = 1.4 * s;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(194,29,11,0.9)';
    ctx.lineWidth = 1.1 * s;
    for (let i = 0; i < 4; i++) {
      const a = i * (TAU / 4) + t * 3 + 0.4;
      const r = (12 + 5 * hash(Math.floor(t * 30), i)) * s;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * 9 * s, y + Math.sin(a) * 9 * s);
      ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }
  // 大光晕（halation）
  let g = ctx.createRadialGradient(x, y, 0, x, y, 70 * s);
  g.addColorStop(0, `rgba(194,29,11,${0.32 * k})`);
  g.addColorStop(1, 'rgba(194,29,11,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, 70 * s, 0, TAU);
  ctx.fill();
  // 内核
  g = ctx.createRadialGradient(x, y, 0, x, y, 24 * s);
  g.addColorStop(0, `rgba(255,250,240,${Math.min(1, k)})`);
  g.addColorStop(0.18, `rgba(255,170,90,${0.95 * k})`);
  g.addColorStop(0.45, `rgba(255,77,18,${0.45 * k})`);
  g.addColorStop(1, 'rgba(255,77,18,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, 24 * s, 0, TAU);
  ctx.fill();
  // 细芒
  ctx.lineWidth = 1.2 * s;
  ctx.strokeStyle = `rgba(255,140,60,${0.8 * k})`;
  for (let i = 0; i < 4; i++) {
    const a = i * (TAU / 4) + t * 3 + 0.4;
    const r = (10 + 6 * hash(Math.floor(t * 30), i)) * s;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    ctx.stroke();
  }
}

/** 小号电子（大量出现时用，便宜） */
export function ember(ctx: CanvasRenderingContext2D, x: number, y: number, s = 1, I = 1, paper = false) {
  if (!(I > 0.001) || !Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(s) || s <= 0) return;
  if (paper) {
    ctx.fillStyle = `rgba(255,77,18,${Math.min(1, I)})`;
    ctx.beginPath();
    ctx.arc(x, y, 5.5 * s, 0, TAU);
    ctx.fill();
    return;
  }
  const g = ctx.createRadialGradient(x, y, 0, x, y, 16 * s);
  g.addColorStop(0, `rgba(255,240,220,${I})`);
  g.addColorStop(0.22, `rgba(255,138,61,${0.9 * I})`);
  g.addColorStop(0.5, `rgba(255,77,18,${0.3 * I})`);
  g.addColorStop(1, 'rgba(255,77,18,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, 16 * s, 0, TAU);
  ctx.fill();
}

/**
 * 迸溅粒子：粒子在固定时刻出生（rate/秒），速度由哈希决定，带重力；画成短促的运动拖影。
 * headAt(tb) 返回出生时火花的位置（null = 不产生）。t 单位：秒。
 */
export function particles(
  ctx: CanvasRenderingContext2D,
  t: number,
  headAt: (tb: number) => V2 | null,
  o: {rate?: number; life?: number; speed?: number; gravity?: number; I?: number; seed?: number; width?: number; s?: number; paper?: boolean} = {},
) {
  const life = o.life ?? 0.45;
  const speed = o.speed ?? 260;
  const g = o.gravity ?? 520;
  const I = o.I ?? 1;
  const seed = o.seed ?? 1;
  const rate = o.rate ?? 90;
  const s = o.s ?? 1;
  if (!(rate > 0) || I <= 0) return;
  const n0 = Math.floor((t - life) * rate);
  const n1 = Math.floor(t * rate);
  for (let n = n0; n <= n1; n++) {
    const tb = n / rate;
    if (tb > t) continue;
    const age = t - tb;
    const h = headAt(tb);
    if (!h) continue;
    const a = hash(n, seed) * TAU;
    const sp = speed * (0.25 + hash(n, seed + 1) ** 2 * 1.2) * s;
    const lf = life * (0.35 + 0.65 * hash(n, seed + 2));
    if (age > lf) continue;
    const vx = Math.cos(a) * sp;
    const vy = Math.sin(a) * sp - speed * 0.3 * s;
    const gg = g * s;
    const pos = (q: number) => [h.x + vx * q, h.y + vy * q + 0.5 * gg * q * q];
    const [x, y] = pos(age);
    const [x0, y0] = pos(Math.max(0, age - 0.018));
    const k = 1 - age / lf;
    const heat = k * k;
    const col = o.paper
      ? [255, 77, 18]
      : [SIG[0] + (255 - SIG[0]) * heat, SIG[1] + (204 - SIG[1]) * heat, SIG[2] + (128 - SIG[2]) * heat];
    ctx.strokeStyle = rgb(col, Math.min(1, k * 1.4) * Math.min(1, I));
    ctx.lineWidth = (o.width ?? 1.6) * (0.5 + k * 0.7) * s;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x + 0.01, y);
    ctx.stroke();
  }
}

/** 发光折线：外层血红光晕 + 信号橙 + 余烬内芯（w = 屏幕线宽系数，传 1/cam.z 保持粗细恒定） */
export function glowLine(ctx: CanvasRenderingContext2D, pts: V2[], w = 1, I = 1, paper = false) {
  if (pts.length < 2 || I <= 0) return;
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  };
  if (paper) {
    path();
    ctx.strokeStyle = `rgba(255,77,18,${I})`;
    ctx.lineWidth = 2.4 * w;
    ctx.stroke();
    return;
  }
  path();
  ctx.strokeStyle = `rgba(194,29,11,${0.22 * I})`;
  ctx.lineWidth = 16 * w;
  ctx.stroke();
  ctx.strokeStyle = `rgba(255,77,18,${0.4 * I})`;
  ctx.lineWidth = 6 * w;
  ctx.stroke();
  ctx.strokeStyle = `rgba(255,138,61,${I})`;
  ctx.lineWidth = 2.4 * w;
  ctx.stroke();
  ctx.strokeStyle = `rgba(255,230,205,${0.7 * I})`;
  ctx.lineWidth = 0.9 * w;
  ctx.stroke();
}

/** 发光拖尾：沿历史轨迹逐段渐隐 */
export function trail(ctx: CanvasRenderingContext2D, pts: V2[], w = 1, I = 1, paper = false) {
  for (let i = 1; i < pts.length; i++) {
    const k = i / pts.length;
    ctx.strokeStyle = paper ? `rgba(255,77,18,${0.8 * k * I})` : `rgba(255,${(77 + 100 * k) | 0},${(18 + 60 * k) | 0},${0.85 * k * I})`;
    ctx.lineWidth = (paper ? 1.6 : 2.2) * w * (0.4 + 0.6 * k);
    ctx.beginPath();
    ctx.moveTo(pts[i - 1].x, pts[i - 1].y);
    ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
  }
}

/** 全屏闪光（屏幕坐标） */
export function flash(ctx: CanvasRenderingContext2D, amt: number) {
  if (amt <= 0.003) return;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = `rgba(255,200,160,${amt})`;
  ctx.fillRect(0, 0, 1920, 1080);
  ctx.restore();
}
