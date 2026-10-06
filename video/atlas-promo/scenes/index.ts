import type { ComponentType } from 'react';
import type { SceneId } from '../timeline';
import { S01Signal } from './S01Signal';
import { S02India } from './S02India';
import { S03Landscape } from './S03Landscape';
import { S04Life } from './S04Life';
import { S05Data } from './S05Data';
import { S06Threats } from './S06Threats';
import { S07Conservation } from './S07Conservation';
import { S08Atlas } from './S08Atlas';
import { S09System } from './S09System';
import { S10Brand } from './S10Brand';

export const SCENE_COMPONENTS: Record<SceneId, ComponentType> = {
  signal: S01Signal,
  india: S02India,
  landscape: S03Landscape,
  life: S04Life,
  data: S05Data,
  threats: S06Threats,
  conservation: S07Conservation,
  atlas: S08Atlas,
  system: S09System,
  brand: S10Brand,
};
