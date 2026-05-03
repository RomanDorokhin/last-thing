export interface Vec2 {
  x: number;
  y: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface Keys {
  [key: string]: boolean;
}

export interface GameState {
  phase: number;
  noise: number;
  running: boolean;
  paused: boolean;
  startTime: number;
  phaseStartTime: number;
  phaseTimes: number[];
  keys: Keys;
  dt: number;
  lastTime: number;
  rafId: number;
  shake: number;
  screenFlash: number;
  combo: number;
  score: number;
  invulnerable: number;
}

export interface PhaseConfig {
  label: string;
  sub: string;
  color: string;
  hint: string;
}

export interface Wall {
  x: number;
  y: number;
  w: number;
  h: number;
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

export interface Light {
  x: number;
  y: number;
  range: number;
}

export interface Target {
  x: number;
  y: number;
  collected: boolean;
}

export const PHASES: PhaseConfig[] = [
  { label: 'СТЕЛС', sub: 'ДВИГАЙСЯ В ТЕНИ', color: '#6366f1', hint: 'СОБЕРИ КЕЙС · ИЗБЕГАЙ СВЕТА' },
  { label: 'ВЗЛОМ', sub: 'ПОВТОРИ ПАТТЕРН', color: '#f59e0b', hint: 'ЗАПОМНИ КОД · ВВЕДИ ЕГО' },
  { label: 'ПОГОНЯ', sub: 'УХОДИ ОТ КОПОВ', color: '#ef4444', hint: 'УВОРАЧИВАЙСЯ ОТ ПОЛИЦЕЙСКИХ' },
  { label: 'ПЕРЕСТРЕЛКА', sub: 'СТРЕЛЯЙ И ПРЯЧЬСЯ', color: '#f97316', hint: 'SPACE — ОГОНЬ · УКРЫТИЯ ЗАЩИЩАЮТ' },
  { label: 'ПОБЕГ', sub: 'ДОБЕГАЙ ДО КОНЦА', color: '#10b981', hint: 'ПРЫГАЙ · ДОБЕРИСЬ ДО КОНЦА' },
];

export const W = 480;
export const H = 720;

export const G: GameState = {
  phase: 0,
  noise: 0,
  running: false,
  paused: false,
  startTime: 0,
  phaseStartTime: 0,
  phaseTimes: [0, 0, 0, 0, 0],
  keys: {},
  dt: 0,
  lastTime: 0,
  rafId: 0,
  shake: 0,
  screenFlash: 0,
  combo: 0,
  score: 0,
  invulnerable: 0,
};
