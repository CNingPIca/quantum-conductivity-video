import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Cue} from '../script';
import {F, P, useInk} from '../theme';
import {MotionBlur} from '../engine/camera';
import {flash, particles, spark} from '../engine/fx';
import {ScreenSvg, Slam, StepRoller} from '../engine/type';
import {clamp, ease, hash, mod, noise1, prog, pulse} from '../engine/util';
import {cam3At, Cam3Key, ember3, lens, line3, mesh3, particles3, Space, spark3, V3, bloomAt} from '../engine/space';

type P_ = {cues: Cue[]; duration: number};

const RR = 42; // 棒半径
const CU0 = -5200;
const GL1 = 5200;
const IMPACT = 86;
const leadX = (f: number) => Math.min(-16, -2300 + 26.5 * f);
// 对数刻度（铺在棒前方的“地面”上）
const RY = -170;
const RZ = 260;
const ex = (e: number) => -1900 + (e + 10) * 130;

const timing = (cues: Cue[]) => {
  const c1 = cues[1].start;
  const c2 = cues[2].start;
  const c3 = cues[3].start;
  return {c1, c2, c3, race0: c1 + 30, race1: c1 + 96, dive0: c3 + 36, title: c3 + 70};
};

const camKeys = (cues: Cue[]): Cam3Key[] => {
  const {c1, c2, race0, race1, dive0, title} = timing(cues);
  return [
    {f: 0, eye: [-3300, 150, 330], target: [-1900, 10, 0], fov: 38, roll: -4},
    {f: IMPACT, eye: [-620, 190, 420], target: [80, 0, -20], fov: 40, roll: -2, ez: ease.inOutCubic},
    {f: c1 + 2, eye: [-600, 200, 430], target: [80, 0, -20]},
    {f: c1 + 26, eye: [ex(-12) - 500, 520, RZ + 1100], target: [ex(4), RY, RZ - 300], fov: 42, roll: -6, ez: ease.inOutExpo},
    {f: race0, eye: [ex(-12) - 460, 510, RZ + 1080], target: [ex(4), RY, RZ - 300]},
    {f: race1, eye: [ex(-6), 430, RZ + 900], target: [ex(14), RY, RZ - 200], roll: -3, ez: ease.inOutCubic},
    {f: c2, eye: [ex(-5), 420, RZ + 880], target: [ex(15), RY, RZ - 200]},
    {f: c2 + 20, eye: [-300, 230, 1050], target: [80, 0, 0], fov: 40, roll: -3, ez: ease.inOutExpo},
    {f: dive0, eye: [-220, 200, 900], target: [40, 0, 0]},
    {f: title, eye: [-40, 8, 70], target: [0, 0, 0], fov: 50, roll: 10, ez: ease.inExpo},
  ];
};

const Content: React.FC<P_> = ({cues}) => {
  const f = useCurrentFrame();
  const ink = useInk();
  const T = timing(cues);
  const t = f / 30;
  if (f >= T.title) return <Title f={f - T.title} />;

  let cam = cam3At(f, camKeys(cues));
  const sh = 22 * pulse(f, IMPACT, 4) + 8 * pulse(f, T.race1, 4);
  if (sh > 0.1) cam = {...cam, eye: [cam.eye[0], cam.eye[1] + noise1(f * 0.9, 3) * sh, cam.eye[2] + noise1(f * 0.9, 7) * sh], roll: cam.roll + noise1(f, 2) * sh * 0.05};
  const L = lens(cam);
  const raceP = prog(f, T.race0, T.race1, ease.inOutCubic);
  const raceX = ex(-8) + (ex(16) - ex(-8)) * raceP;
  const showScale = f >= T.c1 + 6;
  const scaleA = prog(f, T.c1 + 6, T.c1 + 26, ease.outExpo);
  const ember: [number, number, number] = [255, 138, 61];

  return (
    <AbsoluteFill>
      <Space
        cam={cam}
        bloom={bloomAt(f, 0.4, [IMPACT, T.race1, T.c2 + 20], 0.9, 6) + 1.4 * prog(f, T.dive0, T.title)}
        fog={[400, 7000]}
        ink={(Pn) => {
          // 棒：母线 + 截面圆环（版画）
          const gens = 10;
          for (let i = 0; i < gens; i++) {
            const a = (i / gens) * Math.PI * 2;
            const y = Math.cos(a) * RR;
            const z = Math.sin(a) * RR;
            const lit = 0.35 + 0.65 * clamp((Math.cos(a) + 1) / 2);
            line3(Pn, [CU0, y, z], [0, y, z], {w: 1, a: lit, color: ember});
            line3(Pn, [0, y, z], [GL1, y, z], {w: 0.9, a: lit * (i % 2 === 0 ? 0.9 : 0.35)});
          }
          for (let x = CU0; x <= 0; x += 60) {
            const pts: V3[] = [];
            for (let k = 0; k <= 24; k++) {
              const a = (k / 24) * Math.PI * 2;
              pts.push([x, Math.cos(a) * RR, Math.sin(a) * RR]);
            }
            for (let k = 1; k < pts.length; k++) line3(Pn, pts[k - 1], pts[k], {w: 0.8, a: 0.55, color: ember});
          }
          for (let x = 0; x <= GL1; x += 480) {
            const pts: V3[] = [];
            for (let k = 0; k <= 24; k++) {
              const a = (k / 24) * Math.PI * 2;
              pts.push([x, Math.cos(a) * RR, Math.sin(a) * RR]);
            }
            for (let k = 1; k < pts.length; k++) line3(Pn, pts[k - 1], pts[k], {w: 0.8, a: 0.45});
          }
          // 交界面
          for (let k = 0; k < 4; k++) line3(Pn, [0, -RR * 2.6 + k * 2, -RR * 2.6], [0, -RR * 2.6, RR * 2.6], {w: 1, a: 0.2});
          line3(Pn, [0, -RR * 3, 0], [0, RR * 3, 0], {w: 1.4, a: 0.9});
          // 对数刻度（地面上）
          if (showScale) {
            line3(Pn, [ex(-10), RY, RZ], [ex(-10) + (ex(20) - ex(-10)) * scaleA, RY, RZ], {w: 1.4});
            for (let i = 0; i <= 30; i++) {
              const e = i - 10;
              if (ex(e) > ex(-10) + (ex(20) - ex(-10)) * scaleA) break;
              const major = e % 5 === 0;
              line3(Pn, [ex(e), RY, RZ], [ex(e), RY, RZ + (major ? 110 : 50)], {w: major ? 1.4 : 1, a: major ? 1 : 0.6});
            }
            line3(Pn, [ex(-8), RY, RZ], [ex(-8), RY + 520, RZ], {w: 1.4, color: [255, 77, 18]});
            line3(Pn, [ex(16), RY, RZ], [ex(16), RY + 520, RZ], {w: 1.4, dash: [10, 8]});
            line3(Pn, [ex(-8), RY + 40, RZ], [raceX, RY + 40, RZ], {w: 2, color: [255, 77, 18]});
            // 透视地面网格
            mesh3(Pn, (u, v) => [ex(-12) + u * (ex(22) - ex(-12)), RY - 2, -1400 + v * 2600], {nu: 34, nv: 12, res: 2, w: 0.7, a: 0.28 * scaleA});
          }
        }}
        glow={(G, Ls) => {
          // 铜里的电子流
          for (let i = 0; i < 90; i++) {
            const ry = (hash(i, 2) - 0.5) * RR * 1.1;
            const rz = (hash(i, 3) - 0.5) * RR * 1.1;
            const raw = CU0 + mod(i * 61.3 + f * 16 * (0.8 + 0.4 * hash(i, 5)), -CU0 + 300);
            const x = Math.min(raw, -8 - hash(i, 9) * 14);
            const dead = clamp((raw + 0) / 300);
            ember3(G, Ls, [x, ry, rz], 0.9, (1 - dead) * 0.85);
          }
          particles3(G, Ls, t, () => [-6, 0, 0], {rate: 40, speed: 200, life: 0.4, I: 0.8, seed: 3});
          if (f < T.race0) {
            const lx = leadX(f);
            for (let k = 1; k < 12; k++) {
              const a = Ls.project([leadX(f - k), 0, 0]);
              const b = Ls.project([leadX(f - k + 1), 0, 0]);
              G.strokeStyle = `rgba(255,${90 + k * 8},40,${(1 - k / 12) * 0.8})`;
              G.lineWidth = 3 * (1 - k / 12);
              G.beginPath();
              G.moveTo(a.x, a.y);
              G.lineTo(b.x, b.y);
              G.stroke();
            }
            spark3(G, Ls, [lx, 0, 0], t, 1.2, 1, false, 0.6, 3);
            if (f >= IMPACT) particles3(G, Ls, t, (tb) => (tb * 30 >= IMPACT && tb * 30 < IMPACT + 6 ? [-16, 0, 0] : null), {rate: 280, speed: 480, life: 0.7, seed: 9, s: 1.3});
          }
          // 玻璃里同样挤满了电子（只是不动）
          if (f >= T.c2 + 4) {
            const I = 0.65 * prog(f, T.c2 + 4, T.c2 + 30);
            for (let i = 0; i < 90; i++) {
              const x = 10 + hash(i, 11) * (GL1 - 10);
              const ry = (hash(i, 12) - 0.5) * RR * 1.1 + Math.sin(f * 0.3 + i) * 2;
              const rz = (hash(i, 13) - 0.5) * RR * 1.1;
              ember3(G, Ls, [x, ry, rz], 0.9, I);
            }
          }
          if (f >= T.dive0) {
            const div = prog(f, T.dive0, T.title, ease.inExpo);
            spark3(G, Ls, [-6, 0, 0], t, 1.2 + 6 * div, 1 + div, false, 0.5, 40);
          }
          if (f >= T.race0 - 6 && f < T.c2 + 22) {
            spark3(G, Ls, [raceX, RY + 40, RZ], t, 1.6, 1, false, 0.5, 40);
            particles3(G, Ls, t, (tb) => {
              const ff = tb * 30;
              if (ff < T.race0 || ff > T.race1 + 4) return null;
              return [ex(-8) + (ex(16) - ex(-8)) * prog(ff, T.race0, T.race1, ease.inOutCubic), RY + 40, RZ];
            }, {rate: 140, speed: 300, life: 0.5, seed: 4, s: 1.2});
          }
          flash(G, 0.18 * pulse(f, IMPACT, 2) + 0.95 * prog(f, T.title - 7, T.title, ease.inQuad));
        }}
      />

      {showScale && (
        <ScreenSvg>
          {[-10, -5, 0, 5, 10, 15, 20].map((e) => {
            const q = L.project([ex(e), RY, RZ + 170]);
            if (q.z < 40) return null;
            return (
              <text key={e} x={q.x} y={q.y + 8} textAnchor="middle" fontFamily={F.mono} fontSize={Math.max(12, Math.min(26, q.s * 22))} fill={ink.dim} opacity={scaleA}>
                10
                <tspan dy={-8} fontSize={Math.max(9, Math.min(18, q.s * 15))}>
                  {e < 0 ? `−${-e}` : e}
                </tspan>
              </text>
            );
          })}
        </ScreenSvg>
      )}

      <Slam f={f} t0={IMPACT} t1={T.c1} x={110} y={250} size={210} color={P.signal} glow={1}>
        铜
      </Slam>
      <Slam f={f} t0={IMPACT} t1={T.c1} x={114} y={392} size={16} font="mono" weight={500} spacing={3} color={P.signal}>
        Cu · CONDUCTS · ρ ≈ 1.7 × 10⁻⁸ Ω·m
      </Slam>
      <Slam f={f} t0={IMPACT + 4} t1={T.c1} x={1810} y={760} size={210} align="right">
        玻璃
      </Slam>
      <Slam f={f} t0={IMPACT + 4} t1={T.c1} x={1810} y={900} size={16} font="mono" weight={500} spacing={3} align="right" color={ink.dim}>
        SiO₂ · DOES NOT · ρ &gt; 10¹⁶ Ω·m
      </Slam>

      {f >= T.race0 - 8 && f < T.c2 + 14 && (
        <AbsoluteFill style={{opacity: 1 - prog(f, T.c2, T.c2 + 12)}}>
          <div style={{position: 'absolute', left: 120, top: 120, fontFamily: F.mono, fontSize: 15, letterSpacing: 3, color: ink.dim}}>RESISTIVITY ρ, Ω·m</div>
          <div style={{position: 'absolute', left: 112, top: 150, fontFamily: F.display, fontWeight: 900, fontStretch: '70%', fontSize: 230, lineHeight: '230px', color: ink.fg}}>10</div>
          <StepRoller value={-8 + 24 * raceP} x={350} y={196} size={120} color={raceP > 0.99 ? P.signal : ink.fg} />
        </AbsoluteFill>
      )}
      <Slam f={f} t0={T.race1 + 2} t1={T.c2 + 4} x={1810} y={250} size={120} align="right" color={P.signal} glow={1}>
        &gt; 20 个数量级
      </Slam>
      <Slam f={f} t0={T.c2 + 22} t1={T.dive0} x={110} y={250} size={130} weight={900}>
        电子一样多
      </Slam>
      <Slam f={f} t0={T.c2 + 26} t1={T.dive0} x={116} y={350} size={15} font="mono" weight={500} spacing={3} color={P.signal}>
        BOTH CARRY &gt; 10²³ ELECTRONS PER cm³
      </Slam>
      <Slam f={f} t0={T.c3 + 4} t1={T.dive0 + 10} x={1700} y={600} size={420} align="center" font="serif" italic weight={500} color={P.signal} glow={1}>
        ?
      </Slam>
    </AbsoluteFill>
  );
};

/** 标题页：透视地面网格 + 字块砸入 + 火花画线 */
const Title: React.FC<{f: number}> = ({f}) => {
  const ink = useInk();
  const ruleT = prog(f, 14, 58, ease.outExpo);
  const ruleX = 120 + 1680 * ruleT;
  const cam = {eye: [0, 260, 1400 - f * 2] as V3, target: [0, 120, -2000] as V3, fov: 50, roll: 0};
  return (
    <AbsoluteFill>
      <Space
        cam={cam}
        fog={[300, 5200]}
        ink={(Pn) => {
          mesh3(Pn, (u, v) => [-4000 + u * 8000, 0, -6000 + v * 7000 + ((f * 4) % (7000 / 28))], {nu: 40, nv: 28, res: 2, w: 0.8, a: 0.4 * prog(f, 0, 30)});
        }}
      />
      <Slam f={f} t0={0} x={120} y={250} size={16} font="mono" weight={500} spacing={4} color={P.signal}>
        PLATE 0 — A TREATISE IN EIGHT PLATES
      </Slam>
      <Slam f={f} t0={0} x={112} y={390} size={150} spacing={6}>
        量子力学
      </Slam>
      <Slam f={f} t0={7} x={112} y={560} size={150} spacing={6}>
        如何解释导电性
      </Slam>
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
        <line x1={120} x2={ruleX} y1={700} y2={700} stroke={ink.fg} strokeWidth={1.4} />
      </svg>
      <Space
        cam={cam}
        bloom={bloomAt(f, 0.5, [0], 1.5, 5)}
        glow={(G) => {
          if (ruleT < 0.995 && f > 12) spark(G, ruleX, 700, f / 30, 1.1);
          particles(G, f / 30, (tb) => (tb * 30 > 14 && tb * 30 < 56 ? {x: 120 + 1680 * prog(tb * 30, 14, 58, ease.outExpo), y: 700} : null), {rate: 90, speed: 220, life: 0.4, seed: 11});
          flash(G, 0.5 * pulse(f, 0, 2));
        }}
      />
      <Slam f={f} t0={30} x={120} y={760} size={46} font="cjkSerif" weight={600} spacing={8} from={1.05}>
        从电子波到能带理论
      </Slam>
      <div
        style={{
          position: 'absolute',
          right: 120,
          top: 735,
          textAlign: 'right',
          fontFamily: F.mono,
          fontSize: 14,
          letterSpacing: 3,
          lineHeight: 1.9,
          color: ink.dim,
          opacity: prog(f, 40, 56),
        }}
      >
        <div>ON THE CONDUCTION OF ELECTRONS</div>
        <div>IN METALS, INSULATORS &amp; SEMICONDUCTORS</div>
        <div style={{color: P.signal}}>MMXXVI</div>
      </div>
    </AbsoluteFill>
  );
};

export const S1Hook: React.FC<P_> = (props) => {
  const f = useCurrentFrame();
  const T = timing(props.cues);
  const on = (f >= T.c1 && f < T.c1 + 26) || (f >= T.c2 && f < T.c2 + 20) || (f >= T.dive0 + 20 && f < T.title);
  return (
    <MotionBlur on={on} samples={6}>
      <Content {...props} />
    </MotionBlur>
  );
};
