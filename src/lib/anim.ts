import {Easing, interpolate, spring} from 'remotion';

export const CLAMP = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

const outExpo = Easing.bezier(0.16, 1, 0.3, 1);
const inOutExpo = Easing.bezier(0.87, 0, 0.13, 1);

/** 0→1, inOutCubic —— 位移、镜头 */
export const ease = (f: number, start: number, dur = 20) =>
  interpolate(f, [start, start + dur], [0, 1], {...CLAMP, easing: Easing.inOut(Easing.cubic)});

/** 0→1, outExpo —— 入场、定格（快进快停） */
export const easeOut = (f: number, start: number, dur = 20) =>
  interpolate(f, [start, start + dur], [0, 1], {...CLAMP, easing: outExpo});

/** 0→1, inOutExpo —— 甩动 */
export const whip = (f: number, start: number, dur = 20) =>
  interpolate(f, [start, start + dur], [0, 1], {...CLAMP, easing: inOutExpo});

/** linear 0→1 */
export const lin = (f: number, start: number, dur = 20) => interpolate(f, [start, start + dur], [0, 1], CLAMP);

/** 1→0 ending at `end` */
export const fadeOutAt = (f: number, end: number, dur = 15) => interpolate(f, [end - dur, end], [1, 0], CLAMP);

/** 干脆的弹入（几乎无回弹） */
export const pop = (f: number, start: number, fps = 30) =>
  spring({frame: f - start, fps, config: {damping: 22, stiffness: 260, mass: 0.7}});

/** 短促脉冲：t0 处为 1，宽度 w 帧 */
export const pulse = (f: number, t0: number, w = 8) => Math.max(0, 1 - Math.abs(f - t0) / w);

export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
