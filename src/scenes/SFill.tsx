import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Cue} from '../script';
import {F, P, useInk} from '../theme';
import {Stamp} from '../components/svg';
import {MotionBlur} from '../engine/camera';
import {Callout, Roller, ScreenSvg, Slam} from '../engine/type';
import {clamp, ease, lerp, mod, prog} from '../engine/util';
import {add, bloomAt, cam3At, Cam3, glow3, lens, line3, orbit, particles3, Pen, poly3, ring3, Space, spark3, V3} from '../engine/space';

type P_ = {cues: Cue[]; duration: number};

/* 布里渊区是周期的：k = +π 与 −π 是同一个态。于是 E(k) 曲线首尾相接，弯成一个环。 */
const N = 24;
const KX = 1000;
const EH = 760;
const RR = 900; // 环半径
const SIG: [number, number, number] = [255, 77, 18];
const B: V3 = [7000, 0, 0]; // 绝缘体的环
const kOf = (s: number) => -Math.PI + ((s + 0.5) * 2 * Math.PI) / N; // s 可为小数
const Ek = (k: number) => (EH * (1 - Math.cos(k))) / 2;
const linePos = (k: number): V3 => [(k / Math.PI) * KX, Ek(k), 0];
const ringPos = (k: number, r = RR): V3 => [r * Math.sin(k), Ek(k), r * Math.cos(k)];
const at = (k: number, morph: number, origin: V3 = [0, 0, 0], dr = 0): V3 => {
  const a = linePos(k);
  const b = ringPos(k, RR + dr);
  return add(origin, [lerp(a[0], b[0], morph), lerp(a[1], b[1], morph), lerp(a[2] + dr, b[2], morph)]);
};

const T = (cues: Cue[]) => {
  const [c0, c1, c2, c3, c4, c5] = cues.map((c) => c.start);
  return {c0, c1, c2, c3, c4, c5, morph0: c0 + 4, morph1: c0 + 56, hop0: c0 + 66, hop1: c0 + 96, try0: c1 + 16, tryHit: c1 + 36, field0: c2 + 46, shift0: c4 + 26, shift1: c4 + 86};
};

const Content: React.FC<P_> = ({cues, duration}) => {
  const f = useCurrentFrame();
  const ink = useInk();
  const t = f / 30;
  const C = T(cues);
  const {c1, c2, c3, c4, c5, morph0, morph1, hop0, hop1, try0, tryHit, field0, shift0, shift1} = C;

  const morph = prog(f, morph0, morph1, ease.inOutCubic);
  const onB = f >= c2 + 8 && f < c4 + 8; // 镜头在绝缘体的环上

  // ---- 环 A（金属，半满）----
  const hopK = prog(f, hop0, hop1, ease.inOutCubic) * (1 - prog(f, c4, c4 + 20, ease.inOutCubic));
  const shift = 2 * prog(f, shift0, shift1, ease.inOutCubic);
  const occA: Array<{s: number; seat: number}> = [];
  for (let s = 6; s <= 17; s++) for (const seat of [-1, 1]) occA.push({s, seat});
  const posA = (o: {s: number; seat: number}, i: number): V3 => {
    let s = o.s + shift;
    // 第一次挪动：−k 一侧的一个电子挪到 +k 一侧的空态
    if (o.s === 7 && o.seat === 1) s = lerp(7, 18, hopK) + shift;
    let p = at(kOf(s), morph, [0, 0, 0], o.seat * 24);
    if (o.s === 7 && o.seat === 1 && hopK > 0 && hopK < 1) p = add(p, [0, Math.sin(Math.PI * hopK) * 260, 0]);
    // 第二次：试图挪进已占据的态 → 被弹回
    if (o.s === 8 && o.seat === -1 && f >= try0 && f < tryHit + 26) {
      const go = prog(f, try0, tryHit, ease.inOutCubic);
      const back = prog(f, tryHit, tryHit + 26, ease.outCubic);
      const k = go * (1 - back);
      const s2 = lerp(8, 15, k);
      p = add(at(kOf(s2), morph, [0, 0, 0], -24), [0, Math.sin(Math.PI * k) * 220, 0]);
    }
    return i >= 0 ? p : p;
  };
  const kA = (o: {s: number; seat: number}) => kOf((o.s === 7 && o.seat === 1 ? lerp(7, 18, hopK) : o.s) + shift);
  const nRA = occA.filter((o) => Math.sin(kA(o)) > 0.001).length;
  const nLA = occA.filter((o) => Math.sin(kA(o)) < -0.001).length;

  // ---- 环 B（绝缘体，全满）----
  const steps = Math.max(0, f - field0) / 34;
  const stepK = Math.floor(steps) + ease.inOutCubic(clamp((steps % 1) / 0.45));
  const fillB = (s: number) => prog(f, c2 + 4 + s * 1.2, c2 + 16 + s * 1.2);

  const cam: Cam3 = cam3At(f, [
    {f: 0, eye: [0, 520, 2500], target: [0, 330, 0], fov: 42, roll: -2},
    {f: morph1, eye: orbit([0, 330, 0], 2900, 12, 13), target: [0, 330, 0], fov: 42, roll: -2, ez: ease.inOutCubic},
    {f: c1, eye: orbit([0, 330, 0], 2850, 0, 12), target: [0, 330, 0]},
    {f: c2, eye: orbit([0, 330, 0], 2850, -8, 12), target: [0, 330, 0]},
    {f: c2 + 16, eye: add(B, orbit([0, 330, 0], 2900, 30, 14)), target: add(B, [0, 330, 0]), roll: 0, ez: ease.inOutExpo},
    {f: c3, eye: add(B, orbit([0, 330, 0], 2900, -10, 16)), target: add(B, [0, 330, 0])},
    {f: c3 + 40, eye: add(B, [0, 3300, 300]), target: add(B, [0, 200, 0]), fov: 44, ez: ease.inOutCubic},
    {f: c4, eye: add(B, [0, 3350, 300]), target: add(B, [0, 200, 0])},
    {f: c4 + 16, eye: orbit([0, 330, 0], 2850, 20, 13), target: [0, 330, 0], fov: 42, roll: -2, ez: ease.inOutExpo},
    {f: c5, eye: orbit([0, 330, 0], 2800, -6, 12), target: [0, 330, 0]},
    {f: duration, eye: orbit([0, 330, 0], 2800, -24, 14), target: [0, 330, 0]},
  ]);
  const L = lens(cam);
  const fieldO = onB ? prog(f, field0 - 10, field0) : prog(f, shift0 - 12, shift0) * (f >= c4 ? 1 : 0);

  const drawRing = (Pn: Pen, origin: V3, mm: number) => {
    const pts: V3[] = [];
    for (let i = 0; i <= 160; i++) pts.push(at(-Math.PI + (2 * Math.PI * i) / 160, mm, origin));
    poly3(Pn, pts, {w: 1.1, a: 0.7});
    for (let s = 0; s < N; s++) {
      const k = kOf(s);
      for (const seat of [-1, 1]) {
        const p = at(k, mm, origin, seat * 24);
        ring3(Pn, p, 13, mm > 0.5 ? [Math.sin(k), 0, Math.cos(k)] : [0, 0, 1], {w: 0.8, a: 0.5, seg: 14});
      }
      line3(Pn, at(k, mm, origin, -60), add(at(k, mm, origin, -60), [0, -40, 0]), {w: 0.8, a: 0.4});
    }
    // 右行（sin k > 0）一侧的弧：信号橙细线
    const rp: V3[] = [];
    for (let i = 0; i <= 60; i++) rp.push(at(0.02 + ((Math.PI - 0.04) * i) / 60, mm, origin, 70));
    poly3(Pn, rp, {w: 1, a: 0.55, color: SIG});
  };

  return (
    <AbsoluteFill>
      <Space
        cam={cam}
        bloom={bloomAt(f, 0.5, [hop1, tryHit, c3 + 50, shift1, c5 + 12], 0.9, 8)}
        fog={[400, 7000]}
        ink={(Pn) => {
          if (f < c2 + 16 || f >= c4 - 16) {
            drawRing(Pn, [0, 0, 0], morph);
            if (morph < 0.4) {
              // ±π 是同一个态
              const o = prog(f, morph0 - 4, morph0 + 6) * (1 - prog(f, morph0 + 14, morph0 + 30));
              line3(Pn, linePos(-Math.PI), linePos(Math.PI), {w: 1.2, a: o, color: SIG, dash: [8, 8]});
            }
          }
          if (f >= c2 - 16 && f < c4 + 16) drawRing(Pn, B, 1);
        }}
        glow={(G, Ls) => {
          // 环 A 的电子
          if (f < c2 + 16 || f >= c4 - 16) {
            occA.forEach((o, i) => spark3(G, Ls, posA(o, i), t + i, 0.9, 0.95, false, 0.3, 2));
            particles3(G, Ls, t, (tb) => (tb * 30 >= hop1 && tb * 30 < hop1 + 3 ? at(kOf(18), morph, [0, 0, 0], 24) : null), {rate: 220, speed: 260, life: 0.45, seed: 4});
            particles3(G, Ls, t, (tb) => (tb * 30 >= tryHit && tb * 30 < tryHit + 4 ? at(kOf(15), morph, [0, 0, 0], -24) : null), {rate: 300, speed: 360, life: 0.5, seed: 6});
          }
          // 环 B：所有座位都满了
          if (f >= c2 - 16 && f < c4 + 16) {
            for (let s = 0; s < N; s++)
              for (const seat of [-1, 1]) {
                const k = kOf(mod(s + stepK, N));
                const fb = fillB(s);
                spark3(G, Ls, at(k, 1, B, seat * 24), t + s, 0.9, 0.95 * fb, false, 0.3, 2);
              }
          }
          // 电场：沿 +k 方向的弧形箭头
          if (fieldO > 0) {
            const O = onB ? B : ([0, 0, 0] as V3);
            const pts: V3[] = [];
            for (let i = 0; i <= 40; i++) pts.push(at(-0.9 + (1.8 * i) / 40, 1, O, -170));
            glow3(G, Ls, pts, 1, fieldO);
            const tip = pts[pts.length - 1];
            spark3(G, Ls, tip, t, 1.2, fieldO);
          }
        }}
      />

      <ScreenSvg>
        <Callout at={L.project(at(Math.PI - 0.02, morph))} dx={60} dy={-130} mono="k = +π ≡ −π" text="同一个态" color={P.signal} o={prog(f, morph0, morph0 + 8) * (1 - prog(f, morph0 + 24, morph0 + 32))} />
        <Callout at={L.project(at(kOf(18), morph, [0, 0, 0], 24))} dx={130} dy={-150} mono="EMPTY STATE" text="空态 ✓" o={prog(f, hop0 - 10, hop0) * (1 - prog(f, c1 - 4, c1 + 6))} />
        <Callout at={L.project(at(kOf(15), morph, [0, 0, 0], -24))} dx={140} dy={-160} mono="OCCUPIED" text="已满 ✗" color={P.signal} o={prog(f, tryHit - 4, tryHit + 4) * (1 - prog(f, c2 - 10, c2))} />
        <Callout at={L.project(add(onB ? B : [0, 0, 0], at(1.6, 1, [0, 0, 0], 70)))} dx={120} dy={-120} mono="+k · RIGHT-MOVERS" text="向右" o={prog(f, morph1, morph1 + 12) * (1 - prog(f, hop0 - 10, hop0))} />
      </ScreenSvg>

      {/* 计数 */}
      {(() => {
        const nL = onB ? 24 : nLA;
        const nR = onB ? 24 : nRA;
        const show = f >= morph1 + 4;
        if (!show) return null;
        const hot = nR > nL;
        return (
          <AbsoluteFill style={{opacity: prog(f, morph1 + 4, morph1 + 14)}}>
            <div style={{position: 'absolute', left: 116, top: 150, fontFamily: F.mono, fontSize: 15, letterSpacing: 3, color: ink.dim}}>← LEFT-MOVING · 向左</div>
            <Roller value={nL} x={104} y={300} size={200} />
            <div style={{position: 'absolute', right: 116, top: 150, fontFamily: F.mono, fontSize: 15, letterSpacing: 3, color: hot ? P.signal : ink.dim}}>向右 · RIGHT-MOVING →</div>
            <Roller value={nR} x={1816} y={300} size={200} align="right" color={hot ? P.signal : ink.fg} />
            <div style={{position: 'absolute', left: 960, top: 300, transform: 'translate(-50%,-50%)', fontFamily: F.display, fontWeight: 900, fontSize: 180, color: hot ? P.signal : ink.fg, textShadow: hot ? '0 0 40px rgba(255,77,18,0.5)' : undefined}}>
              {hot ? '<' : '='}
            </div>
          </AbsoluteFill>
        );
      })()}

      <Slam f={f} t0={c1 + 4} t1={c2} x={960} y={860} size={84} align="center" weight={900}>
        只能挪进「空」的态
      </Slam>
      <Slam f={f} t0={field0} t1={c3} x={960} y={860} size={36} align="center" weight={900} color={P.signal}>
        电场推动每一个电子 →
      </Slam>
      <Slam f={f} t0={field0 + 6} t1={c3} x={960} y={910} size={15} align="center" font="mono" weight={500} spacing={3} color={ink.dim}>
        A FULL BAND, SHIFTED, IS STILL THE SAME FULL BAND
      </Slam>
      {f >= c3 + 50 && f < c4 && (
        <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
          <Stamp x={960} y={820} text="绝缘体" sub="NOTHING CAN CHANGE" width={360} color={ink.fg} t={prog(f, c3 + 50, c3 + 60)} rotate={-3} />
        </svg>
      )}
      <Slam f={f} t0={shift0 - 6} t1={c5} x={960} y={860} size={36} align="center" weight={900} color={P.signal}>
        费米海整体偏移 →
      </Slam>
      {f >= c5 + 12 && (
        <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
          <Stamp x={960} y={820} text="金 属" sub="NET CURRENT ≠ 0" width={330} t={prog(f, c5 + 12, c5 + 22)} />
        </svg>
      )}
    </AbsoluteFill>
  );
};

export const SFill: React.FC<P_> = (props) => {
  const f = useCurrentFrame();
  const {c2, c4} = T(props.cues);
  const on = (f >= c2 - 2 && f < c2 + 14) || (f >= c4 - 2 && f < c4 + 14);
  return (
    <MotionBlur on={on} samples={5}>
      <Content {...props} />
    </MotionBlur>
  );
};
