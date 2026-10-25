import React from 'react';
import {F, P, useInk} from '../theme';
import {Cam, toScreen} from './camera';
import {clamp, ease, prog} from './util';

/**
 * 整屏字块“砸入”：从 1.18 倍迅速缩回，outExpo；可选退场。
 * 位置为屏幕坐标（不跟随相机），align 决定 x 的含义。
 */
export const Slam: React.FC<{
  f: number;
  t0: number;
  t1?: number;
  x: number;
  y: number;
  size: number;
  children: React.ReactNode;
  font?: 'display' | 'mono' | 'serif' | 'cjkSerif';
  weight?: number;
  stretch?: number;
  color?: string;
  align?: 'left' | 'center' | 'right';
  italic?: boolean;
  spacing?: number;
  lineHeight?: number;
  from?: number;
  dur?: number;
  opacity?: number;
  glow?: number;
}> = ({f, t0, t1, x, y, size, children, font = 'display', weight = 900, stretch, color, align = 'left', italic, spacing = 0, lineHeight = 1, from = 1.18, dur = 14, opacity = 1, glow = 0}) => {
  const ink = useInk();
  if (f < t0 - 0.5) return null;
  const k = prog(f, t0, t0 + dur, ease.outExpo);
  const out = t1 === undefined ? 1 : 1 - prog(f, t1, t1 + 8, ease.inQuad);
  if (out <= 0) return null;
  const s = from + (1 - from) * k;
  const fam = font === 'mono' ? F.mono : font === 'serif' ? F.serif : font === 'cjkSerif' ? F.cjkSerif : F.display;
  const tx = align === 'left' ? '0%' : align === 'center' ? '-50%' : '-100%';
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: `translate(${tx}, -50%) scale(${s})`,
        transformOrigin: align === 'left' ? 'left center' : align === 'right' ? 'right center' : 'center center',
        fontFamily: fam,
        fontWeight: weight,
        fontSize: size,
        fontStretch: stretch ? `${stretch}%` : undefined,
        fontStyle: italic ? 'italic' : 'normal',
        letterSpacing: spacing,
        lineHeight,
        color: color ?? ink.fg,
        opacity: Math.min(1, k * 3) * out * opacity,
        whiteSpace: 'nowrap',
        fontVariantNumeric: 'lining-nums',
        textShadow: glow > 0 ? `0 0 ${size * 0.08}px rgba(255,120,50,${0.7 * glow}), 0 0 ${size * 0.35}px rgba(255,77,18,${0.45 * glow}), 0 0 ${size * 0.9}px rgba(194,29,11,${0.35 * glow})` : undefined,
      }}
    >
      {children}
    </div>
  );
};

/** 里程表式滚动数字（整数部分逐位滚动）。value 可为小数，滚动过程连续。 */
export const Roller: React.FC<{
  value: number;
  x: number;
  y: number;
  size: number;
  digits?: number;
  color?: string;
  align?: 'left' | 'right';
  prefix?: string;
  stretch?: number;
  weight?: number;
}> = ({value, x, y, size, digits, color, align = 'left', prefix, stretch = 70, weight = 900}) => {
  const ink = useInk();
  const neg = value < -0.0001;
  const v = Math.abs(value);
  const nd = Math.max(digits ?? 1, String(Math.floor(v)).length);
  const lh = size * 1.0;
  const cols = Array.from({length: nd}).map((_, j) => {
    const i = nd - 1 - j; // 位权
    const pw = Math.pow(10, i);
    const pos = v / pw;
    const d = Math.floor(pos) % 10;
    const fr = i === 0 ? v % 1 : clamp((v % pw) - (pw - 1));
    const smooth = ease.inOutCubic(fr);
    // 前导零隐藏
    const lead = i > 0 && Math.floor(pos) === 0 && Math.floor(pos + 1e-6) === 0 && fr < 0.01;
    return {d, smooth, lead, i};
  });
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: `translate(${align === 'right' ? '-100%' : '0'}, -50%)`,
        display: 'flex',
        alignItems: 'center',
        fontFamily: F.display,
        fontWeight: weight,
        fontStretch: `${stretch}%`,
        fontSize: size,
        lineHeight: `${lh}px`,
        color: color ?? ink.fg,
        fontVariantNumeric: 'tabular-nums lining-nums',
      }}
    >
      {prefix && <span>{prefix}</span>}
      {neg && <span>−</span>}
      {cols.map((c) =>
        c.lead ? null : (
          <span key={c.i} style={{display: 'inline-block', height: lh, overflow: 'hidden', position: 'relative'}}>
            <span style={{display: 'block', transform: `translateY(${-c.smooth * lh}px)`}}>
              <span style={{display: 'block', height: lh}}>{c.d}</span>
              <span style={{display: 'block', height: lh}}>{(c.d + 1) % 10}</span>
            </span>
          </span>
        ),
      )}
    </div>
  );
};

/**
 * 标注：从世界坐标锚点引出发丝线到屏幕上的标签（标签不随相机缩放）。
 * dx/dy 为标签相对锚点的屏幕偏移。
 */
export const Callout: React.FC<{
  cam?: Cam;
  at?: {x: number; y: number} | null;
  x?: number;
  y?: number;
  dx: number;
  dy: number;
  mono?: string;
  text?: React.ReactNode;
  o?: number;
  color?: string;
  size?: number;
}> = ({cam, at, x = 0, y = 0, dx, dy, mono, text, o = 1, color, size = 30}) => {
  const ink = useInk();
  if (o <= 0.001) return null;
  if (!at && !cam) return null;
  const a = at ?? toScreen(cam as Cam, x, y);
  const bx = a.x + dx;
  const by = a.y + dy;
  const right = dx >= 0;
  const c = color ?? ink.fg;
  return (
    <g opacity={o}>
      <circle cx={a.x} cy={a.y} r={3} fill={c} />
      <polyline points={`${a.x},${a.y} ${bx},${by} ${bx + (right ? 40 : -40)},${by}`} fill="none" stroke={c} strokeWidth={1.1} />
      {mono && (
        <text
          x={bx + (right ? 50 : -50)}
          y={by - 12}
          textAnchor={right ? 'start' : 'end'}
          fontFamily={F.mono}
          fontWeight={500}
          fontSize={13}
          fill={color ?? ink.dim}
          style={{letterSpacing: 3}}
        >
          {mono}
        </text>
      )}
      {text && (
        <text
          x={bx + (right ? 50 : -50)}
          y={by + size * 0.62}
          textAnchor={right ? 'start' : 'end'}
          fontFamily={F.sans}
          fontWeight={700}
          fontSize={size}
          fill={c}
          style={{letterSpacing: 1, fontVariantNumeric: 'lining-nums'}}
        >
          {text}
        </text>
      )}
    </g>
  );
};

/** 屏幕层 SVG（不跟随相机） */
export const ScreenSvg: React.FC<{children: React.ReactNode}> = ({children}) => (
  <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible'}}>
    {children}
  </svg>
);

export const SIGNAL = P.signal;

/** 整数步进计数器：整串数字（含正负号）在每次 +1 时从下方滑入 */
export const StepRoller: React.FC<{value: number; x: number; y: number; size: number; color?: string; align?: 'left' | 'right'; stretch?: number}> = ({
  value,
  x,
  y,
  size,
  color,
  align = 'left',
  stretch = 70,
}) => {
  const ink = useInk();
  const n0 = Math.floor(value);
  const fr = value - n0;
  const k = ease.inOutCubic(clamp((fr - 0.55) / 0.45));
  const fmt = (n: number) => (n < 0 ? `−${-n}` : `${n}`);
  const lh = size;
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        height: lh,
        overflow: 'hidden',
        transform: `translate(${align === 'right' ? '-100%' : '0'}, -50%)`,
        fontFamily: F.display,
        fontWeight: 900,
        fontStretch: `${stretch}%`,
        fontSize: size,
        lineHeight: `${lh}px`,
        color: color ?? ink.fg,
        fontVariantNumeric: 'tabular-nums lining-nums',
        textAlign: align,
      }}
    >
      <div style={{transform: `translateY(${-k * lh}px)`}}>
        <div style={{height: lh}}>{fmt(n0)}</div>
        <div style={{height: lh}}>{fmt(n0 + 1)}</div>
      </div>
    </div>
  );
};
