import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Cue} from '../script';
import {F, P, useInk} from '../theme';
import {MotionBlur} from '../engine/camera';
import {Slam} from '../engine/type';
import {ease, hash, prog} from '../engine/util';

const interpolateKeys = (f: number, xs: number[], ys: number[]) => interpolate(f, xs, ys, {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
import {add, box3, cam3At, ember3, hatch3, lens, line3, mesh3, ring3, Space, spark3, V3, bloomAt} from '../engine/space';

type P_ = {cues: Cue[]; duration: number};

const SIG: [number, number, number] = [255, 77, 18];
const XS = [-1150, 0, 1150];
const HW = 260;
const Z = 160;
const CHIP: V3 = [0, -4000, 0];
const CS = 1100; // 芯片边长
const G = 22;

type Spec = {bands: Array<[number, number, number]>; electrons?: V3[]; holes?: V3[]};
const SPECS: Spec[] = [
  {bands: [[-420, 420, 0.5]]},
  {
    bands: [
      [-420, -60, 1],
      [60, 420, 0],
    ],
    electrons: [
      [-140, 120, Z],
      [20, 150, Z],
      [160, 110, Z],
    ],
    holes: [
      [-120, -90, Z],
      [50, -100, Z],
      [170, -85, Z],
    ],
  },
  {
    bands: [
      [-420, -170, 1],
      [250, 420, 0],
    ],
  },
];
const TITLES = [
  {cn: '导体', en: 'A · CONDUCTOR', sub: '能带部分填充'},
  {cn: '半导体', en: 'B · SEMICONDUCTOR', sub: '窄带隙 · 可调控'},
  {cn: '绝缘体', en: 'C · INSULATOR', sub: '满带 · 宽带隙'},
];

const Content: React.FC<P_> = ({cues, duration}) => {
  const f = useCurrentFrame();
  const ink = useInk();
  const t = f / 30;
  const [c0, c1, c2] = cues.map((c) => c.start);
  const endCard = cues[2].end;
  const phase = f < c2 ? 1 : f < endCard ? 2 : 3;

  const cam = cam3At(f, [
    {f: 0, eye: [-2300, 380, 1500], target: [-700, 0, 0], fov: 42, roll: -3},
    {f: c0 + 40, eye: [-1500, 520, 2300], target: [-200, 0, 0], ez: ease.outCubic},
    {f: c1, eye: [-200, 520, 2650], target: [0, 0, 0], fov: 44, roll: -2},
    {f: c2, eye: [300, 540, 2600], target: [60, 0, 0]},
    {f: c2 + 1, eye: add(CHIP, [-1400, 420, 1300]), target: add(CHIP, [-100, 0, 0]), fov: 44, roll: -6},
    {f: endCard, eye: add(CHIP, [700, 560, 1500]), target: add(CHIP, [200, 0, -100]), fov: 44, roll: -2, ez: ease.inOutCubic},
    {f: endCard + 1, eye: [0, 260, 1600], target: [0, 120, -2000], fov: 50, roll: 0},
    {f: duration, eye: [0, 260, 1400], target: [0, 120, -2000]},
  ]);
  const L = lens(cam);

  const hl = (k: number) => {
    const s = c1 + 10 + k * 22;
    return interpolateKeys(f, [s, s + 8, s + 30, s + 46], [0, 1, 1, 0.35]);
  };

  return (
    <AbsoluteFill>
      <Space
        cam={cam}
        bloom={phase === 2 ? 0.95 : 0.4}
        fog={[400, 6500]}
        ink={(Pn) => {
          if (phase === 1) {
            SPECS.forEach((sp, k) => {
              const a = prog(f, k * 10, k * 10 + 20);
              const cx = XS[k];
              sp.bands.forEach(([y0, y1, fill]) => {
                box3(Pn, cx - HW, cx + HW, y0, y1, -Z, Z, {a});
                if (fill > 0) {
                  const yf = y0 + (y1 - y0) * fill;
                  hatch3(Pn, cx - HW, cx + HW, y0, yf, Z, {gap: 16, a: 0.8 * a});
                  line3(Pn, [cx - HW, yf, Z], [cx + HW, yf, Z], {w: 1.6, a});
                  line3(Pn, [cx + HW, yf, Z], [cx + HW, yf, -Z], {w: 1.2, a});
                  if (fill < 1) line3(Pn, [cx - HW - 60, yf, Z], [cx + HW + 60, yf, Z], {w: 1.6, a, color: SIG, dash: [10, 6]});
                }
              });
              if (sp.bands.length === 2) {
                const g0 = sp.bands[0][1];
                const g1 = sp.bands[1][0];
                for (let x = cx - HW; x < cx + HW; x += 26) line3(Pn, [x, g0 + 6, Z], [Math.min(x + (g1 - g0) - 12, cx + HW), g1 - 6, Z], {w: 0.8, a: 0.55 * a, color: SIG});
              }
              (sp.holes ?? []).forEach((h) => ring3(Pn, add(h, [cx, 0, 0]), 14, [0, 0, 1], {w: 1.8, a, color: SIG, seg: 18}));
              const o = hl(k);
              if (o > 0.01) box3(Pn, cx - HW - 40, cx + HW + 40, -460, 460, -Z - 40, Z + 40, {w: 1.6, a: o, color: SIG});
            });
          }
          if (phase === 2) {
            const C = CHIP;
            const h = CS / 2;
            box3(Pn, C[0] - h, C[0] + h, C[1] - 40, C[1], C[2] - h, C[2] + h, {w: 1.6});
            for (let i = 0; i < 18; i++) {
              const u = -h + 60 + (i * (CS - 120)) / 17;
              for (const [p, q] of [
                [[C[0] + u, C[1] - 20, C[2] + h], [C[0] + u, C[1] - 60, C[2] + h + 90]],
                [[C[0] + u, C[1] - 20, C[2] - h], [C[0] + u, C[1] - 60, C[2] - h - 90]],
                [[C[0] + h, C[1] - 20, C[2] + u], [C[0] + h + 90, C[1] - 60, C[2] + u]],
                [[C[0] - h, C[1] - 20, C[2] + u], [C[0] - h - 90, C[1] - 60, C[2] + u]],
              ] as Array<[V3, V3]>)
                line3(Pn, p, q, {w: 2});
            }
            const cell = (CS - 120) / G;
            for (let i = 0; i <= G; i++) {
              line3(Pn, [C[0] - h + 60 + i * cell, C[1], C[2] - h + 60], [C[0] - h + 60 + i * cell, C[1], C[2] + h - 60], {w: 0.7, a: 0.6});
              line3(Pn, [C[0] - h + 60, C[1], C[2] - h + 60 + i * cell], [C[0] + h - 60, C[1], C[2] - h + 60 + i * cell], {w: 0.7, a: 0.6});
            }
            // 地面网格
            mesh3(Pn, (u, v) => [C[0] - 3000 + u * 6000, C[1] - 120, C[2] - 3000 + v * 6000], {nu: 30, nv: 30, res: 2, w: 0.6, a: 0.18});
          }
          if (phase === 3) {
            const tf = f - endCard;
            mesh3(Pn, (u, v) => [-4000 + u * 8000, 0, -6000 + v * 7000 + ((tf * 4) % (7000 / 28))], {nu: 40, nv: 28, res: 2, w: 0.8, a: 0.4 * prog(tf, 0, 30)});
          }
        }}
        glow={(Gc, Ls) => {
          if (phase === 1) {
            SPECS.forEach((sp, k) => {
              const a = prog(f, k * 10, k * 10 + 20);
              const cx = XS[k];
              (sp.electrons ?? []).forEach((e, i) => spark3(Gc, Ls, add(e, [cx, Math.sin(f * 0.2 + i) * 6, 0]), t + i, 1, a));
              if (k === 0) for (let i = 0; i < 8; i++) ember3(Gc, Ls, [cx - 200 + i * 57, 8 + Math.sin(f * 0.3 + i) * 10, Z], 1.2, a);
            });
          }
          if (phase === 2) {
            const C = CHIP;
            const h = CS / 2;
            const cell = (CS - 120) / G;
            Gc.fillStyle = P.signal;
            for (let i = 0; i < G; i++)
              for (let j = 0; j < G; j++) {
                const w = Math.sin((i + j) * 0.42 - (f - c2) * 0.2 + hash(i, j) * 0.6);
                if (w < 0.72) continue;
                const x0 = C[0] - h + 60 + i * cell + 5;
                const z0 = C[2] - h + 60 + j * cell + 5;
                const pts = [
                  Ls.project([x0, C[1], z0]),
                  Ls.project([x0 + cell - 10, C[1], z0]),
                  Ls.project([x0 + cell - 10, C[1], z0 + cell - 10]),
                  Ls.project([x0, C[1], z0 + cell - 10]),
                ];
                if (pts.some((q) => q.z < 30)) continue;
                Gc.beginPath();
                Gc.moveTo(pts[0].x, pts[0].y);
                for (let q = 1; q < 4; q++) Gc.lineTo(pts[q].x, pts[q].y);
                Gc.closePath();
                Gc.fill();
              }
          }
        }}
      />

      {/* 三幅图的标题（跟随透视） */}
      {phase === 1 &&
        TITLES.map((ti, k) => {
          const q = L.project([XS[k] - HW, 470, Z]);
          const qs = L.project([XS[k] - HW, -470, Z]);
          const a = prog(f, k * 10 + 6, k * 10 + 22);
          return (
            <React.Fragment key={k}>
              <div style={{position: 'absolute', left: q.x, top: q.y - 74, opacity: a}}>
                <div style={{fontFamily: F.mono, fontSize: 13, letterSpacing: 3, color: P.signal}}>{ti.en}</div>
                <div style={{fontFamily: F.sans, fontWeight: 900, fontSize: Math.max(30, Math.min(60, q.s * 70)), color: ink.fg, lineHeight: 1.1}}>{ti.cn}</div>
              </div>
              <div style={{position: 'absolute', left: qs.x, top: qs.y + 12, opacity: a, fontFamily: F.sans, fontWeight: 700, fontSize: 24, color: ink.fg}}>{ti.sub}</div>
            </React.Fragment>
          );
        })}

      <Slam f={f} t0={c2 + 16} t1={endCard} x={1810} y={760} size={130} align="right" weight={900}>
        数十亿个晶体管
      </Slam>
      <Slam f={f} t0={c2 + 22} t1={endCard} x={1810} y={860} size={15} align="right" font="mono" weight={500} spacing={3} color={P.signal}>
        ~10⁹–10¹⁰ TRANSISTORS · EACH ONE RUNS ON BAND THEORY
      </Slam>

      {phase === 3 && <EndCard f={f - endCard} />}
    </AbsoluteFill>
  );
};

const EndCard: React.FC<{f: number}> = ({f}) => {
  const ink = useInk();
  return (
    <AbsoluteFill>
      <Slam f={f} t0={0} x={120} y={330} size={16} font="mono" weight={500} spacing={4} color={P.signal}>
        QUOD ERAT DEMONSTRANDUM
      </Slam>
      <Slam f={f} t0={4} x={112} y={440} size={100} spacing={4}>
        导电与否，
      </Slam>
      <Slam f={f} t0={10} x={112} y={560} size={100} spacing={4}>
        取决于有没有空着的量子态。
      </Slam>
      <div style={{position: 'absolute', left: 120, top: 650, width: 1680 * prog(f, 16, 56, ease.outExpo), height: 1.4, background: ink.fg}} />
      <Slam f={f} t0={30} x={120} y={700} size={34} font="cjkSerif" weight={600} spacing={3} color={ink.dim} from={1.04}>
        对称 → 填充 → 打破对称 → 散射平衡
      </Slam>
      <Slam f={f} t0={44} x={1800} y={700} size={16} align="right" font="mono" weight={500} spacing={4} color={P.signal}>
        FIN.
      </Slam>
    </AbsoluteFill>
  );
};

export const S9Summary: React.FC<P_> = (props) => {
  const f = useCurrentFrame();
  const c2 = props.cues[2].start;
  return (
    <MotionBlur on={f >= c2 - 4 && f < c2 + 2} samples={4}>
      <Content {...props} />
    </MotionBlur>
  );
};
