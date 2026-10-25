import React from 'react';
import {F, P, useInk} from '../theme';

/** 排线 / 光晕定义：每个 <svg> 里放一份（id 相同、内容相同，重复无副作用） */
export const Defs: React.FC = () => (
  <defs>
    {[
      ['hatchBone', 'rgba(238,233,223,0.78)', 5],
      ['hatchInk', 'rgba(10,10,11,0.82)', 5],
      ['hatchBoneSparse', 'rgba(238,233,223,0.45)', 9],
      ['hatchInkSparse', 'rgba(10,10,11,0.5)', 9],
      ['hatchSignal', P.signal, 6],
    ].map(([id, color, gap]) => (
      <pattern key={id as string} id={id as string} width={gap} height={gap} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2={gap} stroke={color as string} strokeWidth={1.1} />
      </pattern>
    ))}
    <radialGradient id="sparkGlow">
      <stop offset="0%" stopColor={P.signal} stopOpacity={0.9} />
      <stop offset="40%" stopColor={P.signal} stopOpacity={0.32} />
      <stop offset="100%" stopColor={P.signal} stopOpacity={0} />
    </radialGradient>
    <radialGradient id="sparkHalo">
      <stop offset="0%" stopColor={P.blood} stopOpacity={0.35} />
      <stop offset="100%" stopColor={P.blood} stopOpacity={0} />
    </radialGradient>
    <radialGradient id="bigGlow">
      <stop offset="0%" stopColor={P.ember} stopOpacity={0.55} />
      <stop offset="35%" stopColor={P.signal} stopOpacity={0.22} />
      <stop offset="100%" stopColor={P.blood} stopOpacity={0} />
    </radialGradient>
  </defs>
);

/** 电子 = 信号橙火花（唯一会发光的元素） */
export const Electron: React.FC<{
  x: number;
  y: number;
  r?: number;
  opacity?: number;
  spin?: 'up' | 'down';
  glow?: boolean;
}> = ({x, y, r = 9, opacity = 1, spin, glow = true}) => {
  const ink = useInk();
  const lit = glow && ink.mode === 'dark';
  return (
    <g opacity={opacity}>
      {lit && <circle cx={x} cy={y} r={r * 4.2} fill="url(#sparkHalo)" />}
      {lit && <circle cx={x} cy={y} r={r * 2.3} fill="url(#sparkGlow)" />}
      <circle cx={x} cy={y} r={r} fill={P.signal} stroke={ink.mode === 'paper' ? P.blood : 'none'} strokeWidth={1.2} />
      {!spin && <circle cx={x - r * 0.18} cy={y - r * 0.18} r={r * 0.42} fill={lit ? P.hot : P.ember} />}
      {spin && <SpinArrow x={x} y={y} r={r} dir={spin} />}
    </g>
  );
};

const SpinArrow: React.FC<{x: number; y: number; r: number; dir: 'up' | 'down'}> = ({x, y, r, dir}) => {
  const s = dir === 'up' ? -1 : 1;
  const h = r * 0.6;
  return (
    <g stroke={P.ink} strokeWidth={Math.max(1.6, r * 0.16)} strokeLinecap="round" strokeLinejoin="round" fill="none">
      <line x1={x} y1={y - s * h} x2={x} y2={y + s * h} />
      <polyline points={`${x - h * 0.55},${y + s * h * 0.4} ${x},${y + s * h} ${x + h * 0.55},${y + s * h * 0.4}`} />
    </g>
  );
};

/** 离子 = 版画式球体：外轮廓发丝线 + 右下方排线阴影 */
export const Ion: React.FC<{
  x: number;
  y: number;
  r?: number;
  opacity?: number;
  impurity?: boolean;
  label?: string;
}> = ({x, y, r = 18, opacity = 1, impurity, label}) => {
  const ink = useInk();
  if (impurity) {
    return (
      <g opacity={opacity}>
        <circle cx={x} cy={y} r={r} fill={ink.fg} />
        <circle cx={x} cy={y} r={r + 5} fill="none" stroke={ink.fg} strokeWidth={1.2} />
        {label && (
          <text x={x} y={y + r * 0.34} textAnchor="middle" fontFamily={F.mono} fontWeight={600} fontSize={r * 0.95} fill={ink.bg}>
            {label}
          </text>
        )}
      </g>
    );
  }
  return (
    <g opacity={opacity}>
      <circle cx={x} cy={y} r={r} fill={ink.hatch} />
      <circle cx={x - r * 0.24} cy={y - r * 0.24} r={r * 0.74} fill={ink.bg} />
      <circle cx={x} cy={y} r={r} fill="none" stroke={ink.fg} strokeWidth={ink.hairline} />
      {label ? (
        <text x={x - r * 0.12} y={y + r * 0.22} textAnchor="middle" fontFamily={F.mono} fontWeight={500} fontSize={r * 0.72} fill={ink.fg}>
          {label}
        </text>
      ) : (
        <g stroke={ink.fg} strokeWidth={1.3} strokeLinecap="round">
          <line x1={x - r * 0.52} y1={y - r * 0.24} x2={x + r * 0.04} y2={y - r * 0.24} />
          <line x1={x - r * 0.24} y1={y - r * 0.52} x2={x - r * 0.24} y2={y + r * 0.04} />
        </g>
      )}
    </g>
  );
};

/** 空穴 = 空心信号环 */
export const Hole: React.FC<{x: number; y: number; r?: number; opacity?: number}> = ({x, y, r = 9, opacity = 1}) => {
  const ink = useInk();
  return (
    <g opacity={opacity}>
      <circle cx={x} cy={y} r={r} fill={ink.bg} stroke={P.signal} strokeWidth={2.2} />
      <g stroke={P.signal} strokeWidth={1.8} strokeLinecap="round">
        <line x1={x - r * 0.45} y1={y} x2={x + r * 0.45} y2={y} />
        <line x1={x} y1={y - r * 0.45} x2={x} y2={y + r * 0.45} />
      </g>
    </g>
  );
};

/** 箭头（发丝线 + 实心小箭头） */
export const Arrow: React.FC<{
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color?: string;
  width?: number;
  head?: number;
  opacity?: number;
  dash?: string;
  both?: boolean;
}> = ({x1, y1, x2, y2, color, width = 1.6, head = 11, opacity = 1, dash, both}) => {
  const ink = useInk();
  const c = color ?? ink.fg;
  const a = Math.atan2(y2 - y1, x2 - x1);
  const tri = (x: number, y: number, ang: number) => {
    const p2 = [x - head * Math.cos(ang - 0.38), y - head * Math.sin(ang - 0.38)];
    const p3 = [x - head * Math.cos(ang + 0.38), y - head * Math.sin(ang + 0.38)];
    return `${x},${y} ${p2.join(',')} ${p3.join(',')}`;
  };
  const back = head * 0.75;
  const sx = both ? x1 + back * Math.cos(a) : x1;
  const sy = both ? y1 + back * Math.sin(a) : y1;
  return (
    <g opacity={opacity}>
      <line x1={sx} y1={sy} x2={x2 - back * Math.cos(a)} y2={y2 - back * Math.sin(a)} stroke={c} strokeWidth={width} strokeDasharray={dash} />
      <polygon points={tri(x2, y2, a)} fill={c} />
      {both && <polygon points={tri(x1, y1, a + Math.PI)} fill={c} />}
    </g>
  );
};

/** 竖向尺寸线（工程图风格：两端短横 + 双箭头） */
export const DimV: React.FC<{x: number; y1: number; y2: number; color?: string; opacity?: number}> = ({x, y1, y2, color, opacity = 1}) => {
  const ink = useInk();
  const c = color ?? ink.fg;
  return (
    <g opacity={opacity}>
      <line x1={x - 10} x2={x + 10} y1={y1} y2={y1} stroke={c} strokeWidth={1.3} />
      <line x1={x - 10} x2={x + 10} y1={y2} y2={y2} stroke={c} strokeWidth={1.3} />
      <Arrow x1={x} y1={y1} x2={x} y2={y2} color={c} width={1.3} head={9} both />
    </g>
  );
};

type FontKind = 'sans' | 'mono' | 'serif' | 'display';

export const Label: React.FC<{
  x: number;
  y: number;
  children: React.ReactNode;
  size?: number;
  color?: string;
  weight?: number;
  anchor?: 'start' | 'middle' | 'end';
  opacity?: number;
  font?: FontKind;
  italic?: boolean;
  spacing?: number;
  stretch?: number;
}> = ({x, y, children, size = 26, color, weight, anchor = 'middle', opacity = 1, font = 'sans', italic, spacing, stretch}) => {
  const ink = useInk();
  const fam = font === 'mono' ? F.mono : font === 'serif' ? F.serif : F.sans;
  const w = weight ?? (font === 'mono' ? 500 : font === 'serif' ? 600 : 500);
  const ls = spacing ?? (font === 'mono' ? 3 : font === 'serif' ? 0 : 1);
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      fontFamily={fam}
      fontWeight={w}
      fontSize={size}
      fill={color ?? ink.fg}
      opacity={opacity}
      fontStyle={italic ? 'italic' : 'normal'}
      style={{letterSpacing: ls, fontStretch: stretch ? `${stretch}%` : undefined, fontVariantNumeric: 'lining-nums'}}
    >
      {children}
    </text>
  );
};

/** 等宽小标注（拉丁大写 + 字距） */
export const Mono: React.FC<{
  x: number;
  y: number;
  children: React.ReactNode;
  size?: number;
  color?: string;
  anchor?: 'start' | 'middle' | 'end';
  opacity?: number;
}> = ({x, y, children, size = 15, color, anchor = 'start', opacity = 1}) => {
  const ink = useInk();
  return (
    <Label x={x} y={y} size={size} font="mono" color={color ?? ink.dim} anchor={anchor} opacity={opacity} spacing={3}>
      {children}
    </Label>
  );
};

/** SVG 文本里的上标 */
export const Sup: React.FC<{size: number; children: React.ReactNode}> = ({size, children}) => (
  <>
    <tspan dy={-size * 0.42} fontSize={size * 0.62}>
      {children}
    </tspan>
    <tspan dy={size * 0.42} fontSize={size}>
      {'​'}
    </tspan>
  </>
);

/** 下标 */
export const Sub: React.FC<{size: number; children: React.ReactNode}> = ({size, children}) => (
  <>
    <tspan dy={size * 0.22} fontSize={size * 0.65}>
      {children}
    </tspan>
    <tspan dy={-size * 0.22} fontSize={size}>
      {'​'}
    </tspan>
  </>
);

/** 印章式结论（双框 + 粗体），用于“导电 / 不导电”判定 */
export const Stamp: React.FC<{
  x: number;
  y: number;
  text: string;
  sub?: string;
  color?: string;
  t: number; // 0→1 入场
  rotate?: number;
  width?: number;
  strike?: boolean;
}> = ({x, y, text, sub, color = P.signal, t, rotate = -4, width = 380, strike}) => {
  if (t <= 0) return null;
  const s = 1.35 - 0.35 * Math.min(1, t);
  const h = sub ? 118 : 92;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${s})`} opacity={Math.min(1, t * 1.6)}>
      <rect x={-width / 2} y={-h / 2} width={width} height={h} fill="none" stroke={color} strokeWidth={6} />
      <rect x={-width / 2 + 9} y={-h / 2 + 9} width={width - 18} height={h - 18} fill="none" stroke={color} strokeWidth={1.8} />
      <text
        x={0}
        y={sub ? -2 : 14}
        textAnchor="middle"
        fontFamily={F.display}
        fontWeight={900}
        fontSize={40}
        fill={color}
        style={{letterSpacing: 6}}
      >
        {text}
      </text>
      {sub && (
        <text x={0} y={34} textAnchor="middle" fontFamily={F.mono} fontWeight={600} fontSize={15} fill={color} style={{letterSpacing: 5}}>
          {sub}
        </text>
      )}
      {strike && <line x1={-width / 2 - 10} y1={h / 2 + 4} x2={width / 2 + 10} y2={-h / 2 - 4} stroke={color} strokeWidth={4} />}
    </g>
  );
};

export const FullSvg: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => (
  <svg viewBox="0 0 1920 1080" width={1920} height={1080} style={{position: 'absolute', inset: 0, overflow: 'hidden', ...style}}>
    <style>{'.world line, .world polyline, .world path, .world rect, .world circle, .world polygon, .world ellipse { vector-effect: non-scaling-stroke; }'}</style>
    <Defs />
    {children}
  </svg>
);
