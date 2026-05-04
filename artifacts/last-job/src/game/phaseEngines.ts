import type { GameState, Guard, Wall, Light, Obstacle, Cop, Enemy, Bullet, Platform, Hazard } from './types';

const W = 480, H = 720;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, mn: number, mx: number) => Math.max(mn, Math.min(mx, v));
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(ax - bx, ay - by);

export const PHASES_CFG = [
  { label: 'СТЕЛС',       sub: 'ДВИГАЙСЯ В ТЕНИ',    color: '#6366f1' },
  { label: 'ВЗЛОМ',       sub: 'ПОВТОРИ ПАТТЕРН',     color: '#f59e0b' },
  { label: 'ПОГОНЯ',      sub: 'УХОДИ ОТ КОПОВ',      color: '#ef4444' },
  { label: 'ПЕРЕСТРЕЛКА', sub: 'СТРЕЛЯЙ И ПРЯЧЬСЯ',   color: '#f97316' },
  { label: 'ПОБЕГ',       sub: 'ДОБЕГАЙ ДО КОНЦА',    color: '#10b981' },
];

// ─── STEALTH ─────────────────────────────────────────────────────────────────
export const stealth = (() => {
  let px = 60, py = H / 2;
  const speed = 2.8;
  let guards: Guard[] = [];
  let walls: Wall[] = [];
  let lights: Light[] = [];
  let target = { x: W - 50, y: H / 2, collected: false };
  let done = false;
  let monologueTimer = 0;
  let currentMonologue = '';
  let alertMode = false;

  function isInLight(x: number, y: number): boolean {
    for (const g of guards) {
      const d = dist(x, y, g.x, g.y);
      if (d < g.range) {
        const ang = Math.atan2(y - g.y, x - g.x);
        let diff = Math.abs(ang - g.angle);
        if (diff > Math.PI) diff = 2 * Math.PI - diff;
        if (diff < g.fov) return true;
      }
    }
    for (const l of lights) {
      if (dist(x, y, l.x, l.y) < l.range * 0.55) return true;
    }
    return false;
  }

  function collidesWall(x: number, y: number, r = 10): boolean {
    for (const w of walls) {
      if (x + r > w.x && x - r < w.x + w.w && y + r > w.y && y - r < w.y + w.h) return true;
    }
    return false;
  }

  return {
    get done() { return done; },
    set done(v) { done = v; },
    get px() { return px; },
    get py() { return py; },

    init() {
      px = 60; py = H / 2;
      done = false;
      alertMode = false;
      target = { x: W - 60, y: 160, collected: false };
      monologueTimer = 0; currentMonologue = '';

      walls = [
        { x: 110, y: 60,  w: 18, h: 220 },
        { x: 110, y: 430, w: 18, h: 240 },
        { x: 270, y: 150, w: 18, h: 200 },
        { x: 270, y: 430, w: 18, h: 160 },
        { x: 180, y: 290, w: 100, h: 18 },
        { x: 360, y: 340, w: 18, h: 180 },
      ];

      guards = [
        { x: 220, y: 180, angle: 0,           speed: 0.018, range: 125, fov: 0.9,  patrolY: 180, amp: 85 },
        { x: 360, y: 430, angle: Math.PI,      speed: 0.022, range: 115, fov: 0.85, patrolY: 430, amp: 65 },
        { x: 140, y: 580, angle: Math.PI / 2,  speed: 0.016, range: 105, fov: 1.0,  patrolY: 580, amp: 55 },
      ];

      lights = [
        { x: 140, y: 70,  range: 85 },
        { x: 390, y: 190, range: 80 },
        { x: 390, y: 490, range: 90 },
        { x: 240, y: 640, range: 75 },
      ];
    },

    update(G: GameState, monologues: string[]) {
      const spd = speed * G.dt;
      let nx = px, ny = py;

      if (G.keys['ArrowLeft'] || G.keys['KeyA'])  nx -= spd;
      if (G.keys['ArrowRight'] || G.keys['KeyD']) nx += spd;
      if (G.keys['ArrowUp'] || G.keys['KeyW'])    ny -= spd;
      if (G.keys['ArrowDown'] || G.keys['KeyS'])  ny += spd;

      nx = clamp(nx, 12, W - 12);
      ny = clamp(ny, 50, H - 30);

      if (!collidesWall(nx, py)) px = nx;
      if (!collidesWall(px, ny)) py = ny;

      alertMode = G.noise > 65;
      guards.forEach((g, idx) => {
        if (alertMode) {
          const targetAngle = Math.atan2(py - g.y, px - g.x);
          let diff = targetAngle - g.angle;
          while (diff > Math.PI) diff -= 2 * Math.PI;
          while (diff < -Math.PI) diff += 2 * Math.PI;
          g.angle += clamp(diff * 0.06, -0.07, 0.07) * G.dt;
          const d = dist(px, py, g.x, g.y);
          if (d > 70) { g.x += (px - g.x) / d * 0.6 * G.dt; g.y += (py - g.y) / d * 0.6 * G.dt; }
        } else {
          g.angle += g.speed * G.dt;
          if (idx === 0) { g.x = 220 + Math.cos(g.angle * 0.5) * 120; g.y = g.patrolY + Math.sin(g.angle) * g.amp; }
          else if (idx === 1) { g.x = 330 + Math.sin(g.angle * 0.7) * 85; g.y = g.patrolY + Math.cos(g.angle) * g.amp; }
          else { g.x = 130 + Math.cos(g.angle * 0.4) * 60; g.y = g.patrolY + Math.sin(g.angle * 0.9) * g.amp; }
        }
      });

      const inLight = isInLight(px, py);
      if (inLight) {
        const rate = alertMode ? 0.75 : 0.35;
        G.noise = Math.min(100, G.noise + rate * G.dt);
      } else {
        G.noise = Math.max(0, G.noise - (alertMode ? 0.10 : 0.18) * G.dt);
      }

      if (!target.collected && dist(px, py, target.x, target.y) < 22) {
        target.collected = true;
        G.noise = Math.max(0, G.noise - 20);
      }

      if (target.collected && px > W - 40 && py > H - 120) {
        done = true;
      }

      monologueTimer += G.dt;
      if (monologueTimer > 720 && monologues.length > 0) {
        monologueTimer = 0;
        currentMonologue = monologues[Math.floor(Math.random() * monologues.length)];
        setTimeout(() => { currentMonologue = ''; }, 3000);
      }
    },

    draw(ctx: CanvasRenderingContext2D) {
      const c = ctx;

      c.fillStyle = '#0a0a12';
      c.fillRect(0, 0, W, H);

      c.strokeStyle = 'rgba(255,255,255,0.04)';
      c.lineWidth = 1;
      for (let x = 0; x < W; x += 40) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
      for (let y = 0; y < H; y += 40) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }

      for (const l of lights) {
        const grd = c.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.range);
        grd.addColorStop(0, 'rgba(255,240,180,0.18)');
        grd.addColorStop(1, 'rgba(255,240,180,0)');
        c.fillStyle = grd;
        c.beginPath(); c.arc(l.x, l.y, l.range, 0, Math.PI * 2); c.fill();
      }

      for (const g of guards) {
        c.save();
        c.translate(g.x, g.y);
        const grd = c.createRadialGradient(0, 0, 0, 0, 0, g.range);
        grd.addColorStop(0, 'rgba(255,220,100,0.22)');
        grd.addColorStop(1, 'rgba(255,220,100,0)');
        c.fillStyle = grd;
        c.beginPath();
        c.moveTo(0, 0);
        c.arc(0, 0, g.range, g.angle - g.fov, g.angle + g.fov);
        c.closePath();
        c.fill();
        c.restore();
      }

      c.fillStyle = '#1e1e2e';
      c.strokeStyle = 'rgba(255,255,255,0.12)';
      c.lineWidth = 1;
      for (const w of walls) {
        c.fillRect(w.x, w.y, w.w, w.h);
        c.strokeRect(w.x, w.y, w.w, w.h);
      }

      for (const g of guards) {
        c.save();
        c.translate(g.x, g.y);
        c.fillStyle = '#ef4444';
        c.shadowColor = '#ef4444';
        c.shadowBlur = 10;
        c.beginPath(); c.arc(0, 0, 7, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#fff';
        c.beginPath(); c.arc(Math.cos(g.angle) * 10, Math.sin(g.angle) * 10, 3, 0, Math.PI * 2); c.fill();
        c.shadowBlur = 0;
        c.restore();
      }

      if (!target.collected) {
        const pulse = Math.sin(Date.now() * 0.004) * 3;
        c.fillStyle = '#f59e0b';
        c.shadowColor = '#f59e0b';
        c.shadowBlur = 15 + pulse;
        c.fillRect(target.x - 10, target.y - 8, 20, 16);
        c.shadowBlur = 0;
        c.fillStyle = '#fff';
        c.font = '10px Share Tech Mono';
        c.textAlign = 'center';
        c.fillText('КЕЙС', target.x, target.y + 22);
      } else {
        c.fillStyle = '#10b981';
        c.shadowColor = '#10b981';
        c.shadowBlur = 20;
        c.font = 'bold 11px Share Tech Mono';
        c.textAlign = 'center';
        c.fillText('[ ВЫХОД ]', W - 50, H - 80);
        c.shadowBlur = 0;

        c.strokeStyle = '#10b981';
        c.lineWidth = 1.5;
        c.setLineDash([4, 4]);
        c.strokeRect(W - 75, H - 110, 50, 40);
        c.setLineDash([]);
      }

      // Alert mode border
      if (alertMode) {
        const pulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.008);
        c.strokeStyle = `rgba(239,68,68,${0.3 + pulse * 0.3})`;
        c.lineWidth = 6;
        c.strokeRect(0, 0, W, H);
        c.fillStyle = `rgba(239,68,68,${0.04 + pulse * 0.04})`;
        c.fillRect(0, 0, W, H);
        c.fillStyle = `rgba(239,68,68,${0.5 + pulse * 0.4})`;
        c.font = 'bold 11px Share Tech Mono';
        c.textAlign = 'center';
        c.letterSpacing = '4px';
        c.fillText('⚠ ТРЕВОГА ⚠', W / 2, 22);
        c.letterSpacing = '0px';
      }

      const inLight = isInLight(px, py);
      c.save();
      c.translate(px, py);
      c.fillStyle = inLight ? '#ef4444' : PHASES_CFG[0].color;
      c.shadowColor = inLight ? '#ef4444' : PHASES_CFG[0].color;
      c.shadowBlur = inLight ? 20 : 10;
      c.beginPath(); c.arc(0, 0, 9, 0, Math.PI * 2); c.fill();
      c.shadowBlur = 0;
      c.fillStyle = '#fff';
      c.fillRect(-3, -3, 3, 3); c.fillRect(2, -3, 3, 3);
      c.restore();

      if (currentMonologue) {
        c.fillStyle = 'rgba(0,0,0,0.6)';
        c.fillRect(0, H - 70, W, 50);
        c.fillStyle = 'rgba(255,255,255,0.5)';
        c.font = 'italic 12px Share Tech Mono';
        c.textAlign = 'center';
        c.fillText(`"${currentMonologue}"`, W / 2, H - 42);
      }
    },
  };
})();

// ─── HACK ─────────────────────────────────────────────────────────────────────
export const hack = (() => {
  let sequence: string[] = [];
  let input: string[] = [];
  let phase = 'show';
  let timer = 0;
  const showTime = 80;
  let cursorBlink = 0;
  let round = 0;
  const maxRounds = 4;
  let done = false;
  const noiseDecay = 0.15;

  function nextRound() {
    const len = 3 + round;
    sequence = [];
    const chars = 'ABCD';
    for (let i = 0; i < len; i++) sequence.push(chars[Math.floor(Math.random() * chars.length)]);
    input = [];
    phase = 'show';
    timer = 0;
    cursorBlink = 0;
  }

  return {
    get done() { return done; },
    set done(v) { done = v; },

    init() {
      round = 0;
      done = false;
      nextRound();
    },

    onKey(key: string) {
      if (phase !== 'input') return;
      const valid = '0123456789ABCDEF';
      const k = key.toUpperCase();
      if (k === 'BACKSPACE') {
        if (input.length > 0) input.pop();
        return;
      }
      if (valid.includes(k) && input.length < sequence.length) {
        input.push(k);
        if (input.length === sequence.length) {
          const ok = input.every((c, i) => c === sequence[i]);
          if (ok) {
            phase = 'success';
            timer = 0;
          } else {
            phase = 'fail';
            timer = 0;
          }
        }
      }
    },

    update(G: GameState) {
      timer += G.dt;
      cursorBlink += G.dt;
      G.noise = Math.max(0, G.noise - 0.08 * G.dt);

      if (phase === 'show') {
        if (timer > showTime + sequence.length * 8) {
          phase = 'input';
          timer = 0;
        }
      } else if (phase === 'input') {
        // Time pressure: 5 seconds to enter the sequence or noise spikes
        if (timer > 300) {
          G.noise = Math.min(100, G.noise + 30);
          phase = 'fail';
          timer = 0;
        }
      } else if (phase === 'success') {
        if (timer > 50) {
          round++;
          if (round >= maxRounds) done = true;
          else nextRound();
        }
      } else if (phase === 'fail') {
        if (timer > 60) {
          input = [];
          phase = 'input';
          timer = 0;
          G.noise = Math.min(100, G.noise + 25);
        }
      }
    },

    draw(ctx: CanvasRenderingContext2D) {
      const c = ctx;
      const col = PHASES_CFG[1].color;

      c.fillStyle = '#080810';
      c.fillRect(0, 0, W, H);

      c.fillStyle = 'rgba(0,0,0,0.15)';
      for (let y = 0; y < H; y += 4) c.fillRect(0, y, W, 2);

      const fw = 360, fh = 420, fx = (W - fw) / 2, fy = (H - fh) / 2;
      c.strokeStyle = col;
      c.shadowColor = col;
      c.shadowBlur = 20;
      c.lineWidth = 1;
      c.strokeRect(fx, fy, fw, fh);
      c.shadowBlur = 0;

      const corners = [[fx, fy], [fx + fw, fy], [fx, fy + fh], [fx + fw, fy + fh]] as [number, number][];
      const signs   = [[-1, -1], [1, -1], [-1, 1], [1, 1]] as [number, number][];
      c.strokeStyle = col; c.lineWidth = 2;
      corners.forEach(([cx, cy], i) => {
        const [sx, sy] = signs[i];
        c.strokeRect(cx - sx * 10, cy - sy * 10, sx * 20, sy * 20);
      });

      c.fillStyle = col;
      c.font = '11px Share Tech Mono';
      c.textAlign = 'left';
      c.fillText('ВЗЛОМ СЕЙФА v2.1', fx + 16, fy + 24);
      c.fillStyle = 'rgba(255,255,255,0.3)';
      c.textAlign = 'right';
      c.fillText(`РАУНД ${round + 1}/${maxRounds}`, fx + fw - 16, fy + 24);

      const prog = round / maxRounds;
      c.fillStyle = 'rgba(255,255,255,0.1)';
      c.fillRect(fx + 16, fy + 35, fw - 32, 3);
      c.fillStyle = col;
      c.fillRect(fx + 16, fy + 35, (fw - 32) * prog, 3);

      const sy2 = fy + 100;
      c.textAlign = 'center';

      if (phase === 'show') {
        c.fillStyle = 'rgba(255,255,255,0.4)';
        c.font = '11px Share Tech Mono';
        c.fillText('ЗАПОМНИ ПОСЛЕДОВАТЕЛЬНОСТЬ', W / 2, sy2 - 30);

        c.font = 'bold 36px Share Tech Mono';
        const showCount = Math.floor((timer - 20) / 8);
        sequence.forEach((ch, i) => {
          const revealed = i <= showCount;
          c.fillStyle = revealed ? col : 'rgba(255,255,255,0.15)';
          c.shadowColor = col;
          c.shadowBlur = revealed ? 15 : 0;
          c.fillText(ch, fx + 50 + i * (fw - 40) / (sequence.length), sy2 + 20);
        });
        c.shadowBlur = 0;

      } else if (phase === 'input' || phase === 'fail') {
        c.font = 'bold 36px Share Tech Mono';
        sequence.forEach((_, i) => {
          c.fillStyle = 'rgba(255,255,255,0.08)';
          c.fillText('?', fx + 50 + i * (fw - 40) / (sequence.length), sy2 + 20);
        });

        c.fillStyle = 'rgba(255,255,255,0.4)';
        c.font = '11px Share Tech Mono';
        c.fillText('ВВОДИ:', W / 2, sy2 + 70);

        sequence.forEach((_, i) => {
          const entered = input[i];
          const isWrong = phase === 'fail' && entered && entered !== sequence[i];
          c.font = 'bold 36px Share Tech Mono';
          c.shadowBlur = 0;

          if (entered) {
            c.fillStyle = isWrong ? '#ef4444' : '#fff';
            c.shadowColor = isWrong ? '#ef4444' : '#fff';
            c.shadowBlur = isWrong ? 15 : 8;
            c.fillText(entered, fx + 50 + i * (fw - 40) / (sequence.length), sy2 + 110);
          } else if (i === input.length && Math.floor(cursorBlink / 20) % 2 === 0) {
            c.fillStyle = col;
            c.fillText('_', fx + 50 + i * (fw - 40) / (sequence.length), sy2 + 110);
          } else {
            c.fillStyle = 'rgba(255,255,255,0.15)';
            c.fillText('_', fx + 50 + i * (fw - 40) / (sequence.length), sy2 + 110);
          }
          c.shadowBlur = 0;
        });

          // Countdown bar in input phase
        if (phase === 'input') {
          const timeLeft = Math.max(0, 1 - timer / 300);
          const barW = fw - 32;
          c.fillStyle = 'rgba(255,255,255,0.06)';
          c.fillRect(fx + 16, fy + fh - 50, barW, 4);
          c.fillStyle = timeLeft > 0.4 ? col : timeLeft > 0.2 ? '#f59e0b' : '#ef4444';
          c.fillRect(fx + 16, fy + fh - 50, barW * timeLeft, 4);
          c.fillStyle = 'rgba(255,255,255,0.2)';
          c.font = '9px Share Tech Mono';
          c.fillText('ВРЕМЯ', W / 2, fy + fh - 55);
        }

        if (phase === 'fail') {
          c.fillStyle = '#ef4444';
          c.font = '12px Share Tech Mono';
          c.fillText('ОШИБКА — ПОВТОР', W / 2, sy2 + 150);
        }

      } else if (phase === 'success') {
        c.fillStyle = '#10b981';
        c.shadowColor = '#10b981';
        c.shadowBlur = 20;
        c.font = 'bold 28px Share Tech Mono';
        c.fillText('ВЗЛОМАНО', W / 2, sy2 + 60);
        c.shadowBlur = 0;
      }

      c.fillStyle = 'rgba(255,255,255,0.2)';
      c.font = '10px Share Tech Mono';
      c.textAlign = 'center';
      c.fillText('[ 0-9  A-F  BACKSPACE ]', W / 2, fy + fh - 20);
    },
  };
})();

// ─── CHASE ────────────────────────────────────────────────────────────────────
export const chase = (() => {
  let px = W / 2, py = H - 80;
  const speed = 4.5;
  let cops: Cop[] = [];
  let obstacles: Obstacle[] = [];
  let scrollY = 0;
  let distanceCovered = 0;
  const distNeeded = 800;
  let spawnTimer = 0;
  let done = false;
  const noiseDecay = 0;

  return {
    get done() { return done; },
    set done(v) { done = v; },

    init() {
      px = W / 2; py = H - 80;
      scrollY = 0; distanceCovered = 0;
      cops = []; obstacles = [];
      done = false;
      spawnTimer = 0;

      for (let i = 0; i < 3; i++) {
        cops.push({ x: rnd(60, W - 60), y: -100 - i * 80, speed: rnd(2.8, 3.6) });
      }

      for (let i = 0; i < 12; i++) {
        obstacles.push({
          x: rnd(20, W - 70),
          y: -200 - i * rnd(80, 140),
          w: rnd(40, 120), h: 14,
        });
      }
    },

    update(G: GameState) {
      const spd = speed * G.dt;
      let nx = px, ny = py;

      if (G.keys['ArrowLeft'] || G.keys['KeyA'])  nx -= spd * 1.4;
      if (G.keys['ArrowRight'] || G.keys['KeyD']) nx += spd * 1.4;
      if (G.keys['ArrowUp'] || G.keys['KeyW'])    ny -= spd;
      if (G.keys['ArrowDown'] || G.keys['KeyS'])  ny += spd * 0.6;

      nx = clamp(nx, 16, W - 16);
      ny = clamp(ny, H * 0.4, H - 20);

      let blocked = false;
      for (const ob of obstacles) {
        const worldY = ob.y + scrollY;
        if (nx + 10 > ob.x && nx - 10 < ob.x + ob.w && ny + 10 > worldY && ny - 10 < worldY + ob.h) blocked = true;
      }
      if (!blocked) { px = nx; py = ny; }

      scrollY += spd * 1.8;
      distanceCovered += spd * 1.8;

      for (const cop of cops) {
        const dx = px - cop.x;
        const dy = py - (cop.y + scrollY);
        const d = Math.hypot(dx, dy) || 1;
        cop.x += (dx / d) * cop.speed * G.dt * 0.8;
        cop.y += spd * 1.5 * G.dt;

        const copDist = dist(px, py, cop.x, cop.y + scrollY);
        if (copDist < 28) {
          G.noise = Math.min(100, G.noise + (copDist < 14 ? 1.8 : 0.7) * G.dt);
        }
      }

      const spawnInterval = distanceCovered > 500 ? 65 : distanceCovered > 250 ? 90 : 120;
      spawnTimer += G.dt;
      if (spawnTimer > spawnInterval) {
        spawnTimer = 0;
        const newSpeed = rnd(3, 4) + (distanceCovered > 500 ? 0.8 : 0);
        cops.push({ x: rnd(40, W - 40), y: -50 - scrollY, speed: newSpeed });
        if (distanceCovered > 400) {
          cops.push({ x: rnd(40, W - 40), y: -120 - scrollY, speed: rnd(3.5, 4.5) });
        }
      }

      G.noise = Math.max(0, G.noise - 0.08 * G.dt);

      if (distanceCovered >= distNeeded) done = true;
    },

    draw(ctx: CanvasRenderingContext2D) {
      const c = ctx;
      const col = PHASES_CFG[2].color;

      c.fillStyle = '#111118';
      c.fillRect(0, 0, W, H);

      c.strokeStyle = 'rgba(255,255,255,0.06)';
      c.lineWidth = 2; c.setLineDash([30, 20]);
      c.beginPath(); c.moveTo(W / 2, 0); c.lineTo(W / 2, H); c.stroke();
      c.setLineDash([]);

      c.fillStyle = '#1a1a28';
      c.fillRect(0, 0, 25, H); c.fillRect(W - 25, 0, 25, H);

      for (const ob of obstacles) {
        const wy = ob.y + scrollY;
        if (wy < -20 || wy > H + 20) continue;
        c.fillStyle = '#f59e0b';
        c.shadowColor = '#f59e0b'; c.shadowBlur = 8;
        c.fillRect(ob.x, wy, ob.w, ob.h);
        c.fillStyle = '#000';
        c.shadowBlur = 0;
        for (let sx = ob.x; sx < ob.x + ob.w; sx += 16) {
          c.fillRect(sx, wy, 8, ob.h);
        }
      }

      const prog = distanceCovered / distNeeded;
      c.fillStyle = 'rgba(255,255,255,0.08)';
      c.fillRect(W - 20, H - 20 - H * 0.7, 6, H * 0.7);
      c.fillStyle = col;
      c.shadowColor = col; c.shadowBlur = 10;
      c.fillRect(W - 20, H - 20 - H * 0.7 * prog, 6, H * 0.7 * prog);
      c.shadowBlur = 0;

      for (const cop of cops) {
        const cy = cop.y + scrollY;
        if (cy < -30 || cy > H + 30) continue;
        c.save();
        c.translate(cop.x, cy);
        c.fillStyle = '#ef4444';
        c.shadowColor = '#ef4444'; c.shadowBlur = 12;
        c.fillRect(-12, -18, 24, 36);
        c.fillStyle = '#fff';
        c.shadowBlur = 0;
        c.fillRect(-8, -14, 16, 10);
        if (Math.floor(Date.now() / 200) % 2 === 0) {
          c.fillStyle = '#60a5fa';
          c.fillRect(-6, -22, 6, 6);
        } else {
          c.fillStyle = '#ef4444';
          c.fillRect(0, -22, 6, 6);
        }
        c.restore();
      }

      c.save();
      c.translate(px, py);
      c.fillStyle = '#fff';
      c.shadowColor = '#fff'; c.shadowBlur = 8;
      c.fillRect(-11, -20, 22, 40);
      c.fillStyle = '#111';
      c.shadowBlur = 0;
      c.fillRect(-7, -16, 14, 12);
      c.fillStyle = '#f59e0b';
      c.fillRect(-11, -22, 22, 4);
      c.restore();

      c.fillStyle = 'rgba(255,255,255,0.4)';
      c.font = '9px Share Tech Mono';
      c.textAlign = 'right';
      c.fillText('ДИСТАНЦИЯ', W - 24, H - 24);
    },
  };
})();

// ─── SHOOTER ─────────────────────────────────────────────────────────────────
export const shooter = (() => {
  let px = W / 2, py = H - 100;
  let cover: Wall[] = [];
  let enemies: Enemy[] = [];
  let bullets: Bullet[] = [];
  let eBullets: Bullet[] = [];
  let kills = 0;
  const killsNeeded = 8;
  let shootTimer = 0;
  let done = false;
  let waveCount = 0;
  let rusherSet: WeakSet<Enemy> = new WeakSet();

  function isBehindCover(x: number, y: number): boolean {
    for (const cov of cover) {
      if (x > cov.x && x < cov.x + cov.w && y > cov.y - 20 && y < cov.y + cov.h + 10) return true;
    }
    return false;
  }

  function spawnWave(count: number, withRusher = false) {
    for (let i = 0; i < count; i++) {
      const e: Enemy = {
        x: rnd(60, W - 60),
        y: rnd(80, H - 350),
        hp: 2,
        shootTimer: Math.floor(rnd(30, 90)),
        moveTimer: 0,
        vx: rnd(-1, 1),
      };
      enemies.push(e);
      if (withRusher && i === 0) { e.hp = 1; rusherSet.add(e); }
    }
    waveCount++;
  }

  return {
    get done() { return done; },
    set done(v) { done = v; },

    init() {
      px = W / 2; py = H - 100;
      bullets = []; eBullets = [];
      kills = 0; shootTimer = 0; done = false;

      cover = [
        { x: 60,  y: H - 200, w: 80, h: 20 },
        { x: 200, y: H - 300, w: 80, h: 20 },
        { x: 340, y: H - 200, w: 80, h: 20 },
        { x: 120, y: H - 400, w: 60, h: 20 },
        { x: 300, y: H - 420, w: 70, h: 20 },
      ];

      enemies = [];
      waveCount = 0;
      rusherSet = new WeakSet();
      spawnWave(4);
    },

    update(G: GameState) {
      const spd = 4 * G.dt;
      let nx = px, ny = py;

      if (G.keys['ArrowLeft'] || G.keys['KeyA'])  nx -= spd * 1.5;
      if (G.keys['ArrowRight'] || G.keys['KeyD']) nx += spd * 1.5;
      if (G.keys['ArrowUp'] || G.keys['KeyW'])    ny -= spd;
      if (G.keys['ArrowDown'] || G.keys['KeyS'])  ny += spd;

      px = clamp(nx, 16, W - 16);
      py = clamp(ny, H * 0.3, H - 20);

      shootTimer += G.dt;
      if ((G.keys['Space'] || G.keys['KeyE']) && shootTimer > 12) {
        shootTimer = 0;
        let nearest: Enemy | null = null, nd = Infinity;
        for (const e of enemies) {
          const d = dist(px, py, e.x, e.y);
          if (d < nd) { nd = d; nearest = e; }
        }
        if (nearest) {
          const dx = nearest.x - px, dy = nearest.y - py, len = Math.hypot(dx, dy) || 1;
          bullets.push({ x: px, y: py, vx: dx / len * 12, vy: dy / len * 12, life: 60 });
        }
      }

      for (const b of bullets) { b.x += b.vx * G.dt * 3; b.y += b.vy * G.dt * 3; b.life--; }
      bullets = bullets.filter(b => b.life > 0);

      for (const e of enemies) {
        if (rusherSet.has(e)) {
          const dx = px - e.x, dy = py - e.y, d = Math.hypot(dx, dy) || 1;
          e.x += (dx / d) * 2.2 * G.dt;
          e.y += (dy / d) * 2.2 * G.dt;
          if (dist(px, py, e.x, e.y) < 16) {
            G.noise = Math.min(100, G.noise + 22);
            e.hp = 0;
          }
        } else {
          e.moveTimer += G.dt;
          if (e.moveTimer > 60) { e.moveTimer = 0; e.vx = rnd(-2, 2); }
          e.x = clamp(e.x + e.vx * G.dt * 1.5, 30, W - 30);
          e.shootTimer -= G.dt;
          if (e.shootTimer <= 0) {
            e.shootTimer = rnd(50, 120);
            const dx = px - e.x, dy = py - e.y, len = Math.hypot(dx, dy) || 1;
            eBullets.push({ x: e.x, y: e.y, vx: dx / len * 5, vy: dy / len * 5, life: 80 });
          }
        }
        for (const b of bullets) {
          if (b.life > 0 && dist(b.x, b.y, e.x, e.y) < 14) {
            e.hp--;
            b.life = 0;
          }
        }
      }

      const prevCount = enemies.length;
      enemies = enemies.filter(e => e.hp > 0);
      kills += prevCount - enemies.length;

      for (const b of eBullets) {
        b.x += b.vx * G.dt * 3; b.y += b.vy * G.dt * 3; b.life--;
        if (dist(b.x, b.y, px, py) < 12) {
          G.noise = Math.min(100, G.noise + 20);
          b.life = 0;
        }
      }
      eBullets = eBullets.filter(b => b.life > 0);

      const inCover = isBehindCover(px, py);
      G.noise = Math.max(0, G.noise - (inCover ? 0.5 : 0.08) * G.dt);

      if (enemies.length === 0 && kills < killsNeeded) {
        spawnWave(3, waveCount % 2 === 1);
      }

      if (kills >= killsNeeded) done = true;
    },

    draw(ctx: CanvasRenderingContext2D) {
      const c = ctx;
      const col = PHASES_CFG[3].color;

      c.fillStyle = '#0c0c10';
      c.fillRect(0, 0, W, H);

      for (const cov of cover) {
        c.fillStyle = '#2a2a3e';
        c.strokeStyle = 'rgba(255,255,255,0.2)';
        c.lineWidth = 1;
        c.fillRect(cov.x, cov.y, cov.w, cov.h);
        c.strokeRect(cov.x, cov.y, cov.w, cov.h);
      }

      for (const e of enemies) {
        c.save();
        c.translate(e.x, e.y);
        c.fillStyle = '#ef4444';
        c.shadowColor = '#ef4444'; c.shadowBlur = 12;
        c.beginPath(); c.arc(0, 0, 10, 0, Math.PI * 2); c.fill();
        c.shadowBlur = 0;
        c.fillStyle = e.hp >= 2 ? '#4ade80' : '#f59e0b';
        c.fillRect(-8, -16, 16 * (e.hp / 2), 3);
        c.restore();
      }

      c.fillStyle = '#ef4444';
      c.shadowColor = '#ef4444'; c.shadowBlur = 6;
      for (const b of eBullets) { c.beginPath(); c.arc(b.x, b.y, 3, 0, Math.PI * 2); c.fill(); }

      c.fillStyle = '#fff'; c.shadowColor = '#fff'; c.shadowBlur = 8;
      for (const b of bullets) { c.beginPath(); c.arc(b.x, b.y, 4, 0, Math.PI * 2); c.fill(); }
      c.shadowBlur = 0;

      const inCov = isBehindCover(px, py);
      c.save();
      c.translate(px, py);
      c.fillStyle = inCov ? '#10b981' : col;
      c.shadowColor = inCov ? '#10b981' : col; c.shadowBlur = 15;
      c.beginPath(); c.arc(0, 0, 11, 0, Math.PI * 2); c.fill();
      c.shadowBlur = 0;
      c.fillStyle = '#fff';
      c.fillRect(-3, -3, 3, 3); c.fillRect(2, -3, 3, 3);
      c.restore();

      c.fillStyle = 'rgba(255,255,255,0.6)';
      c.font = '11px Share Tech Mono'; c.textAlign = 'left';
      c.fillText(`ЦЕЛИ: ${kills}/${killsNeeded}`, 18, H - 18);
      c.fillStyle = 'rgba(255,255,255,0.3)';
      c.font = '10px Share Tech Mono';
      c.fillText(isBehindCover(px, py) ? '[ В УКРЫТИИ ]' : '[ НА ВИДУ ]', 18, H - 34);
      c.fillStyle = 'rgba(255,255,255,0.3)'; c.textAlign = 'right';
      c.fillText('SPACE — огонь', W - 18, H - 18);
    },
  };
})();

// ─── ESCAPE ───────────────────────────────────────────────────────────────────
export const escape = (() => {
  let px = 40, py = H / 2;
  let vy = 0;
  let onGround = false;
  let platforms: Platform[] = [];
  let hazards: Hazard[] = [];
  let scrollX = 0;
  let distX = 0;
  const distNeeded = 1200;
  let done = false;
  let jumpPressed = false;
  let coyoteFrames = 0;
  const noiseDecay = 0.06;

  function generateWorld() {
    platforms = [];
    hazards = [];
    platforms.push({ x: 0, y: H - 40, w: W * 12, h: 40 });

    let cx = 200, cy = H - 120;
    for (let i = 0; i < 35; i++) {
      const pw = rnd(60, 140);
      platforms.push({ x: cx, y: cy, w: pw, h: 14 });
      if (Math.random() < 0.3) hazards.push({ x: cx + pw / 2, y: cy - 20, r: 8 });
      cx += rnd(100, 180);
      cy = clamp(cy + rnd(-80, 80), H - 380, H - 80);
    }
  }

  return {
    get done() { return done; },
    set done(v) { done = v; },

    init() {
      px = 40; py = H / 2; vy = 0;
      scrollX = 0; distX = 0; done = false;
      onGround = false; jumpPressed = false; coyoteFrames = 0;
      generateWorld();
    },

    update(G: GameState) {
      if (onGround) coyoteFrames = 6;
      else coyoteFrames = Math.max(0, coyoteFrames - 1);

      if ((G.keys['ArrowUp'] || G.keys['KeyW'] || G.keys['Space']) && (onGround || coyoteFrames > 0) && !jumpPressed) {
        vy = -9;
        onGround = false;
        coyoteFrames = 0;
        jumpPressed = true;
      }
      if (!(G.keys['ArrowUp'] || G.keys['KeyW'] || G.keys['Space'])) jumpPressed = false;

      vy += 0.45 * G.dt;
      vy = clamp(vy, -12, 14);

      let vx = 4 * G.dt;
      if (G.keys['ArrowRight'] || G.keys['KeyD']) vx = 5.5 * G.dt;
      if (G.keys['ArrowLeft'] || G.keys['KeyA'])  vx = 2.0 * G.dt;

      let nx = px + vx;
      let ny = py + vy * G.dt;
      onGround = false;

      for (const p of platforms) {
        const wx = p.x - scrollX;
        if (nx + 10 > wx && nx - 10 < wx + p.w) {
          if (py + 12 <= p.y && ny + 12 >= p.y) {
            ny = p.y - 12; vy = 0; onGround = true;
          }
        }
      }

      px = nx;
      py = ny;

      if (px > W * 0.4) {
        const excess = px - W * 0.4;
        scrollX += excess;
        distX += excess;
        px = W * 0.4;
      }

      for (const h of hazards) {
        const hx = h.x - scrollX;
        if (dist(px, py, hx, h.y) < h.r + 10) {
          G.noise = Math.min(100, G.noise + 18);
        }
      }

      if (py > H + 50) {
        G.noise = Math.min(100, G.noise + 30);
        py = H / 2; vy = 0;
      }

      G.noise = Math.max(0, G.noise - 0.1 * G.dt);

      if (distX >= distNeeded) done = true;
    },

    draw(ctx: CanvasRenderingContext2D) {
      const c = ctx;
      const col = PHASES_CFG[4].color;

      const sky = c.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#0a1628');
      sky.addColorStop(1, '#1a0a28');
      c.fillStyle = sky; c.fillRect(0, 0, W, H);

      c.fillStyle = '#0f0f1a';
      for (let i = 0; i < 12; i++) {
        const bw = 30 + Math.sin(i * 1.7) * 20;
        const bh = 80 + Math.sin(i * 2.3) * 60;
        const bx = ((i * 55 - scrollX * 0.08) % W + W) % W;
        c.fillRect(bx, H - bh - 40, bw, bh + 40);
      }

      for (const p of platforms) {
        const wx = p.x - scrollX;
        if (wx > W + 20 || wx + p.w < -20) continue;
        c.fillStyle = p.h > 20 ? '#1a1a2e' : '#334155';
        c.strokeStyle = 'rgba(255,255,255,0.15)';
        c.lineWidth = 1;
        c.fillRect(wx, p.y, p.w, p.h);
        if (p.h <= 20) c.strokeRect(wx, p.y, p.w, p.h);
      }

      for (const h of hazards) {
        const hx = h.x - scrollX;
        if (hx < -20 || hx > W + 20) continue;
        const pulse = Math.sin(Date.now() * 0.005) * 2;
        c.fillStyle = '#ef4444';
        c.shadowColor = '#ef4444'; c.shadowBlur = 12 + pulse;
        c.beginPath(); c.arc(hx, h.y, h.r, 0, Math.PI * 2); c.fill();
        c.shadowBlur = 0;
      }

      const prog = distX / distNeeded;
      c.fillStyle = 'rgba(255,255,255,0.06)';
      c.fillRect(16, H - 16, W - 32, 3);
      c.fillStyle = col; c.shadowColor = col; c.shadowBlur = 8;
      c.fillRect(16, H - 16, (W - 32) * prog, 3);
      c.shadowBlur = 0;

      c.save();
      c.translate(px, py);
      c.fillStyle = col;
      c.shadowColor = col; c.shadowBlur = 15;
      c.fillRect(-10, -14, 20, 28);
      c.shadowBlur = 0;
      c.fillStyle = '#fff';
      c.fillRect(-4, -8, 4, 4); c.fillRect(2, -8, 4, 4);
      const legPhase = Math.sin(Date.now() * 0.015) * 5;
      c.fillStyle = col;
      c.fillRect(-6, 14, 6, 8 + legPhase);
      c.fillRect(2, 14, 6, 8 - legPhase);
      c.restore();

      c.fillStyle = 'rgba(255,255,255,0.25)';
      c.font = '10px Share Tech Mono'; c.textAlign = 'right';
      c.fillText('↑ ПРЫЖОК', W - 18, H - 22);
    },
  };
})();

export const PHASE_ENGINES = [stealth, hack, chase, shooter, escape];
