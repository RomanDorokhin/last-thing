export interface GameState {
  phase: number;
  noise: number;
  running: boolean;
  dt: number;
  lastTime: number;
  keys: Record<string, boolean>;
  rafId: number;
  morality: number; // 0 = ruthless, 100 = merciful
  choices: Record<string, string>; // choice key -> chosen option
  failCount: number;
  startTime: number;
}

export interface Guard {
  x: number;
  y: number;
  angle: number;
  speed: number;
  range: number;
  fov: number;
  patrolY: number;
  amp: number;
}

export interface Wall {
  x: number; y: number; w: number; h: number;
}

export interface Light {
  x: number; y: number; range: number;
}

export interface Obstacle {
  x: number; y: number; w: number; h: number;
}

export interface Cop {
  x: number; y: number; speed: number;
}

export interface Enemy {
  x: number; y: number; hp: number;
  shootTimer: number; moveTimer: number; vx: number;
}

export interface Bullet {
  x: number; y: number; vx: number; vy: number; life: number;
}

export interface Platform {
  x: number; y: number; w: number; h: number;
}

export interface Hazard {
  x: number; y: number; r: number;
}

export type ScreenState =
  | 'intro'
  | 'backstory'
  | 'transition'
  | 'playing'
  | 'choice'
  | 'interlude'
  | 'fail'
  | 'ending';

export interface Choice {
  id: string;
  text: string;
  optionA: { label: string; moralityDelta: number; hint: string };
  optionB: { label: string; moralityDelta: number; hint: string };
}

export interface Interlude {
  phase: number;
  lines: string[];
  quote?: string;
  quoteAuthor?: string;
}
