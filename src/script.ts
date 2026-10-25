// 文案 + 时间轴。字幕即旁白稿：改文字后，时长会自动按字数重新计算。
export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

// 每个字约 0.175 秒（≈5.7 字/秒，适合中文解说语速），每条字幕额外留 0.5 秒停顿
const SEC_PER_CHAR = 0.175;
const PAD_SEC = 0.5;

export type SceneId = 'hook' | 'current' | 'states' | 'fill' | 'bands' | 'gaps' | 'scatter' | 'semi' | 'summary';

type SceneDef = {
  id: SceneId;
  chip?: string; // 左上角图版标题
  en?: string; // 图版英文副标（等宽小字）
  paper?: boolean; // true = 骨白纸面 + 墨线
  lead: number; // 第一条字幕前的帧数
  tail: number; // 最后一条字幕后的帧数
  captions: string[];
};

export const SCENES: SceneDef[] = [
  {
    id: 'hook',
    lead: 20,
    tail: 120, // 标题卡
    captions: [
      '铜线能导电，玻璃却几乎不导电。',
      '两者的电阻率，相差超过 20 个数量级。',
      '可两者内部同样挤满了电子，每立方厘米超过 10²³ 个。',
      '区别，不在于有没有电子。',
    ],
  },
  {
    id: 'current',
    chip: '电流是什么',
    en: 'WHAT A CURRENT IS',
    lead: 20,
    tail: 20,
    captions: [
      '事实上，固体里的电子从不安静。',
      '铜里的电子以每秒上千公里的速度四处乱窜，',
      '但它们朝各个方向都有，彼此抵消。',
      '电流不是“电子在动”，而是朝一个方向动的电子，比反方向的多。',
      '所以真正的问题是：这种平衡，能不能被打破？',
    ],
  },
  {
    id: 'states',
    chip: '量子态与对称',
    en: 'STATES & SYMMETRY',
    lead: 20,
    tail: 25,
    captions: [
      '量子力学的回答是：电子是波，住在一个个「量子态」里。',
      '晶格的周期性，让每个态都有确定的动量 k。',
      '而对称性保证：每个向右的态 +k，都有一个能量相同的镜像态 −k。',
      '泡利不相容原理又规定：每个态最多住两个电子。',
      '电子从低到高填满这些态，最高处叫「费米能级」。',
      '平衡时，+k 与 −k 总是成对出现，净电流为零——任何材料都一样。',
    ],
  },
  {
    id: 'fill',
    chip: '满与不满',
    en: 'FULL vs. PARTLY FILLED',
    lead: 20,
    tail: 30,
    captions: [
      '要产生电流，就得把一些电子从 −k 挪到 +k。',
      '但电子只能挪进「空着的态」。',
      '如果所有态都已住满，电场推动每一个电子，分布却原封不动——',
      '就像坐满的环形剧场，所有人同时挪一格，什么也没变。这就是绝缘体。',
      '如果还有大量空态，电场就能让整片「费米海」向一侧偏移，',
      '向右的电子多于向左的：这就是金属。',
    ],
  },
  {
    id: 'bands',
    chip: '能带',
    en: 'WHERE BANDS COME FROM',
    lead: 20,
    tail: 25,
    captions: [
      '为什么有的材料满、有的不满？答案藏在「能带」里。',
      '原子靠近时，电子波相互重叠，每个能级一分为二；',
      '原子越多，分裂出的能级越多、越密。',
      '10²³ 个原子，让能级连成一片片能带，带与带之间是禁区「带隙」。',
    ],
  },
  {
    id: 'gaps',
    chip: '半满与满带',
    en: 'COPPER vs. DIAMOND',
    lead: 20,
    tail: 30,
    captions: [
      '铜的每个原子贡献 1 个价电子，最上面的能带只填一半；',
      '金刚石的电子恰好填满一条能带，下一条空带远在 5.5 电子伏特之上，',
      '而室温热能只有约 0.025 电子伏特，根本跳不过去。',
    ],
  },
  {
    id: 'scatter',
    chip: '推力与散射',
    en: 'PUSH vs. SCATTERING',
    lead: 20,
    tail: 30,
    captions: [
      '可金属里还有一个问题：电场一直在推，电子为什么不越跑越快？',
      '在完美的周期晶格里，电子波畅通无阻，根本不会被原子“撞”到。',
      '阻力来自打破周期性的东西：原子的热振动，以及杂质与缺陷。',
      '电场把费米海推向前方，散射又不断把前沿的电子打回后方。',
      '推力与散射达成平衡，电流才稳定——这就是欧姆定律背后的图景。',
      '这个偏移小得惊人：导线里电子的漂移速度往往不到每秒 1 毫米，',
      '只有它们自身速度的约百亿分之一。',
      '温度越高，晶格振动越剧烈，散射越频繁，电阻也就越大。',
    ],
  },
  {
    id: 'semi',
    chip: '半导体',
    en: 'THE NARROW GAP',
    lead: 20,
    tail: 30,
    captions: [
      '半导体介于两者之间：硅的带隙只有约 1.1 电子伏特。',
      '热运动能把少量电子激发到上方的空带，',
      '留下的空位「空穴」，也让满带有了挪动的余地。',
      '再通过「掺杂」精确调控这些载流子，就有了二极管与晶体管。',
    ],
  },
  {
    id: 'summary',
    chip: '总结',
    en: 'SYNOPSIS',
    lead: 20,
    tail: 130, // 结尾卡
    captions: [
      '导体、半导体、绝缘体的区别，不在于有没有电子，',
      '而在于：有没有空着的量子态，让电子挪过去。',
      '你手机里数十亿个晶体管，都建立在这一点之上。',
    ],
  },
];

export type Cue = {start: number; end: number; text: string};
export type TimedScene = SceneDef & {from: number; duration: number; cues: Cue[]};

const visibleLength = (t: string) => Array.from(t.replace(/[\s「」“”]/g, '')).length;
export const captionFrames = (t: string) =>
  Math.round((visibleLength(t) * SEC_PER_CHAR + PAD_SEC) * FPS);

// 图版之间硬切（不交叉淡化）
export const OVERLAP = 0;

export const TIMELINE: TimedScene[] = (() => {
  let from = 0;
  return SCENES.map((s) => {
    let t = s.lead;
    const cues = s.captions.map((text) => {
      const d = captionFrames(text);
      const cue = {start: t, end: t + d, text};
      t += d;
      return cue;
    });
    const duration = t + s.tail;
    const scene = {...s, from, duration, cues};
    from += duration - OVERLAP;
    return scene;
  });
})();

export const TOTAL_FRAMES = (() => {
  const last = TIMELINE[TIMELINE.length - 1];
  return last.from + last.duration;
})();

export const sceneById = (id: SceneId) => TIMELINE.find((s) => s.id === id)!;
