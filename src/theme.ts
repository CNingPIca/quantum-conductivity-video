import React, {createContext, useContext} from 'react';
import {cancelRender, continueRender, delayRender, staticFile} from 'remotion';

/* ------------------------------------------------------------------
 * 美术方向：「插图论文图版」——墨黑 / 骨白 / 单一信号橙
 * 只有信号橙（电子 = 火花）会发光；其余全部是发丝线与版画排线。
 * ------------------------------------------------------------------ */
export const P = {
  ink: '#0A0A0B',
  ink2: '#151517',
  graphite: '#5E5B57',
  ash: '#9C978F',
  bone: '#EEE9DF',
  signal: '#FF4D12',
  ember: '#FF8A3D',
  blood: '#C21D0B',
  hot: '#FFE6CF',
};

export type InkMode = 'dark' | 'paper';
export type Ink = {
  mode: InkMode;
  bg: string;
  fg: string;
  dim: string;
  faint: string;
  line: string;
  hatch: string; // 排线 pattern id
  hairline: number;
};

export const INKS: Record<InkMode, Ink> = {
  dark: {
    mode: 'dark',
    bg: P.ink,
    fg: P.bone,
    dim: P.ash,
    faint: 'rgba(238,233,223,0.22)',
    line: 'rgba(238,233,223,0.55)',
    hatch: 'url(#hatchBone)',
    hairline: 1.4,
  },
  paper: {
    mode: 'paper',
    bg: P.bone,
    fg: P.ink,
    dim: P.graphite,
    faint: 'rgba(10,10,11,0.22)',
    line: 'rgba(10,10,11,0.6)',
    hatch: 'url(#hatchInk)',
    hairline: 1.4,
  },
};

export const InkContext = createContext<Ink>(INKS.dark);
export const useInk = () => useContext(InkContext);
export const InkProvider: React.FC<{mode: InkMode; children: React.ReactNode}> = ({mode, children}) =>
  React.createElement(InkContext.Provider, {value: INKS[mode]}, children);

/* ---------------- 字体 ---------------- */
// 拉丁字形用 Archivo / IBM Plex Mono / Cormorant Garamond，中文自动回退到思源黑体 / 思源宋体
export const F = {
  sans: '"Archivo", "Noto Sans SC", "PingFang SC", sans-serif',
  display: '"Archivo", "Noto Sans SC", "PingFang SC", sans-serif',
  mono: '"IBM Plex Mono", "Noto Sans SC", "PingFang SC", monospace',
  serif: '"Cormorant Garamond", "Noto Serif SC", "Songti SC", serif',
  cjkSerif: '"Noto Serif SC", "Songti SC", serif',
};

type Face = {family: string; file: string; weight: string; style?: string; stretch?: string};
const FACES: Face[] = [
  {family: 'Noto Sans SC', file: 'NotoSansSC-Regular.woff2', weight: '400'},
  {family: 'Noto Sans SC', file: 'NotoSansSC-Medium.woff2', weight: '500'},
  {family: 'Noto Sans SC', file: 'NotoSansSC-Bold.woff2', weight: '700'},
  {family: 'Noto Sans SC', file: 'NotoSansSC-Black.woff2', weight: '900'},
  {family: 'Noto Serif SC', file: 'NotoSerifSC-Regular.woff2', weight: '400'},
  {family: 'Noto Serif SC', file: 'NotoSerifSC-SemiBold.woff2', weight: '600'},
  {family: 'Archivo', file: 'Archivo-Variable.woff2', weight: '100 900', stretch: '62% 125%'},
  {family: 'IBM Plex Mono', file: 'ibm-plex-mono-latin-400-normal.woff2', weight: '400'},
  {family: 'IBM Plex Mono', file: 'ibm-plex-mono-latin-500-normal.woff2', weight: '500'},
  {family: 'IBM Plex Mono', file: 'ibm-plex-mono-latin-600-normal.woff2', weight: '600'},
  {family: 'Cormorant Garamond', file: 'cormorant-garamond-latin-500-normal.woff2', weight: '500'},
  {family: 'Cormorant Garamond', file: 'cormorant-garamond-latin-600-normal.woff2', weight: '600'},
  {family: 'Cormorant Garamond', file: 'cormorant-garamond-latin-500-italic.woff2', weight: '500', style: 'italic'},
  {family: 'Cormorant Garamond', file: 'cormorant-garamond-latin-600-italic.woff2', weight: '600', style: 'italic'},
];

if (typeof window !== 'undefined' && typeof FontFace !== 'undefined') {
  for (const face of FACES) {
    const handle = delayRender(`font ${face.file}`);
    const ff = new FontFace(face.family, `url(${staticFile(`fonts/${face.file}`)}) format('woff2')`, {
      weight: face.weight,
      style: face.style ?? 'normal',
      stretch: face.stretch ?? 'normal',
    });
    ff.load()
      .then(() => {
        (document.fonts as unknown as {add: (f: FontFace) => void}).add(ff);
        continueRender(handle);
      })
      .catch((err) => cancelRender(err));
  }
}

/* ---------------- 动效 ---------------- */
export const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];
