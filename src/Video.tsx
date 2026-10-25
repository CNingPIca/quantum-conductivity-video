import React from 'react';
import {AbsoluteFill, Sequence} from 'remotion';
import './theme';
import {SceneId, TIMELINE} from './script';
import {GrainOverlay, SceneShell} from './components/chrome';
import {P, ROMAN} from './theme';
import {S1Hook} from './scenes/S1Hook';
import {SCurrent} from './scenes/SCurrent';
import {SStates} from './scenes/SStates';
import {SFill} from './scenes/SFill';
import {S4Bands} from './scenes/S4Bands';
import {SGaps} from './scenes/SGaps';
import {SScatter} from './scenes/SScatter';
import {S8Semi} from './scenes/S8Semi';
import {S9Summary} from './scenes/S9Summary';
import type {Cue} from './script';

const SCENE_COMPONENTS: Record<SceneId, React.FC<{cues: Cue[]; duration: number}>> = {
  hook: S1Hook,
  current: SCurrent,
  states: SStates,
  fill: SFill,
  bands: S4Bands,
  gaps: SGaps,
  scatter: SScatter,
  semi: S8Semi,
  summary: S9Summary,
};

const plates = TIMELINE.filter((s) => s.chip);

export const Video: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: P.ink}}>
    {TIMELINE.map((s) => {
      const Comp = SCENE_COMPONENTS[s.id];
      const idx = plates.indexOf(s) + 1;
      return (
        <Sequence key={s.id} from={s.from} durationInFrames={s.duration} name={s.id}>
          <SceneShell
            cues={s.cues}
            chip={s.chip}
            en={s.en}
            paper={s.paper}
            no={idx > 0 ? ROMAN[idx] : undefined}
            page={idx > 0 ? `${String(idx).padStart(2, '0')} / ${String(plates.length).padStart(2, '0')}` : undefined}
          >
            <Comp cues={s.cues} duration={s.duration} />
          </SceneShell>
        </Sequence>
      );
    })}
    <GrainOverlay />
  </AbsoluteFill>
);
