import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Cue} from '../script';
import {F, P, useInk} from '../theme';
import {Stamp} from '../components/svg';
import {MotionBlur} from '../engine/camera';
import {Callout, ScreenSvg, Slam} from '../engine/type';
import {ease, hash, noise1, prog, pulse} from '../engine/util';
import {add, bloomAt, box3, Cam3, cam3At, ember3, hatch3, lens, line3, orbit, particles3, ring3, Space, spark3, V3} from '../engine/space';

type P_ = {cues: Cue[]; duration: number};

const SIG: [number, number, number] = [255, 77, 18];
const EV = 400;
const GAP = 5.5 * EV;
const RX = -600;
const RZ = 260;
const CU: V3 = [-3200, 0, 0]; // 铜的能带位置

const T = (cues: Cue[]) => {
  const [c0, c1, c2] = cues.map((c) => c.start);
  return {c0, c1, c2, crane0: c1 + 34, crane1: c1 + 140, dive: c2 + 4, zoom: c2 + 40};
};

const Content: React.FC<P_> = ({cues, duration}) => {
  const f = useCurrentFrame();
  const ink = useInk();
  const t = f / 30;
  const {c0, c1, c2, crane0, crane1, dive, zoom} = T(cues);

  let cam: Cam3 = cam3At(f, [
    {f: 0, eye: add(CU, orbit([0, 0, 0], 2200, 34, 12)), target: add(CU, [0, 0, 0]), fov: 42, roll: -3},
    {f: c1, eye: add(CU, orbit([0, 0, 0], 2000, 10, 14)), target: add(CU, [0, 0, 0])},
    {f: c1 + 18, eye: [700, 260, 1100], target: [-120, 40, 0], fov: 44, roll: -3, ez: ease.inOutExpo},
    {f: crane0, eye: [720, 280, 1120], target: [-120, 60, 0]},
    {f: crane1, eye: [900, GAP + 420, 1500], target: [-80, GAP + 180, 0], fov: 48, roll: 0, ez: ease.inOutCubic},
    {f: c2, eye: [920, GAP + 430, 1520], target: [-80, GAP + 180, 0]},
    {f: dive + 18, eye: [400, 220, 900], target: [RX + 120, 20, RZ], fov: 44, ez: ease.inOutExpo},
    {f: zoom, eye: [380, 210, 880], target: [RX + 120, 20, RZ]},
    {f: zoom + 40, eye: [RX + 70, 16, RZ + 120], target: [RX + 10, 6, RZ], fov: 36, roll: -4, ez: ease.inOutExpo},
    {f: duration, eye: [RX + 64, 14, RZ + 112], target: [RX + 10, 6, RZ]},
  ]);
  if (f < c1) cam = {...cam, eye: add(CU, orbit([0, 0, 0], 2200 - 200 * prog(f, 0, c1), 34 - f * 0.16, 12))};
  const sh = 10 * pulse(f, c1 + 50, 3);
  if (sh > 0.1) cam = {...cam, eye: add(cam.eye, [noise1(f * 0.9, 2) * sh, noise1(f * 0.9, 3) * sh, 0])};
  const L = lens(cam);

  const jump = (s: number) => Math.sin(Math.PI * prog(f, s, s + 26)) * 240;
  const jy = jump(c1 + 36) + jump(zoom + 50);
  const craneEV = Math.max(0, Math.min(5.5, (cam.target[1] - 40) / EV));
  const onCu = f < c1 + 12;

  return (
    <AbsoluteFill>
      <Space
        cam={cam}
        bloom={bloomAt(f, 0.45, [c0 + 40, c1 + 49, zoom + 63], 1, 6)}
        inkBloom={bloomAt(f, 0, [crane1], 0.6, 14)}
        fog={[300, 6400]}
        ink={(Pn) => {
          if (onCu) {
            // 铜：一条能带只填一半
            const [x, y, z] = CU;
            box3(Pn, x - 420, x + 420, y - 520, y + 520, z - 220, z + 220);
            hatch3(Pn, x - 420, x + 420, y - 520, y, z + 220, {gap: 18, a: 0.6});
            for (let gx = -360; gx <= 360; gx += 90) for (let gy = 60; gy <= 460; gy += 80) ring3(Pn, [x + gx, y + gy, z + 120], 12, [0, 0, 1], {w: 0.8, a: 0.4, seg: 12});
            const w = 420 + 140;
            line3(Pn, [x - w, y, z + 220], [x + w, y, z + 220], {w: 1.8, color: SIG});
            line3(Pn, [x + w, y, z + 220], [x + w, y, z - 220], {w: 1.2, color: SIG, a: 0.7});
            for (let gx = -420; gx <= 420; gx += 70) line3(Pn, [x + gx, y, z + 220], [x + gx, y, z - 220], {w: 0.7, a: 0.4, color: SIG});
            // 下方的满带（内层电子）
            box3(Pn, x - 420, x + 420, y - 1300, y - 900, z - 220, z + 220, {a: 0.7});
            hatch3(Pn, x - 420, x + 420, y - 1300, y - 900, z + 220, {gap: 14, a: 0.45});
          } else {
            box3(Pn, -400, 400, -500, 0, -200, 200);
            box3(Pn, -400, 400, GAP, GAP + 420, -200, 200);
            for (let ix = 0; ix < 8; ix++) for (let iz = 0; iz < 3; iz++) ring3(Pn, [-350 + ix * 100, GAP + 60, -150 + iz * 150], 14, [0, 1, 0], {w: 0.8, a: 0.4, seg: 14});
            line3(Pn, [RX, 0, RZ], [RX, GAP, RZ], {w: 1.3});
            for (let i = 0; i <= 55; i++) {
              const y = i * (EV / 10);
              const major = i % 10 === 0;
              line3(Pn, [RX, y, RZ], [RX + (major ? 70 : i % 5 === 0 ? 40 : 18), y, RZ], {w: major ? 1.3 : 0.9, a: major ? 1 : 0.6});
            }
            for (let x = -400; x <= 400; x += 100) line3(Pn, [x, 0, -200], [x, 0, 200], {w: 0.7, a: 0.35});
            for (let y = 0; y <= 10; y += 1.2) line3(Pn, [RX + 2, y, RZ], [RX + 52, y, RZ], {w: 0.9, color: SIG});
            line3(Pn, [-400, 0, 200], [400, 0, 200], {w: 1.4, color: SIG, a: 0.7});
            // 带隙的禁区：两侧墙上的信号橙斜线
            for (let y = 40; y < GAP - 40; y += 60) line3(Pn, [400, y, 200], [400, y + 50, -200], {w: 0.7, a: 0.35 * prog(f, crane0, crane0 + 30), color: SIG});
          }
        }}
        glow={(G, Ls) => {
          if (onCu) {
            const [x, y, z] = CU;
            for (let gx = -360; gx <= 360; gx += 90)
              for (let gy = -460; gy <= -40; gy += 70)
                for (let gz = -150; gz <= 150; gz += 150) {
                  const n = gx * 7 + gy * 3 + gz;
                  // 费米面附近的电子在轻轻跃动
                  const hop = gy > -120 ? Math.max(0, Math.sin(f * 0.12 + hash(n, 1) * 6)) * 60 : 0;
                  ember3(G, Ls, [x + gx + (hash(n, 2) - 0.5) * 10, y + gy + hop, z + gz], 1.6, 0.9);
                }
            for (let gx = -360; gx <= 360; gx += 120) for (let gy = -1260; gy <= -940; gy += 80) ember3(G, Ls, [x + gx, y + gy, z], 1.3, 0.5);
          } else {
            for (let ix = 0; ix < 8; ix++)
              for (let iy = 0; iy < 6; iy++)
                for (let iz = 0; iz < 3; iz++) {
                  const n = ix * 31 + iy * 7 + iz;
                  ember3(G, Ls, [-350 + ix * 100 + (hash(n, 1) - 0.5) * 12, -460 + iy * 80 + Math.sin(f * 0.2 + n) * 3, -150 + iz * 150], 1.6, 0.85);
                }
            const p: V3 = [-50, 30 + jy, 100];
            spark3(G, Ls, p, t, 1.4, 1, false, 0.3, 3);
            particles3(G, Ls, t, (tb) => {
              const ff = tb * 30;
              const pk = [c1 + 49, zoom + 63].find((q) => ff >= q && ff < q + 3);
              return pk !== undefined ? [-50, 270, 100] : null;
            }, {rate: 220, speed: 300, life: 0.45, seed: 2});
          }
        }}
      />

      <ScreenSvg>
        {!onCu &&
          cam.fov > 37 &&
          [0, 1, 2, 3, 4, 5].map((i) => {
            const q = L.project([RX - 40, i * EV, RZ]);
            if (q.z < 50) return null;
            return (
              <text key={i} x={q.x} y={q.y + 8} textAnchor="end" fontFamily={F.mono} fontSize={Math.max(12, Math.min(30, q.s * 34))} fill={ink.dim}>
                {i} eV
              </text>
            );
          })}
        <Callout at={L.project(add(CU, [560, 0, 220]))} dx={110} dy={-130} mono="FERMI LEVEL — EMPTY STATES RIGHT ABOVE" text="费米能级" color={P.signal} o={prog(f, c0 + 40, c0 + 52) * (1 - prog(f, c1 - 8, c1))} />
        <Callout at={L.project([RX + 52, 10, RZ])} dx={-260} dy={-200} mono="THERMAL ENERGY, 300 K" text="室温热能 ≈ 0.025 eV" o={prog(f, zoom + 30, zoom + 42)} color={P.signal} size={36} />
      </ScreenSvg>

      <Slam f={f} t0={c0 + 4} t1={c1} x={110} y={300} size={300} stretch={62}>
        Cu
      </Slam>
      <Slam f={f} t0={c0 + 10} t1={c1} x={116} y={470} size={15} font="mono" weight={500} spacing={3} color={P.signal}>
        [Ar] 3d¹⁰ 4s¹ — ONE VALENCE ELECTRON PER ATOM
      </Slam>
      <Slam f={f} t0={c0 + 14} t1={c1} x={110} y={560} size={110} weight={900} color={P.signal} glow={0.8}>
        半满
      </Slam>
      <Slam f={f} t0={c1 + 20} t1={crane1 - 10} x={110} y={280} size={200} weight={900}>
        金刚石
      </Slam>
      <Slam f={f} t0={c1 + 24} t1={crane1 - 10} x={116} y={420} size={15} font="mono" weight={500} spacing={3} color={P.signal}>
        DIAMOND — ONE BAND, EXACTLY FULL
      </Slam>
      {f >= crane0 && f < crane1 + 4 && (
        <div
          style={{
            position: 'absolute',
            right: 110,
            top: 470,
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
      <Slam f={f} t0={crane1 - 4} t1={dive} x={1810} y={470} size={260} align="right" stretch={62}>
        5.5 eV
      </Slam>
      <Slam f={f} t0={crane1} t1={dive} x={1810} y={620} size={15} align="right" font="mono" weight={500} spacing={3} color={P.signal}>
        THE NEAREST EMPTY STATES · 最近的空态
      </Slam>
      <Slam f={f} t0={zoom + 44} x={1810} y={760} size={200} align="right" stretch={62} color={P.signal} glow={1}>
        1/220
      </Slam>
      {f >= zoom + 70 && (
        <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
          <Stamp x={560} y={300} text="跳不过去" sub="NO EMPTY STATE IN REACH" width={380} color={ink.fg} t={prog(f, zoom + 70, zoom + 80)} rotate={-4} />
        </svg>
      )}
    </AbsoluteFill>
  );
};

export const SGaps: React.FC<P_> = (props) => {
  const f = useCurrentFrame();
  const {c1, dive, zoom} = T(props.cues);
  const on = (f >= c1 && f < c1 + 18) || (f >= dive && f < dive + 18) || (f >= zoom + 8 && f < zoom + 34);
  return (
    <MotionBlur on={on} samples={6}>
      <Content {...props} />
    </MotionBlur>
  );
};
