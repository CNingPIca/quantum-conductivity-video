import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Cue} from '../script';
import {F, P, useInk} from '../theme';
import {MotionBlur} from '../engine/camera';
import {Callout, ScreenSvg, Slam} from '../engine/type';
import {ease, hash, lerp, mod, prog} from '../engine/util';
import {add, box3, cam3At, Cam3, ember3, lens, line3, orbit, particles3, Pen, ring3, Space, spark3, sphere3, V3, bloomAt} from '../engine/space';

type P_ = {cues: Cue[]; duration: number};

const SIG: [number, number, number] = [255, 77, 18];
const EV = 400;
const GAP = 1.1 * EV;
const DIA = 5.5 * EV;
const X0 = -560;
const X1 = 560;
const NX = 10;
const NZ = 4;
const sx = (ix: number) => -500 + ix * 111;
const sz = (iz: number) => -165 + iz * 110;
const sy = (iy: number) => -380 + iy * 90; // iy = 4 为价带顶层
const TOPY = sy(4);
const CB0 = GAP;
const CB1 = GAP + 380;
const RX = -720;
const RZ = 260;

const EXC: Array<[number, number]> = [
  [6, 1],
  [8, 2],
  [4, 3],
  [9, 0],
];
const STEP = 30;

// 掺杂晶格
const DN: V3 = [7000, 0, 0];
const DP: V3 = [8300, 0, 0];
const LS = 170;

const T = (cues: Cue[]) => {
  const [c0, c1, c2, c3] = cues.map((c) => c.start);
  return {c0, c1, c2, c3, crane0: c0 + 16, crane1: c0 + 110, field: c2 + 40};
};

const Content: React.FC<P_> = ({cues, duration}) => {
  const f = useCurrentFrame();
  const ink = useInk();
  const t = f / 30;
  const {c0, c1, c2, c3, crane0, crane1, field} = T(cues);

  const exAt = EXC.map((_, i) => c1 + 14 + i * 22);
  const tau = Math.max(0, f - field);
  const nStep = Math.floor(tau / STEP);
  const frac = f < field ? 0 : ease.inOutCubic(Math.max(0, ((tau % STEP) - (STEP - 12)) / 12));
  const holeIx = (h: number) => Math.max(0, EXC[h][0] - nStep);

  const cbPos = (h: number): V3 | null => {
    const s = exAt[h];
    if (f < s) return null;
    const [ix, iz] = EXC[h];
    const from: V3 = [sx(ix), TOPY, sz(iz)];
    const land: V3 = [sx(ix) - 160, CB0 + 90 + hash(h, 3) * 160, sz(iz)];
    const k = prog(f, s, s + 26, ease.inOutCubic);
    if (k < 1) {
      const p: V3 = [lerp(from[0], land[0], k), lerp(from[1], land[1], k) + Math.sin(Math.PI * k) * 160, lerp(from[2], land[2], k)];
      return p;
    }
    const drift = Math.max(0, f - field) * 4.5;
    const x = X0 + 40 + mod(land[0] - X0 - 40 + drift, X1 - X0 - 80);
    return [x, land[1] + Math.sin(f * 0.2 + h) * 8, land[2]];
  };

  // 相机
  let cam: Cam3 = cam3At(f, [
    {f: 0, eye: [1000, DIA + 420, 2400], target: [0, DIA - 60, 0], fov: 42, roll: -3},
    {f: crane0, eye: [1000, DIA + 380, 2350], target: [0, DIA - 80, 0]},
    {f: crane1, eye: [1250, 560, 2050], target: [0, 160, 0], fov: 44, roll: -2, ez: ease.inOutCubic},
    {f: c1, eye: [1200, 600, 2000], target: [0, 180, 0]},
    {f: c2, eye: orbit([0, 160, 0], 2100, 40, 14), target: [0, 160, 0]},
    {f: c2 + 30, eye: orbit([0, 200, 0], 1950, 26, 12), target: [0, 200, 0], fov: 46, ez: ease.inOutCubic},
    {f: c3, eye: orbit([0, 200, 0], 1900, 20, 12), target: [0, 200, 0]},
    {f: c3 + 18, eye: add(DN, [-500, 650, 1300]), target: add(DN, [80, 0, 0]), fov: 44, roll: -3, ez: ease.inOutExpo},
    {f: c3 + 70, eye: add(DN, [300, 600, 1500]), target: add(DN, [500, 0, 0])},
    {f: c3 + 110, eye: add(DP, [-300, 600, 1500]), target: add(DP, [0, 0, 0]), ez: ease.inOutCubic},
    {f: duration, eye: add(DP, [-100, 640, 1600]), target: add(DP, [-500, 0, 0])},
  ]);
  if (f >= c1 && f < c2) cam = {...cam, eye: orbit([0, 180, 0], 2350, 25 + (f - c1) * 0.12, 13)};
  const L = lens(cam);
  const craneEV = Math.max(1.1, Math.min(5.5, (cam.target[1] + 60) / EV));
  const atDoping = f >= c3 + 4;

  const lattice = (Pn: Pen, C: V3, dop: string) => {
    const items: Array<{p: V3; z: number; dop: boolean}> = [];
    for (let i = -2; i <= 2; i++)
      for (let j = -1; j <= 1; j++)
        for (let k = -1; k <= 1; k++) {
          const p = add(C, [i * LS, j * LS, k * LS]);
          items.push({p, z: Pn.L.project(p).z, dop: i === 0 && j === 0 && k === 0});
          if (i < 2) line3(Pn, add(p, [24, 0, 0]), add(p, [LS - 24, 0, 0]), {w: 1, a: 0.6});
          if (j < 1) line3(Pn, add(p, [0, 24, 0]), add(p, [0, LS - 24, 0]), {w: 1, a: 0.6});
          if (k < 1) line3(Pn, add(p, [0, 0, 24]), add(p, [0, 0, LS - 24]), {w: 1, a: 0.6});
        }
    items.sort((a, b) => b.z - a.z);
    items.forEach((it) => sphere3(Pn, it.p, it.dop ? 38 : 30, {solid: it.dop, label: it.dop ? dop : 'Si'}));
  };

  return (
    <AbsoluteFill>
      <Space
        cam={cam}
        bloom={bloomAt(f, 0.45, exAt, 1, 6)}
        fog={[400, 6200]}
        ink={(Pn) => {
          if (!atDoping) {
            // 价带 / 导带
            box3(Pn, X0, X1, -420, 0, -220, 220);
            box3(Pn, X0, X1, CB0, CB1, -220, 220);
            for (let ix = 0; ix < NX; ix++) for (let iz = 0; iz < NZ; iz++) ring3(Pn, [sx(ix), CB0 + 60, sz(iz)], 12, [0, 1, 0], {w: 0.8, a: 0.35, seg: 12});
            // 金刚石的带隙（幽灵）
            const go = 1 - prog(f, crane1 - 20, crane1 + 10);
            if (go > 0) {
              box3(Pn, X0, X1, DIA, DIA + 380, -220, 220, {w: 1, a: 0.55 * go});
              for (let x = X0; x <= X1; x += 80) line3(Pn, [x, DIA, 220], [x, DIA, -220], {w: 0.7, a: 0.3 * go, dash: [6, 8]});
            }
            // 标尺
            line3(Pn, [RX, 0, RZ], [RX, DIA, RZ], {w: 1.2, a: 0.9});
            for (let i = 0; i <= 55; i++) line3(Pn, [RX, i * 40, RZ], [RX + (i % 10 === 0 ? 70 : i % 5 === 0 ? 40 : 18), i * 40, RZ], {w: i % 10 === 0 ? 1.3 : 0.9, a: i % 10 === 0 ? 1 : 0.55});
            // 带隙尺寸线
            const dimO = prog(f, crane1 - 10, crane1 + 10);
            if (dimO > 0) {
              line3(Pn, [X1 + 60, 0, 220], [X1 + 60, GAP, 220], {w: 1.6, a: dimO, color: SIG});
              line3(Pn, [X1 + 30, 0, 220], [X1 + 90, 0, 220], {w: 1.3, a: dimO, color: SIG});
              line3(Pn, [X1 + 30, GAP, 220], [X1 + 90, GAP, 220], {w: 1.3, a: dimO, color: SIG});
            }
            // 空穴：价带顶层的信号橙空心环
            EXC.forEach((_, h) => {
              if (f < exAt[h] + 4) return;
              const x = f >= field ? lerp(sx(holeIx(h)), sx(holeIx(h) - 1), holeIx(h) > 0 ? frac : 0) : sx(EXC[h][0]);
              ring3(Pn, [x, TOPY, sz(EXC[h][1])], 22, [0, 0, 1], {w: 2, color: SIG, seg: 24});
              ring3(Pn, [x, TOPY, sz(EXC[h][1])], 22, [0, 1, 0], {w: 1.2, a: 0.6, color: SIG, seg: 24});
            });
          } else {
            lattice(Pn, DN, 'P');
            lattice(Pn, DP, 'B');
          }
        }}
        glow={(G, Ls) => {
          if (!atDoping) {
            for (let ix = 0; ix < NX; ix++)
              for (let iy = 0; iy < 5; iy++)
                for (let iz = 0; iz < NZ; iz++) {
                  let x = sx(ix);
                  if (iy === 4) {
                    const isHole = EXC.some((e, h) => f >= exAt[h] && holeIx(h) === ix && e[1] === iz);
                    if (isHole) continue;
                    const moving = f >= field && frac > 0 && EXC.some((e, h) => holeIx(h) > 0 && holeIx(h) - 1 === ix && e[1] === iz);
                    if (moving) x = lerp(sx(ix), sx(ix + 1), frac);
                  }
                  const n = ix * 31 + iy * 7 + iz;
                  ember3(G, Ls, [x, sy(iy) + Math.sin(f * 0.2 + n) * 3, sz(iz)], 1.5, 0.8);
                }
            EXC.forEach((_, h) => {
              const p = cbPos(h);
              if (!p) return;
              spark3(G, Ls, p, t + h, 1.3);
              particles3(G, Ls, t, (tb) => (tb * 30 >= exAt[h] && tb * 30 < exAt[h] + 3 ? [sx(EXC[h][0]), TOPY, sz(EXC[h][1])] : null), {rate: 200, speed: 240, life: 0.45, seed: 10 + h});
            });
          } else {
            // n 型：多出的电子绕磷原子运动
            const a = f * 0.09;
            const pn: V3 = add(DN, [Math.cos(a) * 90, Math.sin(a * 1.3) * 50, Math.sin(a) * 90]);
            spark3(G, Ls, pn, t, 1.5);
            particles3(G, Ls, t, (tb) => {
              const aa = tb * 30 * 0.09;
              return add(DN, [Math.cos(aa) * 90, Math.sin(aa * 1.3) * 50, Math.sin(aa) * 90]);
            }, {rate: 40, speed: 120, life: 0.35, seed: 3});
            // p 型：硼旁边少一个电子（空穴在键上跳动）
            const hk = Math.floor(f / 24) % 3;
            const hp: V3 = add(DP, hk === 0 ? [LS / 2, 0, 0] : hk === 1 ? [0, LS / 2, 0] : [0, 0, LS / 2]);
            const pulse = 0.6 + 0.4 * Math.sin(f * 0.3);
            G.save();
            const q = Ls.project(hp);
            G.strokeStyle = `rgba(255,77,18,${pulse})`;
            G.lineWidth = 2.4;
            G.beginPath();
            G.arc(q.x, q.y, Math.max(6, 20 * q.s), 0, Math.PI * 2);
            G.stroke();
            G.restore();
          }
        }}
      />

      <ScreenSvg>
        {!atDoping && (
          <>
            {f < c2 && [0, 1, 2, 3, 4, 5].map((i) => {
              const q = L.project([RX - 40, i * EV, RZ]);
              if (q.z < 50) return null;
              return (
                <text key={i} x={q.x} y={q.y + 8} textAnchor="end" fontFamily={F.mono} fontSize={Math.max(12, Math.min(28, q.s * 32))} fill={ink.dim}>
                  {i} eV
                </text>
              );
            })}
            <Callout at={L.project([X1, DIA + 380, 220])} dx={120} dy={-90} mono="DIAMOND · 5.5 eV" text="金刚石的导带" o={prog(f, 6, 18) * (1 - prog(f, crane1 - 30, crane1 - 10))} />
            {(() => {
              const p = cbPos(0);
              return p ? <Callout at={L.project(p)} dx={120} dy={-150} mono="ELECTRON" text="电子 e⁻" o={prog(f, c2 + 4, c2 + 16) * (1 - prog(f, c3 - 6, c3))} /> : null;
            })()}
            <Callout at={L.project([f >= field ? sx(holeIx(1)) : sx(EXC[1][0]), TOPY, sz(EXC[1][1])])} dx={140} dy={150} mono="HOLE" text="空穴 h⁺" color={P.signal} o={prog(f, c2 + 10, c2 + 22) * (1 - prog(f, c3 - 6, c3))} />
          </>
        )}
        {atDoping && (
          <>
            <Callout at={L.project(DN)} dx={180} dy={230} mono="N-TYPE · PHOSPHORUS" text="n 型：多出 1 个电子" o={prog(f, c3 + 24, c3 + 36) * (1 - prog(f, c3 + 96, c3 + 106))} />
            <Callout at={L.project(add(DP, [LS / 2, 0, 0]))} dx={160} dy={-200} mono="P-TYPE · BORON" text="p 型：少 1 个电子 = 空穴" color={P.signal} o={prog(f, c3 + 112, c3 + 124)} />
          </>
        )}
      </ScreenSvg>

      {/* 大字 */}
      {f >= crane0 && f < crane1 + 6 && (
        <div
          style={{
            position: 'absolute',
            right: 110,
            top: 300,
            transform: 'translateY(-50%)',
            fontFamily: F.display,
            fontWeight: 900,
            fontStretch: '62%',
            fontSize: 260,
            color: ink.fg,
            fontVariantNumeric: 'tabular-nums lining-nums',
            opacity: prog(f, crane0, crane0 + 8),
          }}
        >
          {craneEV.toFixed(1)}
          <span style={{fontSize: 90, marginLeft: 16}}>eV</span>
        </div>
      )}
      <Slam f={f} t0={crane1} t1={c1 + 20} x={1810} y={300} size={260} align="right" stretch={62} color={P.signal} glow={1}>
        1.1 eV
      </Slam>
      <Slam f={f} t0={crane1 + 4} t1={c1 + 20} x={1810} y={450} size={15} align="right" font="mono" weight={500} spacing={3} color={ink.dim}>
        SILICON — A NARROW GAP · 硅 · 窄带隙
      </Slam>
      <Slam f={f} t0={c1 + 10} t1={c2} x={110} y={280} size={150} weight={900}>
        热激发
      </Slam>
      <Slam f={f} t0={c1 + 14} t1={c2} x={116} y={390} size={15} font="mono" weight={500} spacing={3} color={P.signal}>
        THERMAL EXCITATION ACROSS THE GAP
      </Slam>
      <Slam f={f} t0={c2 + 26} t1={c3} x={110} y={240} size={34} weight={900}>
        电子 →
      </Slam>
      <Slam f={f} t0={c2 + 30} t1={c3} x={110} y={300} size={34} weight={900} color={P.signal}>
        ← 空穴
      </Slam>
      <Slam f={f} t0={c2 + 34} t1={c3} x={116} y={350} size={15} font="mono" weight={500} spacing={3} color={ink.dim}>
        BOTH CARRY CURRENT
      </Slam>
      <Slam f={f} t0={c3 + 20} x={110} y={280} size={170} weight={900}>
        掺杂
      </Slam>
      <Slam f={f} t0={c3 + 24} x={116} y={400} size={15} font="mono" weight={500} spacing={3} color={P.signal}>
        DOPING — TUNING THE CARRIERS
      </Slam>
      <Slam f={f} t0={c3 + 120} x={1810} y={880} size={64} align="right" weight={900} color={P.signal} glow={1}>
        → 二极管 · 晶体管 · 芯片
      </Slam>
    </AbsoluteFill>
  );
};

export const S8Semi: React.FC<P_> = (props) => {
  const f = useCurrentFrame();
  const {c3} = T(props.cues);
  return (
    <MotionBlur on={f >= c3 && f < c3 + 18} samples={6}>
      <Content {...props} />
    </MotionBlur>
  );
};
