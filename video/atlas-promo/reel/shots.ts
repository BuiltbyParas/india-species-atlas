/**
 * The reel's edit, read from reel/edit/shotlist.json, the one machine-readable
 * source the plan documents and this composition share. Change a time there
 * and the reel follows.
 */
import data from '../../../reel/edit/shotlist.json';

export interface VoiceLine {
  id: string;
  in: number;
  out: number;
  line: string;
  emotion: string;
  claim: string | null;
}

export interface Shot {
  id: string;
  in: number;
  out: number;
  source: string;
  flowFile?: string;
  section: string;
  visual: string;
  character: string | null;
  voice: string[];
  sfx: string[];
  music: string;
  transitionIn: string;
  transitionOut: string;
  text: string[];
  status: string;
  honesty?: string;
}

export const REEL = data as unknown as {
  format: { width: number; height: number; fps: number; duration: number };
  safeZone: { top: number; bottom: number; left: number; right: number };
  voice: VoiceLine[];
  shots: Shot[];
};

export const FPS = REEL.format.fps;
export const W = REEL.format.width;
export const H = REEL.format.height;
export const SAFE = REEL.safeZone;
export const DURATION_FRAMES = Math.round(REEL.format.duration * FPS);
export const SHOTS = REEL.shots;
export const VOICE = REEL.voice;
export const SHOT = Object.fromEntries(SHOTS.map((s) => [s.id, s])) as Record<string, Shot>;
export const f = (seconds: number) => Math.round(seconds * FPS);

/** The character's on-screen window, written in the shot list as "(7.6 to 8.4)". */
export function characterWindow(s: Shot): [number, number] | null {
  const m = s.character?.match(/\((\d+(?:\.\d+)?) to (\d+(?:\.\d+)?)\)/);
  return m ? [Number(m[1]), Number(m[2])] : null;
}
