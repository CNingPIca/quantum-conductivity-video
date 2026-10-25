import React, {useMemo} from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Cue} from '../script';
import {F, P, useInk} from '../theme';
import {Stamp} from '../components/svg';
import {MotionBlur} from '../engine/camera';
import {flash} from '../engine/fx';
import {Callout, ScreenSvg, Slam} from '../engine/type';
import {ease, hash, lerp, noise1, prog, pulse} from '../engine/util';
import {add, bloomAt, cam3At, Cam3, ember3, glow3, lens, line3, orbit, particles3, ring3, Space, spark3, sphere3, V3} from '../engine/space';

type P_ = {cues: Cue[]; duration: number};

const SIG: [number, number, number] = [255, 77, 18];
// ---- k 空间：抛物面碗里的费米海 ----
const R0 = 900;
const RF = 470;
const RMAX = 960;
const bowl = (x: number, z: number) => (x * x + z * z) / R0 - 380;
// ---- 实空间：一排晶格 + 电子波 ----
const RB: V3 = [0, 0, 9000];
const A = 140;
const V = 7;
const K0 = (2 * Math.PI) / 110;
const SIGMA = 190;
const gauss = (x: number, c: number, s: number) => Math.exp(-((x - c) ** 2) / (2 * s * s));
const u = (x: number) => 1 + 0.3 * Math.cos((2 * Math.PI * x) / A);
// ---- ρ–T 图 ----
const CH: V3 = [1500, -380, 0];
const CW = 1100;
const CHH = 620;
const rho = (t: number) => 0.08 + (0.85 * t ** 5) / (t ** 4 + 0.25 ** 4);

const T = (cues: Cue[]) => {
  const [c0, c1, c2, c3, c4, c5, c6, c7] = cues.map((c) => c.start);
  const go = c1 + 14;
  const xp = (f: number) => Math.max(0, f - go) * V;
  const impX = Math.round((xp(c2 + 60) + 0) / A) * A;
  const hitF = go + impX / V;
  return {c0, c1, c2, c3, c4, c5, c6, c7, go, xp, impX, hitF, run0: c0 + 30};
};

const Content: React.FC<P_> = ({cues, duration}) => {
  const f = useCurrentFrame();
  const ink = useInk();
  const t = f / 30;
  const C = T(cues);
  const {c0, c1, c2, c3, c4, c5, c6, c7, go, xp, impX, hitF, run0} = C;

  const disk = useMemo(() => {
    const pts: Array<[number, number]> = [];
    for (let r = 30; r <= RF - 10; r += 58) {
      const n = 2 * Math.max(1, Math.round((Math.PI * r) / 58));
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + Math.PI / n;
        pts.push([Math.cos(a) * r, Math.sin(a) * r]);
      }
    }
    return pts;
  }, []);

  // 温度（c7 之后升高）：散射更频繁，稳态偏移更小
  const temp = prog(f, c7 + 10, c7 + 120, ease.inOutCubic);
  const Sinf = lerp(150, 70, temp);
  // 费米海的偏移
  let shift = 0;
  if (f < c1) shift = Math.min(620, Math.max(0, f - run0) ** 1.35 * 1.6); // 假想：一直加速
  else if (f >= c3) {
    const tau = 26;
    shift = Sinf * (1 - Math.exp(-Math.max(0, f - (c3 + 20)) / tau));
    shift *= 1 - 0.995 * prog(f, c5 + 20, c5 + 70, ease.inOutCubic) * (1 - prog(f, c6 + 60, c6 + 90, ease.inOutCubic));
  }
  const inK = f < c1 + 8 || f >= c3 - 8;
  const inR = f >= c1 - 6 && f < c3 + 8;
  const fieldOn = (f >= c0 + 20 && f < c1) || f >= c3 + 10;

  // 散射事件：前沿 → 后沿
  const rate = f < c7 ? 3 : lerp(3, 1, temp); // 每隔多少帧一次
  const scatterOn = f >= c3 + 20;
  const events: Array<{a: number; b: number; s: number}> = [];
  if (scatterOn) {
    const n0 = Math.floor((f - 16 - (c3 + 20)) / 1);
    for (let n = Math.max(0, n0); n <= f - (c3 + 20); n++) {
      const tt = c3 + 20 + n;
      if (n % Math.max(1, Math.round(rate)) !== 0) continue;
      const age = f - tt;
      if (age < 0 || age > 16) continue;
      events.push({a: (hash(n, 1) - 0.5) * 1.6, b: Math.PI + (hash(n, 2) - 0.5) * 1.6, s: age / 16});
    }
  }

  // 相机
  let cam: Cam3 = cam3At(f, [
    {f: 0, eye: orbit([0, -300, 0], 2300, -20, 32), target: [60, -300, 0], fov: 44, roll: -3},
    {f: c1 - 10, eye: orbit([300, -300, 0], 2600, -6, 30), target: [500, -300, 0]},
    {f: c1 + 8, eye: add(RB, [-700, 260, 900]), target: add(RB, [300, 0, 0]), fov: 46, roll: -4, ez: ease.inOutExpo},
    {f: c3 - 10, eye: add(RB, [impX - 700, 700, 1700]), target: add(RB, [impX, 0, 0])},
    {f: c3 + 8, eye: orbit([0, -300, 0], 2300, -14, 34), target: [80, -300, 0], fov: 44, roll: -2, ez: ease.inOutExpo},
    {f: c5, eye: orbit([0, -300, 0], 2200, 6, 36), target: [80, -300, 0]},
    {f: c5 + 60, eye: orbit([RF * 0.5, -260, 0], 1600, 14, 26), target: [RF * 0.5, -260, 0], fov: 40, ez: ease.inOutCubic},
    {f: c6 + 60, eye: orbit([RF * 0.5, -260, 0], 1560, 20, 26), target: [RF * 0.5, -260, 0]},
    {f: c7 + 10, eye: orbit([900, -150, 0], 3300, 4, 18), target: [1000, -150, 0], fov: 42, roll: 0, ez: ease.inOutCubic},
    {f: duration, eye: orbit([900, -150, 0], 3300, -6, 16), target: [1000, -150, 0]},
  ]);
  if (f >= c1 + 8 && f < hitF) {
    const x = xp(f);
    cam = {eye: add(RB, [x - 600, 300, 1000]), target: add(RB, [x + 300, -10, 0]), fov: 46, roll: -4};
  } else if (f >= hitF && f < c3 - 10) {
    const k = prog(f, hitF, hitF + 36, ease.outExpo);
    const x0 = xp(hitF);
    cam = {eye: add(RB, [lerp(x0 - 600, impX - 700, k), lerp(300, 700, k), lerp(1000, 1700, k)]), target: add(RB, [lerp(x0 + 300, impX, k), 0, 0]), fov: 46, roll: lerp(-4, 0, k)};
  }
  const sh = 22 * pulse(f, hitF, 4);
  if (sh > 0.1) cam = {...cam, eye: add(cam.eye, [0, noise1(f * 0.9, 3) * sh, noise1(f * 0.9, 5) * sh])};
  const L = lens(cam);

  // 实空间的波包
  const amp = 110 * prog(f, go, go + 30, ease.outCubic);
  const vib = prog(f, c2, c2 + 40);
  const helix = (center: number, dir: number, scale: number): V3[] => {
    const pts: V3[] = [];
    for (let x = center - 3.2 * SIGMA; x <= center + 3.2 * SIGMA; x += 6) {
      const r = amp * scale * gauss(x, center, SIGMA) * u(x);
      const ph = K0 * x - dir * 0.32 * f;
      pts.push(add(RB, [x, r * Math.cos(ph), r * Math.sin(ph)]));
    }
    return pts;
  };
  const packets: Array<{pts: V3[]; I: number}> = [];
  if (f >= c1 && f < c3 + 8) {
    if (f < hitF) packets.push({pts: helix(xp(f), 1, 1), I: 1});
    else {
      const d = f - hitF;
      packets.push({pts: helix(impX + V * d, 1, 0.6), I: 1});
      packets.push({pts: helix(impX - V * d, -1, 0.55), I: 1});
    }
  }

  const draw = prog(f, c7 + 10, c7 + 120, ease.inOutCubic);

  return (
    <AbsoluteFill>
      <Space
        cam={cam}
        bloom={bloomAt(f, 0.5, [hitF, c4 + 10, c6 + 4], 1.3, 8) + (scatterOn ? 0.15 : 0)}
        fog={[300, 6400]}
        ink={(Pn) => {
          if (inK) {
            for (let r = 80; r <= RMAX; r += 80) ring3(Pn, [0, bowl(r, 0), 0], r, [0, 1, 0], {w: 0.8, a: 0.45, seg: 64});
            for (let k = 0; k < 24; k++) {
              const a = (k / 24) * Math.PI * 2;
              const pts: V3[] = [];
              for (let r = 0; r <= RMAX; r += 40) pts.push([Math.cos(a) * r, bowl(Math.cos(a) * r, Math.sin(a) * r), Math.sin(a) * r]);
              for (let i = 1; i < pts.length; i++) line3(Pn, pts[i - 1], pts[i], {w: 0.7, a: 0.35});
            }
            // 费米圆（偏移后）
            const fc: V3[] = [];
            for (let k = 0; k <= 72; k++) {
              const a = (k / 72) * Math.PI * 2;
              const x = Math.cos(a) * RF + shift;
              const z = Math.sin(a) * RF;
              fc.push([x, bowl(x, z), z]);
            }
            for (let i = 1; i < fc.length; i++) line3(Pn, fc[i - 1], fc[i], {w: 2, color: SIG});
            // 原位置（虚线）
            if (shift > 4) {
              const g: V3[] = [];
              for (let k = 0; k <= 72; k++) {
                const a = (k / 72) * Math.PI * 2;
                g.push([Math.cos(a) * RF, bowl(Math.cos(a) * RF, Math.sin(a) * RF), Math.sin(a) * RF]);
              }
              for (let i = 1; i < g.length; i += 2) line3(Pn, g[i - 1], g[i], {w: 1, a: 0.6});
            }
            line3(Pn, [-RMAX - 200, -380, 0], [RMAX + 200, -380, 0], {w: 1.1});
            // ρ–T 图
            if (f >= c7) {
              const o = prog(f, c7, c7 + 14);
              line3(Pn, CH, add(CH, [CW + 80, 0, 0]), {w: 1.4, a: o});
              line3(Pn, CH, add(CH, [0, CHH + 80, 0]), {w: 1.4, a: o});
              for (let i = 0; i <= 11; i++) line3(Pn, add(CH, [i * 100, 0, 0]), add(CH, [i * 100, -(i % 5 === 0 ? 30 : 14), 0]), {w: 1, a: o});
              for (let i = 0; i <= 10; i++) line3(Pn, add(CH, [i * 110, 0, 0]), add(CH, [i * 110, 0, 700]), {w: 0.6, a: 0.18 * o});
            }
          }
          if (inR) {
            // 实空间晶格
            const near = cam.target[0] - RB[0];
            const i0 = Math.floor((near - 1800) / A);
            const i1 = Math.ceil((near + 4200) / A);
            const items: Array<{p: V3; z: number; imp: boolean}> = [];
            for (let i = i0; i <= i1; i++) {
              for (const [dy, dz] of [
                [0, -260], [-260, 0], [-260, -260], [260, -260], [-260, 260], [0, -520], [-260, -520],
              ]) {
                const jit: V3 = vib > 0 ? [vib * 8 * Math.sin(f * 0.37 + i * 2.1 + dy), vib * 7 * Math.cos(f * 0.41 + i * 1.7 + dz), vib * 6 * Math.sin(f * 0.5 + i)] : [0, 0, 0];
                const p = add(RB, add([i * A, dy, dz], jit));
                items.push({p, z: Pn.L.project(p).z, imp: false});
              }
              const imp = i * A === impX && f >= c2;
              const jit: V3 = vib > 0 ? [vib * 9 * Math.sin(f * 0.37 + i * 2.1), vib * 8 * Math.cos(f * 0.41 + i * 1.7), 0] : [0, 0, 0];
              const p = add(RB, add([i * A, -150, 0], jit));
              items.push({p, z: Pn.L.project(p).z, imp});
            }
            items.sort((a, b) => b.z - a.z);
            items.forEach((it) => it.z > 30 && sphere3(Pn, it.p, it.imp ? 40 : 22, {solid: it.imp}));
            line3(Pn, add(RB, [near - 2000, 0, 0]), add(RB, [near + 4400, 0, 0]), {w: 1, a: 0.35, color: SIG});
            [0, 10, 20].forEach((d) => {
              const p = (f - hitF - d) / 36;
              if (p > 0 && p < 1) ring3(Pn, add(RB, [impX, 0, 0]), 40 + p * 340, [1, 0, 0], {w: 1.2, a: 1 - p});
            });
          }
        }}
        glow={(G, Ls) => {
          if (inK) {
            disk.forEach(([dx, dz], i) => {
              const x = dx + shift;
              const jig = scatterOn ? Math.sin(f * 0.4 + i) * 3 : 0;
              ember3(G, Ls, [x + jig, bowl(x, dz) + 8, dz], 1.6, 0.9);
            });
            // 散射：前沿的电子被打回后沿
            events.forEach((e, n) => {
              const p0: V3 = [Math.cos(e.a) * RF + shift, 0, Math.sin(e.a) * RF];
              const p1: V3 = [Math.cos(e.b) * RF + shift, 0, Math.sin(e.b) * RF];
              p0[1] = bowl(p0[0], p0[2]) + 8;
              p1[1] = bowl(p1[0], p1[2]) + 8;
              const k = ease.inOutCubic(e.s);
              const arc: V3[] = [];
              for (let j = 0; j <= 16; j++) {
                const uu = (j / 16) * k;
                arc.push([lerp(p0[0], p1[0], uu), lerp(p0[1], p1[1], uu) + Math.sin(Math.PI * uu) * 260, lerp(p0[2], p1[2], uu)]);
              }
              glow3(G, Ls, arc, 0.7, 0.95 * (1 - e.s * 0.5));
              spark3(G, Ls, arc[arc.length - 1], t + n, 0.9, 1 - e.s * 0.4);
            });
            // 电场
            if (fieldOn) {
              const o = f < c1 ? prog(f, c0 + 20, c0 + 30) : prog(f, c3 + 10, c3 + 20);
              // 场线放在碗的远侧、高于碗沿，避免压到字幕
              const FY = 230, FZ = -RMAX * 0.95;
              glow3(G, Ls, [[-RMAX * 0.7, FY, FZ], [RMAX * 0.9, FY, FZ]], 1.2, o);
              spark3(G, Ls, [RMAX * 0.9, FY, FZ], t, 1.4, o);
            }
            if (f >= c7 + 10) {
              const curve: V3[] = [];
              for (let i = 0; i <= 80; i++) {
                const tt = i / 80;
                if (tt > draw) break;
                curve.push(add(CH, [tt * CW, rho(tt) * CHH * 0.92, 0]));
              }
              if (curve.length > 1) {
                glow3(G, Ls, curve, 1.1, 1);
                if (draw < 1) spark3(G, Ls, curve[curve.length - 1], t, 1.5);
              }
            }
          }
          if (inR) {
            packets.forEach((pk) => glow3(G, Ls, pk.pts, 1, pk.I));
            if (f >= hitF) particles3(G, Ls, t, (tb) => (tb * 30 >= hitF && tb * 30 < hitF + 5 ? add(RB, [impX, 0, 0]) : null), {rate: 320, speed: 560, life: 0.65, seed: 5, s: 1.3});
          }
          flash(G, 0.06 * pulse(f, hitF, 2.5));
        }}
      />

      <ScreenSvg>
        <Callout at={L.project([RF + shift, bowl(RF + shift, 0), 0])} dx={130} dy={-150} mono="FERMI SEA, DRIFTING" text="越推越远？" color={P.signal} o={prog(f, c0 + 70, c0 + 82) * (1 - prog(f, c1 - 14, c1 - 6))} />
        {f >= c2 && f < c3 - 8 && (
          <>
            <Callout at={L.project(add(RB, [impX - 5 * A, -150, 0]))} dx={-80} dy={-260} mono="PHONONS" text="热振动（声子）" o={prog(f, c2 + 14, c2 + 26)} />
            <Callout at={L.project(add(RB, [impX, -110, 0]))} dx={90} dy={-280} mono="IMPURITY" text="杂质 / 缺陷" o={prog(f, c2 + 30, c2 + 42)} />
          </>
        )}
        <Callout at={L.project([RF * 0.8 + shift, bowl(RF * 0.8 + shift, 0) + 20, 0])} dx={120} dy={-200} mono="LEADING EDGE" text="前沿" o={prog(f, c3 + 30, c3 + 42) * (1 - prog(f, c4, c4 + 10))} />
        <Callout at={L.project([-RF * 0.8 + shift, bowl(-RF * 0.8 + shift, 0) + 20, 0])} dx={-120} dy={-200} mono="TRAILING EDGE" text="后沿" o={prog(f, c3 + 44, c3 + 56) * (1 - prog(f, c4, c4 + 10))} />
        <Callout at={L.project([RF + shift, bowl(RF + shift, 0) + 8, 0])} dx={160} dy={170} mono="REAL SHIFT ≈ 10⁻¹⁰ × RADIUS" text="实际的偏移" color={P.signal} size={34} o={prog(f, c5 + 60, c5 + 72) * (1 - prog(f, c7 - 6, c7 + 4))} />
        {f >= c7 + 14 &&
          (() => {
            const qT = L.project(add(CH, [CW + 110, 0, 0]));
            const qR = L.project(add(CH, [0, CHH + 120, 0]));
            return (
              <g opacity={prog(f, c7 + 14, c7 + 26)}>
                <text x={qT.x} y={qT.y + 14} fontFamily={F.serif} fontStyle="italic" fontSize={54} fill={ink.fg}>
                  T
                </text>
                <text x={qR.x - 14} y={qR.y} fontFamily={F.serif} fontStyle="italic" fontSize={54} fill={ink.fg}>
                  ρ
                </text>
              </g>
            );
          })()}
      </ScreenSvg>

      <Slam f={f} t0={c0 + 20} t1={c1} x={110} y={240} size={36} weight={900} color={P.signal}>
        电场力 →
      </Slam>
      <Slam f={f} t0={c0 + 120} t1={c1} x={1700} y={600} size={420} align="center" font="serif" italic weight={500} color={P.signal} glow={1}>
        ?
      </Slam>
      {f >= c1 + 70 && f < c2 && (
        <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
          <Stamp x={1500} y={800} text="畅通无阻" sub="A PERFECT LATTICE DOES NOT SCATTER" width={420} t={prog(f, c1 + 70, c1 + 80)} />
        </svg>
      )}
      <Slam f={f} t0={hitF + 2} t1={c3} x={1810} y={830} size={130} align="right" color={P.signal} glow={1}>
        散射 = 阻力
      </Slam>
      <Slam f={f} t0={c3 + 14} t1={c5} x={110} y={240} size={36} weight={900} color={P.signal}>
        电场：推向前方 →
      </Slam>
      <Slam f={f} t0={c3 + 44} t1={c5} x={110} y={300} size={36} weight={900}>
        ← 散射：打回后方
      </Slam>
      <Slam f={f} t0={c4 + 10} t1={c5} x={1810} y={260} size={110} align="right" font="serif" italic weight={500} color={P.signal} glow={1}>
        j = σE
      </Slam>
      {f >= c4 + 16 && f < c5 && (
        <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
          <Stamp x={1500} y={820} text="欧姆定律" sub="PUSH = SCATTERING · STEADY STATE" width={400} color={ink.fg} t={prog(f, c4 + 16, c4 + 26)} rotate={-3} />
        </svg>
      )}
      <Slam f={f} t0={c5 + 10} t1={c7} x={110} y={260} size={150} stretch={62}>
        &lt; 1 mm/s
      </Slam>
      <Slam f={f} t0={c5 + 14} t1={c7} x={116} y={360} size={15} font="mono" weight={500} spacing={3} color={ink.dim}>
        DRIFT VELOCITY · 漂移速度
      </Slam>
      <Slam f={f} t0={c5 + 30} t1={c7} x={1810} y={260} size={150} align="right" stretch={62}>
        1600 km/s
      </Slam>
      <Slam f={f} t0={c5 + 34} t1={c7} x={1810} y={360} size={15} align="right" font="mono" weight={500} spacing={3} color={ink.dim}>
        FERMI VELOCITY · 自身速度
      </Slam>
      <Slam f={f} t0={c6 + 4} t1={c7} x={960} y={820} size={200} align="center" stretch={62} color={P.signal} glow={1.2}>
        <span>
          ≈ 10<span style={{fontSize: '0.55em', verticalAlign: '0.75em'}}>−10</span>
        </span>
      </Slam>
      <Slam f={f} t0={c7 + 40} x={110} y={260} size={110}>
        温度↑ 散射↑ 电阻↑
      </Slam>
      <Slam f={f} t0={c7 + 46} x={116} y={350} size={15} font="mono" weight={500} spacing={3} color={P.signal}>
        HOTTER LATTICE → MORE PHONONS → SMALLER DRIFT
      </Slam>
    </AbsoluteFill>
  );
};

export const SScatter: React.FC<P_> = (props) => {
  const f = useCurrentFrame();
  const {c1, c3, c7} = T(props.cues);
  const on = (f >= c1 - 6 && f < c1 + 10) || (f >= c3 - 8 && f < c3 + 10) || (f >= c7 && f < c7 + 12);
  return (
    <MotionBlur on={on} samples={5}>
      <Content {...props} />
    </MotionBlur>
  );
};
