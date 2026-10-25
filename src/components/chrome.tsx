import React from 'react';
import {AbsoluteFill, Img, interpolate, random, staticFile, useCurrentFrame} from 'remotion';
import {Cue} from '../script';
import {F, InkProvider, P, useInk} from '../theme';
import {CLAMP, ease, easeOut} from '../lib/anim';

/** 图版底色：暗面 = 墨黑 + 暗角；纸面 = 骨白纸纹 */
export const PlateBackground: React.FC = () => {
  const ink = useInk();
  if (ink.mode === 'paper') {
    return (
      <AbsoluteFill style={{backgroundColor: P.bone}}>
        <Img src={staticFile('tex/paper.jpg')} style={{width: 1920, height: 1080}} />
      </AbsoluteFill>
    );
  }
  return <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 45%, #111113 0%, ${P.ink} 62%, #050506 100%)`}} />;
};

/** 胶片颗粒 + 暗角（全片最上层） */
export const GrainOverlay: React.FC = () => {
  const f = useCurrentFrame();
  const tile = f % 6;
  const ox = Math.floor(random(`gx${f}`) * 512);
  const oy = Math.floor(random(`gy${f}`) * 512);
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <AbsoluteFill
        style={{
          backgroundImage: `url(${staticFile(`tex/grain${tile}.png`)})`,
          backgroundRepeat: 'repeat',
          backgroundPosition: `${ox}px ${oy}px`,
          opacity: 0.9,
        }}
      />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.22) 100%)'}} />
    </AbsoluteFill>
  );
};

/** 四角裁切标记，随图版飞入 */
export const CropMarks: React.FC = () => {
  const f = useCurrentFrame();
  const ink = useInk();
  const k = ease(f, 0, 16);
  const inset = interpolate(k, [0, 1], [-40, 36]);
  const o = Math.min(1, k * 3) * (ink.mode === 'paper' ? 0.5 : 0.38);
  const L = 22;
  const corners = [
    [inset, inset, 1, 1],
    [1920 - inset, inset, -1, 1],
    [inset, 1080 - inset, 1, -1],
    [1920 - inset, 1080 - inset, -1, -1],
  ];
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
      {corners.map(([x, y, sx, sy], i) => (
        <path key={i} d={`M ${x} ${y + sy * L} L ${x} ${y} L ${x + sx * L} ${y}`} fill="none" stroke={ink.fg} strokeWidth={1.25} opacity={o} />
      ))}
    </svg>
  );
};

/** 左上：一行等宽小字的图版编号（不做“标题栏”） */
export const PlateHeader: React.FC<{no: string; title: string; en?: string; page: string}> = ({no, title, en}) => {
  const f = useCurrentFrame();
  const ink = useInk();
  const a = easeOut(f, 4, 18);
  const sig = ink.mode === 'paper' ? P.blood : P.signal;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div
        style={{
          position: 'absolute',
          left: 72,
          top: 62,
          opacity: a * 0.9,
          fontFamily: F.mono,
          fontWeight: 500,
          fontSize: 14,
          letterSpacing: 3,
          color: ink.dim,
          display: 'flex',
          gap: 14,
          alignItems: 'baseline',
        }}
      >
        <span style={{color: sig}}>PL. {no}</span>
        <span>{en}</span>
        <span style={{fontFamily: F.sans, fontWeight: 700, fontSize: 18, letterSpacing: 4, color: ink.fg}}>{title}</span>
      </div>
    </AbsoluteFill>
  );
};

/** 把「关键词」拆成带颜色标记的字符序列 */
const toGlyphs = (text: string) => {
  const out: Array<{ch: string; hi: boolean}> = [];
  let hi = false;
  for (const ch of Array.from(text)) {
    if (ch === '「') {
      hi = true;
      continue;
    }
    if (ch === '」') {
      hi = false;
      continue;
    }
    out.push({ch, hi});
  }
  return out;
};

/** 底部字幕：宋体，左对齐，逐字显现，关键词用信号橙；无描边无光晕 */
export const Captions: React.FC<{cues: Cue[]}> = ({cues}) => {
  const f = useCurrentFrame();
  const ink = useInk();
  const cue = cues.find((c) => f >= c.start && f < c.end);
  if (!cue) return null;
  const local = f - cue.start;
  const len = cue.end - cue.start;
  const glyphs = toGlyphs(cue.text);
  const reveal = Math.min(18, glyphs.length * 0.7);
  const out = interpolate(local, [len - 6, len], [1, 0], CLAMP);
  const sig = ink.mode === 'paper' ? P.blood : P.signal;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div
        style={{
          position: 'absolute',
          left: 72,
          bottom: 104,
          width: 30 * easeOut(local, 0, 14),
          height: 2,
          background: sig,
          opacity: out,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 120,
          bottom: 82,
          maxWidth: 1600,
          fontFamily: F.cjkSerif,
          fontWeight: 600,
          fontSize: 42,
          lineHeight: 1.3,
          letterSpacing: 1,
          color: ink.fg,
          opacity: out,
        }}
      >
        {glyphs.map((g, i) => {
          const t = interpolate(local, [(i / glyphs.length) * reveal, (i / glyphs.length) * reveal + 5], [0, 1], CLAMP);
          return (
            <span key={i} style={{opacity: t, color: g.hi ? sig : undefined}}>
              {g.ch}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/** 图版外壳：纸面/暗面 + 页眉 + 裁切标记 + 字幕。图版之间硬切。 */
export const SceneShell: React.FC<{
  cues: Cue[];
  chip?: string;
  en?: string;
  paper?: boolean;
  no?: string;
  page?: string;
  children: React.ReactNode;
}> = ({cues, chip, en, paper, no, page, children}) => (
  <InkProvider mode={paper ? 'paper' : 'dark'}>
    <AbsoluteFill>
      <PlateBackground />
      {children}
      {chip && no && <PlateHeader no={no} title={chip} en={en} page={page ?? ''} />}
      <CropMarks />
      <Captions cues={cues} />
    </AbsoluteFill>
  </InkProvider>
);

/** 局部切换纸面/暗面（同一图版内） */
export const InkSwitch: React.FC<{paper: boolean; children: React.ReactNode}> = ({paper, children}) => (
  <InkProvider mode={paper ? 'paper' : 'dark'}>{children}</InkProvider>
);
