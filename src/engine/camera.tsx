import React from 'react';
import {CameraMotionBlur} from '@remotion/motion-blur';
import {ease, Ease, lerp, noise1} from './util';

/** 虚拟摄像机：画面中心对准世界坐标 (x, y)，缩放 z，滚转 r（度） */
export type Cam = {x: number; y: number; z: number; r: number};
export type CamKey = {f: number; x?: number; y?: number; z?: number; r?: number; ez?: Ease};

const W2 = 960;
const H2 = 540;

/** 关键帧相机（缩放在对数空间插值，推拉更自然） */
export function camAt(f: number, ks: CamKey[]): Cam {
  let cur: Cam & {f: number} = {x: W2, y: H2, z: 1, r: 0, f: ks[0]?.f ?? 0};
  const full = ks.map((k) => (cur = {...cur, ...k, f: k.f}));
  const first = full[0];
  if (f <= first.f) return {x: first.x, y: first.y, z: first.z, r: first.r};
  for (let i = 1; i < full.length; i++) {
    const k = full[i];
    if (f <= k.f) {
      const p = full[i - 1];
      const e = (ks[i].ez ?? ease.inOutCubic)((f - p.f) / (k.f - p.f));
      return {
        x: lerp(p.x, k.x, e),
        y: lerp(p.y, k.y, e),
        z: Math.exp(lerp(Math.log(p.z), Math.log(k.z), e)),
        r: lerp(p.r, k.r, e),
      };
    }
  }
  const l = full[full.length - 1];
  return {x: l.x, y: l.y, z: l.z, r: l.r};
}

/** 屏幕上的运动速度（像素/帧），用于决定是否开启运动模糊 */
export function camSpeed(f: number, ks: CamKey[]) {
  const a = camAt(f, ks);
  const b = camAt(f - 1, ks);
  return (
    Math.hypot(a.x - b.x, a.y - b.y) * a.z + Math.abs(Math.log(a.z / b.z)) * 900 + Math.abs(a.r - b.r) * 18
  );
}

/** 震屏：在相机上叠加衰减噪声（amp 为屏幕像素） */
export function shake(c: Cam, f: number, amp: number, seed = 0): Cam {
  if (amp <= 0.01) return c;
  return {
    ...c,
    x: c.x + (noise1(f * 0.9, seed) * amp) / c.z,
    y: c.y + (noise1(f * 0.9, seed + 7) * amp) / c.z,
    r: c.r + noise1(f * 0.7, seed + 13) * amp * 0.02,
  };
}

export const camTransform = (c: Cam) => `translate(${W2} ${H2}) rotate(${c.r}) scale(${c.z}) translate(${-c.x} ${-c.y})`;

export const applyCam = (ctx: CanvasRenderingContext2D, c: Cam) => {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.translate(W2, H2);
  ctx.rotate((c.r * Math.PI) / 180);
  ctx.scale(c.z, c.z);
  ctx.translate(-c.x, -c.y);
};

/** 世界坐标 → 屏幕坐标 */
export const toScreen = (c: Cam, x: number, y: number) => {
  const a = (c.r * Math.PI) / 180;
  const dx = (x - c.x) * c.z;
  const dy = (y - c.y) * c.z;
  return {x: W2 + dx * Math.cos(a) - dy * Math.sin(a), y: H2 + dx * Math.sin(a) + dy * Math.cos(a)};
};

/** 世界层（SVG）：所有描边保持发丝线粗细，不随缩放变粗 */
export const World: React.FC<{cam: Cam; children: React.ReactNode}> = ({cam, children}) => (
  <g transform={camTransform(cam)} className="world">
    {children}
  </g>
);

/** 甩镜头时开启子帧运动模糊（参考：sub-frame accumulation） */
export const MotionBlur: React.FC<{on: boolean; samples?: number; children: React.ReactNode}> = ({on, samples = 7, children}) =>
  on ? (
    <CameraMotionBlur shutterAngle={200} samples={samples}>
      {children}
    </CameraMotionBlur>
  ) : (
    <>{children}</>
  );
