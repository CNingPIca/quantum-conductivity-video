import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Cue} from '../script';
import {F, P, useInk} from '../theme';
import {MotionBlur} from '../engine/camera';
import {Callout, ScreenSvg, Slam} from '../engine/type';
import {ease, lerp, prog} from '../engine/util';
import {add, bloomAt, cam3At, Cam3, glow3, lens, line3, orbit, particles3, poly3, Space, spark3, V3} from '../engine/space';

type P_ = {cues: Cue[]; duration: number};

/* 电子的量子态 = E(k) 曲线上的一个个“座位”。每个座位画成一小段螺旋：
 * 螺距 = 波长（|k| 越大越密），旋向 = k 的符号（e^{+ikx} 与 e^{−ikx} 互为镜像）。 */
const N = 24;
const KX = 1000; // k = π 对应的 x
const EH = 760; // 能带宽度（世界单位）
const SIG: [number, number, number] = [255, 77, 18];
const kj = (j: number) => -Math.PI + ((j + 0.5) * 2 * Math.PI) / N;
const Ek = (k: number) => (EH * (1 - Math.cos(k))) / 2;
const slot = (j: number): V3 => [(kj(j) / Math.PI) * KX, Ek(kj(j)), 0];
const SEAT = 26; // 自旋 ↑↓ 两个座位的 z 偏移

/** 螺旋：中心 c、半径 r、长度 len、圈数 turns、旋向 hand、相位 ph */
const helix = (c: V3, r: number, len: number, turns: number, hand: number, ph: number, n = 60): V3[] => {
  const pts: V3[] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n - 0.5;
    const a = hand * (u * turns * 2 * Math.PI) - ph;
    pts.push([c[0] + u * len, c[1] + Math.cos(a) * r, c[2] + Math.sin(a) * r]);
  }
  return pts;
};
const turnsOf = (k: number) => 0.6 + (Math.abs(k) / Math.PI) * 3.4;

// 填充顺序：按能量从低到高，每个座位两个电子
const ORDER: number[] = [];
for (let d = 0; d < N / 2; d++) ORDER.push(N / 2 - 1 - d, N / 2 + d);
const NFILL = 12; // 填到 |k| < π/2

const T = (cues: Cue[]) => {
  const [c0, c1, c2, c3, c4, c5] = cues.map((c) => c.start);
  return {c0, c1, c2, c3, c4, c5, shrink0: c1 + 10, shrink1: c1 + 70, reject: c3 + 70};
};

/** 第 n 个电子：落座时间与位置 */
const seatOf = (n: number) => {
  const j = ORDER[Math.floor(n / 2)];
  const s = slot(j);
  return {j, p: add(s, [0, 0, n % 2 === 0 ? -SEAT : SEAT]) as V3};
};
const landAt = (n: number, c: ReturnType<typeof T>) => {
  if (n === 0) return c.c3 + 24;
  if (n === 1) return c.c3 + 46;
  if (n === 2) return c.reject + 34; // 被拒绝后落到旁边的座位
  if (n === 3) return c.c4 + 10;
  return c.c4 + 14 + (n - 4) * 3;
};

const Content: React.FC<P_> = ({cues, duration}) => {
  const f = useCurrentFrame();
  const ink = useInk();
  const t = f / 30;
  const C = T(cues);
  const {c0, c1, c2, c3, c4, c5, shrink0, shrink1, reject} = C;

  // 主角：一个平面波态，最后缩成 E(k) 上的一个座位
  const J0 = 17; // k ≈ +0.46π
  const m = prog(f, shrink0, shrink1, ease.inOutCubic);
  const s0 = slot(J0);
  const bigC: V3 = [lerp(0, s0[0], m), lerp(0, s0[1], m), 0];
  const bigR = lerp(120, 26, m);
  const bigL = lerp(2600, 150, m);
  const bigTurns = lerp(9, turnsOf(kj(J0)), m);
  const ph = f * 0.18;

  let cam: Cam3 = cam3At(f, [
    {f: 0, eye: [-1100, 300, 1250], target: [250, 0, 0], fov: 46, roll: -5},
    {f: shrink0, eye: [-900, 320, 1350], target: [300, 0, 0]},
    {f: shrink1, eye: [0, 520, 2500], target: [0, 330, 0], fov: 42, roll: -2, ez: ease.inOutCubic},
    {f: c2, eye: orbit([0, 330, 0], 2500, 0, 10), target: [0, 330, 0]},
    {f: c2 + 30, eye: orbit([0, 330, 0], 2350, 38, 14), target: [0, 330, 0], ez: ease.inOutCubic},
    {f: c3, eye: orbit([0, 330, 0], 2350, 30, 14), target: [0, 330, 0]},
    {f: c3 + 18, eye: [-320, 300, 1250], target: [0, 90, 0], fov: 44, roll: -3, ez: ease.inOutExpo},
    {f: c4, eye: [-260, 300, 1280], target: [0, 90, 0]},
    {f: c4 + 40, eye: orbit([0, 300, 0], 2300, 22, 14), target: [0, 300, 0], fov: 42, ez: ease.inOutCubic},
    {f: c5, eye: orbit([0, 300, 0], 2300, 10, 14), target: [0, 300, 0]},
    {f: duration, eye: orbit([0, 300, 0], 2350, -24, 20), target: [0, 300, 0]},
  ]);
  const L = lens(cam);

  const EF = Ek(Math.PI / 2);
  const fl = prog(f, c4 + 60, c4 + 90, ease.outExpo);
  const mirror = prog(f, c2 + 10, c2 + 40);
  const pairs = prog(f, c5 + 10, c5 + 40);

  const elPos = (n: number): V3 | null => {
    const {p} = seatOf(n);
    const land = landAt(n, C);
    if (n === 2) {
      const target12 = add(slot(ORDER[0]), [0, 0, 0]);
      if (f < reject - 14) return null;
      if (f < reject) return lerp3v(add(target12, [0, 600, 0]), add(target12, [0, 26, 0]), prog(f, reject - 14, reject, ease.inQuad));
      const k = prog(f, reject, land, ease.inOutCubic);
      const a = add(target12, [0, 26, 0]);
      return [lerp(a[0], p[0], k), lerp(a[1], p[1], k) + Math.sin(Math.PI * k) * 140, lerp(a[2], p[2], k) + Math.sin(Math.PI * k) * 120];
    }
    if (f < land - 14) return null;
    return lerp3v(add(p, [0, 600, 0]), p, prog(f, land - 14, land, ease.inQuad));
  };

  return (
    <AbsoluteFill>
      <Space
        cam={cam}
        bloom={bloomAt(f, 0.45, [reject, c4 + 70, c5 + 20], 0.5, 8)}
        fog={[300, 6000]}
        ink={(Pn) => {
          const curveO = prog(f, shrink0 + 20, shrink1);
          if (curveO > 0) {
            // E(k) 曲线 + 坐标轴
            const curve: V3[] = [];
            for (let i = 0; i <= 120; i++) {
              const k = -Math.PI + (2 * Math.PI * i) / 120;
              curve.push([(k / Math.PI) * KX, Ek(k) - 30, 0]);
            }
            poly3(Pn, curve, {w: 1, a: 0.5 * curveO});
            line3(Pn, [-KX - 160, -60, 0], [KX + 160, -60, 0], {w: 1.2, a: curveO});
            line3(Pn, [0, -60, 0], [0, EH + 160, 0], {w: 0.9, a: 0.5 * curveO});
            for (const sx of [-1, 1]) line3(Pn, [sx * KX, -60, 0], [sx * KX, EH + 60, 0], {w: 0.8, a: 0.4 * curveO, dash: [5, 7]});
            // 每个座位：一段螺旋（未占据 = 骨白发丝线）
            for (let j = 0; j < N; j++) {
              if (j === J0 && m < 1) continue;
              const k = kj(j);
              poly3(Pn, helix(slot(j), 26, 150, turnsOf(k), Math.sign(k), ph), {w: 1.1, a: 0.9 * curveO});
              line3(Pn, [slot(j)[0], -60, 0], [slot(j)[0], -44, 0], {w: 1, a: curveO});
            }
          }
          // 镜面 k = 0
          if (mirror > 0) {
            for (let y = -40; y <= EH + 80; y += 40) line3(Pn, [0, y, -260], [0, y + 60, 260], {w: 0.7, a: 0.45 * mirror, color: SIG});
            poly3(Pn, [[0, -60, -260], [0, EH + 120, -260], [0, EH + 120, 260], [0, -60, 260]], {w: 1.2, a: mirror, color: SIG, closed: true});
          }
          // 费米能级平面
          if (fl > 0) {
            const w = (KX + 200) * fl;
            poly3(Pn, [[-w, EF + 22, -220], [w, EF + 22, -220], [w, EF + 22, 220], [-w, EF + 22, 220]], {w: 1.6, color: SIG, closed: true});
            for (let x = -w; x <= w; x += 80) line3(Pn, [x, EF + 22, -220], [x, EF + 22, 220], {w: 0.7, a: 0.4, color: SIG});
          }
        }}
        glow={(G, Ls) => {
          // 主角平面波
          const bigO = 1 - prog(f, c2, c2 + 30) * 0.6;
          glow3(G, Ls, helix(bigC, bigR, bigL, bigTurns, 1, ph, 260), lerp(1, 0.6, m), bigO);
          if (f < shrink0) {
            // 平面波的方向：沿 +x
            glow3(G, Ls, [[-1300, 0, 0], [1300, 0, 0]], 0.3, 0.3);
          }
          // 镜像配对的弧线
          const arc = (j: number, I: number) => {
            const a = slot(j);
            const b = slot(N - 1 - j);
            const pts: V3[] = [];
            for (let i = 0; i <= 24; i++) {
              const u = i / 24;
              pts.push([lerp(a[0], b[0], u), lerp(a[1], b[1], u) + Math.sin(Math.PI * u) * (40 + Math.abs(a[0]) * 0.07), -Math.sin(Math.PI * u) * 60]);
            }
            glow3(G, Ls, pts, 0.5, I);
          };
          if (mirror > 0 && f < c3 + 10) for (let j = 0; j < N / 2; j += 2) arc(j, 0.4 * mirror * prog(f, c2 + 20 + j * 3, c2 + 34 + j * 3) * (1 - prog(f, c3, c3 + 10)));
          // 电子
          for (let n = 0; n < NFILL * 2; n++) {
            const p = elPos(n);
            if (!p) continue;
            spark3(G, Ls, p, t + n, 0.9, 0.95, false, 0.3, 1.5);
            const land = landAt(n, C);
            particles3(G, Ls, t, (tb) => (tb * 30 >= land && tb * 30 < land + 2 ? p : null), {rate: 140, speed: 160, life: 0.35, seed: 20 + n, s: 0.8});
          }
          particles3(G, Ls, t, (tb) => (tb * 30 >= reject && tb * 30 < reject + 4 ? add(slot(ORDER[0]), [0, 26, 0]) : null), {rate: 300, speed: 380, life: 0.5, seed: 3});
          // 平衡：配对 + 速度箭头相互抵消
          if (pairs > 0) {
            for (let d = 0; d < NFILL / 2; d++) {
              const ja = ORDER[2 * d];
              arc(ja, pairs * 0.9);
              for (const j of [ja, N - 1 - ja]) {
                const v = Math.sin(kj(j)) * 160;
                const s = slot(j);
                glow3(G, Ls, [add(s, [0, 70, 0]), add(s, [v, 70, 0])], 0.6, pairs);
              }
            }
          }
        }}
      />

      <ScreenSvg>
        <Callout at={L.project([400, 150, 0])} dx={110} dy={-160} mono="WAVELENGTH λ" text="k = 2π / λ" size={34} o={prog(f, c0 + 60, c0 + 72) * (1 - prog(f, shrink0, shrink0 + 10))} />
        <Callout at={L.project(slot(J0))} dx={120} dy={-130} mono="ONE QUANTUM STATE" text="一个量子态" o={prog(f, shrink1 - 6, shrink1 + 8) * (1 - prog(f, c2 + 10, c2 + 20))} color={P.signal} />
        <Callout at={L.project(slot(20))} dx={120} dy={120} mono="+k · RIGHT-HANDED" text="向右" o={prog(f, c2 + 40, c2 + 52) * (1 - prog(f, c3 - 4, c3 + 4))} />
        <Callout at={L.project(slot(3))} dx={-120} dy={120} mono="−k · LEFT-HANDED" text="向左" o={prog(f, c2 + 46, c2 + 58) * (1 - prog(f, c3 - 4, c3 + 4))} />
        {f >= shrink1 &&
          (() => {
            const qk = L.project([KX + 200, -60, 0]);
            const qe = L.project([0, EH + 200, 0]);
            return (
              <g opacity={prog(f, shrink1, shrink1 + 14)}>
                <text x={qk.x} y={qk.y + 14} fontFamily={F.serif} fontStyle="italic" fontSize={54} fill={ink.fg}>
                  k
                </text>
                <text x={qe.x - 14} y={qe.y} fontFamily={F.serif} fontStyle="italic" fontSize={54} fill={ink.fg}>
                  E
                </text>
              </g>
            );
          })()}
      </ScreenSvg>

      <Slam f={f} t0={c0 + 30} t1={c1} x={110} y={260} size={150} font="serif" italic weight={500}>
        <span>
          ψ ∝ e<span style={{fontSize: '0.6em', verticalAlign: '0.7em'}}>ikx</span>
        </span>
      </Slam>
      <Slam f={f} t0={c0 + 36} t1={c1} x={116} y={370} size={15} font="mono" weight={500} spacing={3} color={P.signal}>
        BLOCH, 1928 — A WAVE WITH A DEFINITE MOMENTUM
      </Slam>
      <Slam f={f} t0={c1 + 70} t1={c2} x={110} y={240} size={56} weight={900}>
        每个态 = 一个确定的 k
      </Slam>
      <Slam f={f} t0={c2 + 30} t1={c3} x={110} y={250} size={120} font="serif" italic weight={500} color={P.signal} glow={1}>
        E(+k) = E(−k)
      </Slam>
      <Slam f={f} t0={c2 + 36} t1={c3} x={116} y={350} size={15} font="mono" weight={500} spacing={3} color={ink.dim}>
        SYMMETRY — EVERY RIGHT-MOVER HAS A MIRROR TWIN
      </Slam>
      <Slam f={f} t0={c3 + 20} t1={c4} x={104} y={300} size={290} stretch={62}>
        ≤ 2
      </Slam>
      <Slam f={f} t0={c3 + 24} t1={c4} x={114} y={480} size={15} font="mono" weight={500} spacing={3} color={P.signal}>
        PAULI, 1925 — TWO PER STATE, SPIN ↑↓
      </Slam>
      <Slam f={f} t0={reject} t1={reject + 34} x={1500} y={430} size={260} align="center" color={P.signal} glow={1.2}>
        ✗
      </Slam>
      <Slam f={f} t0={c4 + 76} t1={c5} x={1810} y={300} size={200} align="right" font="serif" italic weight={600} color={P.signal} glow={1}>
        <span>
          E<span style={{fontSize: '0.45em'}}>F</span>
        </span>
      </Slam>
      <Slam f={f} t0={c4 + 80} t1={c5} x={1810} y={430} size={56} align="right" weight={900}>
        费米能级
      </Slam>
      <Slam f={f} t0={c5 + 30} x={1810} y={260} size={120} align="right" font="serif" italic weight={500}>
        Σ v = 0
      </Slam>
      <Slam f={f} t0={c5 + 36} x={1810} y={350} size={15} align="right" font="mono" weight={500} spacing={3} color={ink.dim}>
        AT EQUILIBRIUM, IN EVERY MATERIAL
      </Slam>
    </AbsoluteFill>
  );
};

const lerp3v = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

export const SStates: React.FC<P_> = (props) => {
  const f = useCurrentFrame();
  const {c3} = T(props.cues);
  return (
    <MotionBlur on={f >= c3 && f < c3 + 18} samples={5}>
      <Content {...props} />
    </MotionBlur>
  );
};
