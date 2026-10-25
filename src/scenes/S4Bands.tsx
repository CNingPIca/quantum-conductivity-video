import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Cue} from '../script';
import {P, useInk} from '../theme';
import {MotionBlur} from '../engine/camera';
import {Callout, Roller, ScreenSvg, Slam} from '../engine/type';
import {ease, keys, prog} from '../engine/util';
import {cam3At, lens, line3, Pen, Space, spark3, particles3, V3, bloomAt} from '../engine/space';

type P_ = {cues: Cue[]; duration: number};

/* 能级沿纵深（-z）方向逐级分裂：每一级是一组悬空的薄板，最后汇成能带“厚板” */
const NS = [1, 2, 4, 8, 64];
const ZS = 650;
const Z0 = (k: number) => -k * ZS;
const Z1 = (k: number) => -k * ZS - 300;
const ZB0 = -5 * ZS;
const ZB1 = -5 * ZS - 2200;
const BASE = [-460, 0, 560];
const SPREAD = [40, 130, 260];
const HX = 220; // 薄板半宽
const SIG: [number, number, number] = [255, 77, 18];

const spreadAt = (k: number, j: number) => SPREAD[j] * (1 - 1 / NS[k]);
const lineY = (k: number, j: number, i: number) => (NS[k] === 1 ? BASE[j] : BASE[j] + spreadAt(k, j) * ((2 * i) / (NS[k] - 1) - 1));

const plate = (Pn: Pen, y: number, za: number, zb: number, a = 1, w = 1.1) => {
  line3(Pn, [-HX, y, za], [HX, y, za], {w, a});
  line3(Pn, [-HX, y, zb], [HX, y, zb], {w: w * 0.8, a: a * 0.6});
  line3(Pn, [-HX, y, za], [-HX, y, zb], {w: w * 0.8, a: a * 0.6});
  line3(Pn, [HX, y, za], [HX, y, zb], {w: w * 0.8, a: a * 0.8});
};

const T = (cues: Cue[]) => {
  const [c0, c1, c2, c3] = cues.map((c) => c.start);
  // 第 4 条字幕同时讲“能带”和“带隙”：带隙在它后半段揭示
  return {c0, c1, c2, c3, c4: cues[4]?.start ?? c3 + 84};
};

const frontKeys = (c: ReturnType<typeof T>) =>
  [
    [c.c0, 200],
    [c.c0 + 60, Z1(0), ease.outCubic],
    [c.c1, Z1(0)],
    [c.c1 + 80, Z1(1), ease.inOutCubic],
    [c.c2, Z1(1)],
    [c.c2 + 30, Z1(2), ease.inOutCubic],
    [c.c2 + 60, Z1(3), ease.inOutCubic],
    [c.c2 + 100, Z1(4), ease.inOutCubic],
    [c.c3 + 70, ZB1, ease.inOutCubic],
  ] as Array<[number, number, (t: number) => number]>;

const Content: React.FC<P_> = ({cues, duration}) => {
  const f = useCurrentFrame();
  const ink = useInk();
  const t = f / 30;
  const C = T(cues);
  const {c0, c1, c2, c3, c4} = C;
  const front = keys(f, frontKeys(C)); // 已画出的最远 z（负值）
  const gapY = (BASE[1] + SPREAD[1] + BASE[2] - SPREAD[2]) / 2;

  const cam = cam3At(f, [
    {f: 0, eye: [1300, 560, 1500], target: [0, 60, -240], fov: 44, roll: -3},
    {f: c1, eye: [1350, 640, 1150], target: [0, 60, -620], fov: 44},
    {f: c1 + 80, eye: [1400, 760, 520], target: [0, 60, -1300]},
    {f: c2 + 100, eye: [1150, 900, -1150], target: [0, 40, -2900], fov: 46},
    {f: c3 + 70, eye: [1500, 1100, -1900], target: [0, 60, -4300], fov: 48, roll: -2},
    {f: c4, eye: [1520, 1110, -2000], target: [0, 60, -4400]},
    {f: c4 + 24, eye: [0, gapY, ZB0 + 500], target: [0, gapY, ZB1], fov: 70, roll: 0, ez: ease.inOutExpo},
    {f: duration, eye: [0, gapY, ZB0 + 120], target: [0, gapY, ZB1]},
  ]);
  const L = lens(cam);

  const nVal = keys(f, [
    [c1 + 10, 1],
    [c1 + 40, 2, ease.inOutCubic],
    [c2 + 10, 2],
    [c2 + 30, 4, ease.inOutCubic],
    [c2 + 50, 8, ease.inOutCubic],
    [c2 + 90, 64, ease.inOutCubic],
  ]);
  const showBig = f >= c3 + 50;
  const gapO = prog(f, c4 + 8, c4 + 24);

  return (
    <AbsoluteFill>
      <Space
        cam={cam}
        bloom={bloomAt(f, 0.4, [c4 + 20], 1.2, 10)}
        inkBloom={bloomAt(f, 0, [c3 + 50], 0.9, 14)}
        fog={[300, 6500]}
        ink={(Pn) => {
          for (let j = 0; j < 3; j++) {
            NS.forEach((n, k) => {
              if (Z0(k) < front + 1) return;
              const zb = Math.max(Z1(k), front);
              for (let i = 0; i < n; i++) {
                const y = lineY(k, j, i);
                if (k === 4) {
                  line3(Pn, [-HX, y, Z0(k)], [HX, y, Z0(k)], {w: 0.6, a: 0.7});
                  if (i === 0 || i === n - 1) plate(Pn, y, Z0(k), zb, 1, 1);
                } else plate(Pn, y, Z0(k), zb, 1, 1.2);
                if (k < NS.length - 1 && Z0(k + 1) >= front) {
                  const m = NS[k + 1] / n;
                  for (let c = 0; c < m; c++) {
                    const yc = lineY(k + 1, j, i * m + c);
                    line3(Pn, [HX, y, Z1(k)], [HX, yc, Z0(k + 1)], {w: 0.8, a: 0.6});
                  }
                }
              }
              if (k === 4 && ZB0 >= front) {
                for (let i = 0; i < n; i += 7) {
                  const y = lineY(4, j, i);
                  const yb = BASE[j] + SPREAD[j] * ((2 * i) / (n - 1) - 1);
                  line3(Pn, [HX, y, Z1(4)], [HX, yb, ZB0], {w: 0.6, a: 0.45});
                }
              }
            });
            // 能带厚板
            if (ZB0 >= front) {
              const zb = Math.max(ZB1, front);
              const yt = BASE[j] + SPREAD[j];
              const yb = BASE[j] - SPREAD[j];
              const nl = Math.max(4, Math.round((2 * SPREAD[j]) / 20));
              for (let i = 0; i <= nl; i++) {
                const y = yb + ((yt - yb) * i) / nl;
                line3(Pn, [-HX, y, ZB0], [HX, y, ZB0], {w: 0.7, a: 0.8});
                if (i % 2 === 0) line3(Pn, [HX, y, ZB0], [HX, y, zb], {w: 0.6, a: 0.4});
              }
              for (const y of [yt, yb]) {
                line3(Pn, [-HX, y, ZB0], [-HX, y, zb], {w: 1.2});
                line3(Pn, [HX, y, ZB0], [HX, y, zb], {w: 1.2});
              }
              for (let z = ZB0; z >= zb; z -= 200) line3(Pn, [-HX, yt, z], [HX, yt, z], {w: 0.7, a: 0.5});
              line3(Pn, [-HX, yt, ZB0], [-HX, yb, ZB0], {w: 1.2});
              line3(Pn, [HX, yt, ZB0], [HX, yb, ZB0], {w: 1.2});
            }
          }
          // 带隙：两侧墙上的信号橙排线（“禁区”）
          if (gapO > 0) {
            for (let g = 0; g < 2; g++) {
              const y0 = BASE[g] + SPREAD[g];
              const y1 = BASE[g + 1] - SPREAD[g + 1];
              for (let z = ZB0; z > ZB1; z -= 60) {
                line3(Pn, [-HX, y0 + 6, z], [-HX, y1 - 6, z - 120], {w: 0.9, a: 0.8 * gapO, color: SIG});
                line3(Pn, [HX, y0 + 6, z], [HX, y1 - 6, z - 120], {w: 0.9, a: 0.8 * gapO, color: SIG});
              }
            }
          }
        }}
        glow={(G, Ls) => {
          if (front < 150 && front > ZB1 + 10) {
            const y = BASE[2] + (front > Z1(4) ? spreadAt(Math.max(0, Math.min(4, Math.floor(-front / ZS))), 2) : SPREAD[2]);
            spark3(G, Ls, [HX, y, front], t, 2, 1, false, 0.6, 3);
            particles3(G, Ls, t, (tb) => {
              const fr = keys(tb * 30, frontKeys(C));
              const yy = BASE[2] + (fr > Z1(4) ? spreadAt(Math.max(0, Math.min(4, Math.floor(-fr / ZS))), 2) : SPREAD[2]);
              return [HX, yy, fr];
            }, {rate: 60, speed: 200, life: 0.4, seed: 4});
          }
        }}
      />

      <ScreenSvg>
        <Callout at={L.project([HX, BASE[1], -150])} dx={120} dy={-150} mono="ONE ATOM" text="分立能级" o={prog(f, c0 + 50, c0 + 62) * (1 - prog(f, c1 + 40, c1 + 50))} />
        <Callout at={L.project([HX, lineY(1, 2, 1), Z0(1) - 150])} dx={140} dy={-120} mono="OVERLAP → SPLIT" text="一分为二" o={prog(f, c1 + 70, c1 + 84) * (1 - prog(f, c2, c2 + 10))} />
        <Callout at={L.project([HX, BASE[2] + SPREAD[2], ZB0 - 300])} dx={150} dy={-120} mono="ALLOWED BAND" text="能带" size={40} o={prog(f, c3 + 56, c3 + 68) * (1 - prog(f, c4, c4 + 8))} />
      </ScreenSvg>

      {f >= c0 && f < c4 && (
        <AbsoluteFill style={{opacity: prog(f, c0, c0 + 12)}}>
          <div style={{position: 'absolute', left: 116, top: 150, fontFamily: '"IBM Plex Mono", monospace', fontSize: 15, letterSpacing: 3, color: ink.dim}}>
            NUMBER OF ATOMS · 原子数
          </div>
          {!showBig && <Roller value={f < c1 ? 1 : nVal} x={104} y={290} size={220} color={P.signal} />}
        </AbsoluteFill>
      )}
      <Slam f={f} t0={c3 + 50} t1={c4} x={104} y={290} size={220} stretch={62} color={P.signal} glow={0.9}>
        <span>
          10<span style={{fontSize: '0.55em', verticalAlign: '0.75em'}}>23</span>
        </span>
      </Slam>
      <Slam f={f} t0={c4 + 22} x={960} y={500} size={300} align="center" font="serif" italic weight={600} color={P.signal} glow={1}>
        <span>
          E<span style={{fontSize: '0.45em'}}>g</span>
        </span>
      </Slam>
      <Slam f={f} t0={c4 + 28} x={960} y={690} size={64} align="center" weight={900}>
        带隙 · 此处没有允许的状态
      </Slam>
      <Slam f={f} t0={c4 + 32} x={960} y={760} size={15} align="center" font="mono" weight={500} spacing={4} color={P.signal}>
        FORBIDDEN GAP
      </Slam>
    </AbsoluteFill>
  );
};

export const S4Bands: React.FC<P_> = (props) => {
  const f = useCurrentFrame();
  const {c4} = T(props.cues);
  return (
    <MotionBlur on={f >= c4 && f < c4 + 22} samples={6}>
      <Content {...props} />
    </MotionBlur>
  );
};
