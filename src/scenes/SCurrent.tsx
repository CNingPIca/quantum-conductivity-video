import React, {useMemo} from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Cue} from '../script';
import {F, P, useInk} from '../theme';
import {MotionBlur} from '../engine/camera';
import {Callout, Roller, ScreenSvg, Slam} from '../engine/type';
import {ease, hash, lerp, mod, prog} from '../engine/util';
import {add, bloomAt, cam3At, glow3, lens, lerp3, line3, mul, norm, orbit, ring3, Space, spark3, sphere3, V3} from '../engine/space';

type P_ = {cues: Cue[]; duration: number};

const BX = 1560;
const BY = 520;
const BZ0 = -780;
const BZ1 = 260;
const SP = 260;
const VLEN = 320; // 速度箭头长度（世界单位）
const NH = 23; // 一半的电子（另一半取反方向，保证严格对称）

const T = (cues: Cue[]) => {
  const [c0, c1, c2, c3, c4] = cues.map((c) => c.start);
  return {c0, c1, c2, c3, c4, gather0: c2 + 20, gather1: c2 + 64, bias0: c3 + 30, bias1: c3 + 80};
};

const wrap = (v: number, a: number, b: number) => a + mod(v - a, b - a);

const Content: React.FC<P_> = ({cues, duration}) => {
  const f = useCurrentFrame();
  const ink = useInk();
  const t = f / 30;
  const {c1, c2, c3, c4, gather0, gather1, bias0, bias1} = T(cues);

  const E = useMemo(() => {
    const out: Array<{p0: V3; v: V3}> = [];
    for (let i = 0; i < NH; i++) {
      const u = hash(i, 1) * 2 - 1;
      const a = hash(i, 2) * Math.PI * 2;
      const r = Math.sqrt(1 - u * u);
      const d: V3 = [r * Math.cos(a), u * 0.8, r * Math.sin(a)];
      const dn = norm(d);
      for (const s of [1, -1]) out.push({p0: [(hash(i, s + 3) * 2 - 1) * BX, (hash(i, s + 5) * 2 - 1) * BY, lerp(BZ0, BZ1, hash(i, s + 7))], v: mul(dn, s)});
    }
    return out;
  }, []);

  const SPEED = 34; // 世界单位/帧
  const pos = (e: (typeof E)[number], ff: number): V3 => [
    wrap(e.p0[0] + e.v[0] * SPEED * ff, -BX, BX),
    wrap(e.p0[1] + e.v[1] * SPEED * ff, -BY, BY),
    wrap(e.p0[2] + e.v[2] * SPEED * ff, BZ0, BZ1),
  ];

  const g = prog(f, gather0, gather1, ease.inOutCubic); // 0 = 实空间, 1 = 速度空间
  const bias = prog(f, bias0, bias1, ease.inOutCubic) * (1 - prog(f, c4 + 10, c4 + 50, ease.inOutCubic));
  const D = 0.42 * bias; // 速度整体偏移（夸张）
  const vel = (e: (typeof E)[number]): V3 => [e.v[0] + D, e.v[1], e.v[2]];
  const nR = E.filter((e) => vel(e)[0] > 0.0001).length;
  const nL = E.filter((e) => vel(e)[0] < -0.0001).length;
  const ionsO = 1 - prog(f, gather0, gather1);

  let cam = cam3At(f, [
    {f: 0, eye: [-1250, 140, 900], target: [200, 0, -300], fov: 50, roll: -5},
    {f: c1, eye: [-700, 180, 820], target: [400, 0, -260], fov: 50, roll: -4},
    {f: c2, eye: [-200, 220, 900], target: [500, 0, -200]},
    {f: gather1, eye: orbit([0, 170, 0], 2250, 20, 16), target: [0, 170, 0], fov: 40, roll: 0, ez: ease.inOutCubic},
    {f: c3, eye: orbit([0, 170, 0], 2250, 0, 14), target: [0, 170, 0]},
    {f: duration, eye: orbit([0, 170, 0], 2250, -40, 18), target: [0, 170, 0]},
  ]);
  if (f >= c3) cam = {...cam, eye: orbit([0, 170, 0], 2250, 0 - (f - c3) * 0.12, 14 + 4 * prog(f, c4, duration))};
  const L = lens(cam);


  return (
    <AbsoluteFill>
      <Space
        cam={cam}
        bloom={bloomAt(f, 0.5, [bias1], 0.9, 10) + 0.4 * bias}
        fog={[300, 5200]}
        nearFade={220}
        ink={(Pn) => {
          if (ionsO > 0.01) {
            const pts: Array<{p: V3; z: number}> = [];
            for (let x = -BX; x <= BX; x += SP) for (let y = -BY; y <= BY; y += SP) for (let z = BZ0; z <= BZ1; z += SP) pts.push({p: [x, y, z], z: Pn.L.project([x, y, z]).z});
            pts.sort((a, b) => b.z - a.z);
            pts.forEach((it) => it.z > 30 && sphere3(Pn, it.p, 26, {a: ionsO}));
          }
          if (g > 0) {
            // 速度空间：坐标轴 + 参考球面
            line3(Pn, [-VLEN * 1.8, 0, 0], [VLEN * 1.8, 0, 0], {w: 1.2, a: g});
            line3(Pn, [0, -VLEN * 1.4, 0], [0, VLEN * 1.4, 0], {w: 0.9, a: 0.5 * g});
            line3(Pn, [0, 0, -VLEN * 1.4], [0, 0, VLEN * 1.4], {w: 0.9, a: 0.5 * g});
            ring3(Pn, [D * VLEN, 0, 0], VLEN, [1, 0, 0], {w: 0.9, a: 0.45 * g, seg: 64});
            ring3(Pn, [D * VLEN, 0, 0], VLEN, [0, 1, 0], {w: 0.9, a: 0.45 * g, seg: 64});
            ring3(Pn, [D * VLEN, 0, 0], VLEN, [0, 0, 1], {w: 0.9, a: 0.3 * g, seg: 64});
            // 镜面 vx = 0
            for (let k = -3; k <= 3; k++) line3(Pn, [0, k * 120, -VLEN * 1.3], [0, k * 120, VLEN * 1.3], {w: 0.7, a: 0.25 * g, dash: [6, 8]});
          }
        }}
        glow={(G, Ls) => {
          E.forEach((e, i) => {
            const pr = pos(e, f);
            const v = vel(e);
            // 实空间位置 → 速度空间的箭头起点（原点）
            const tail = lerp3(pr, [0, 0, 0], g);
            const tip = add(tail, mul(v, lerp(140, VLEN, g)));
            if (g > 0.02 || f >= c2) {
              const right = v[0] > 0.0001;
              const col = right && bias > 0.05 ? 1 : 0.75;
              glow3(G, Ls, [tail, tip], 0.5, col * prog(f, c2, c2 + 14));
            }
            if (g < 0.98) {
              const trail: V3[] = [];
              for (let k = 0; k <= 6; k++) trail.push(pos(e, f - k * 0.5));
              let ok = true;
              for (let k = 1; k < trail.length; k++) if (Math.abs(trail[k][0] - trail[k - 1][0]) > BX) ok = false;
              if (ok) glow3(G, Ls, trail, 0.45, 0.7 * (1 - g));
              spark3(G, Ls, pr, t + i, 0.9, 1 - g, false, 0.25, 2.2);
            } else spark3(G, Ls, tip, t + i, 0.7, 0.9, false, 0.25, 1.4);
          });
          if (bias > 0.01) {
            // 净速度：所有箭头之和（按比例缩放）
            const net: V3 = [D * VLEN * 2.6, 0, 0];
            glow3(G, Ls, [[0, 0, 0], net], 1.6, bias);
            spark3(G, Ls, net, t, 1.6, bias);
          }
        }}
      />

      <ScreenSvg>
        <Callout at={L.project([VLEN * 1.8, 0, 0])} dx={60} dy={70} mono="VELOCITY SPACE" text="v" o={prog(f, gather1, gather1 + 14)} size={30} />
      </ScreenSvg>

      {f >= gather1 - 6 && (
        <AbsoluteFill style={{opacity: prog(f, gather1 - 6, gather1 + 8)}}>
          <div style={{position: 'absolute', left: 116, top: 150, fontFamily: F.mono, fontSize: 15, letterSpacing: 3, color: ink.dim}}>← LEFT-MOVING · 向左</div>
          <Roller value={nL} x={104} y={300} size={200} />
          <div style={{position: 'absolute', right: 116, top: 150, fontFamily: F.mono, fontSize: 15, letterSpacing: 3, color: nR > nL ? P.signal : ink.dim}}>向右 · RIGHT-MOVING →</div>
          <Roller value={nR} x={1816} y={300} size={200} align="right" color={nR > nL ? P.signal : ink.fg} />
          <div style={{position: 'absolute', left: 960, top: 300, transform: 'translate(-50%,-50%)', fontFamily: F.display, fontWeight: 900, fontSize: 140, color: nR > nL ? P.signal : ink.fg, textShadow: nR > nL ? '0 0 40px rgba(255,77,18,0.5)' : undefined}}>
            {nR > nL ? '<' : '='}
          </div>
        </AbsoluteFill>
      )}

      <Slam f={f} t0={c1 + 6} t1={c2} x={110} y={260} size={230} stretch={62} color={P.signal} glow={0.6}>
        1600 km/s
      </Slam>
      <Slam f={f} t0={c1 + 12} t1={c2} x={116} y={400} size={15} font="mono" weight={500} spacing={3} color={ink.dim}>
        ≈ 1/200 OF THE SPEED OF LIGHT — IN EVERY DIRECTION
      </Slam>
      <Slam f={f} t0={gather1 + 10} t1={bias0} x={960} y={890} size={100} align="center" font="serif" italic weight={500}>
        Σ v = 0
      </Slam>
      <Slam f={f} t0={bias1 - 10} t1={c4 + 30} x={960} y={890} size={100} align="center" font="serif" italic weight={500} color={P.signal} glow={1}>
        Σ v ≠ 0 → 电流
      </Slam>
      <Slam f={f} t0={c4 + 40} x={960} y={890} size={80} align="center" weight={900}>
        平衡能被打破吗？
      </Slam>
    </AbsoluteFill>
  );
};

export const SCurrent: React.FC<P_> = (props) => {
  const f = useCurrentFrame();
  const {gather0, gather1} = T(props.cues);
  return (
    <MotionBlur on={f >= gather0 && f < gather1} samples={5}>
      <Content {...props} />
    </MotionBlur>
  );
};

