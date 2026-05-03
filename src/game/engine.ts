import { G, PHASES, W, H, type Guard, type Wall, type Light, type Target } from './types';
import { sound } from './sound';
import { ParticleSystem } from './particles';
const clamp = (v: number, mn: number, mx: number) => Math.max(mn, Math.min(mx, v));
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(ax - bx, ay - by);

// ─── STEALTH PHASE ───────────────────────────────────────────────────────────
class StealthPhase {
  px = 60;
  py = H / 2;
  speed = 2.8;
  guards: Guard[] = [];
  walls: Wall[] = [];
  lights: Light[] = [];
  target: Target = { x: W - 50, y: H / 2, collected: false };
  done = false;
  noiseDecay = 0.08;
  stepTimer = 0;
  alertTimer = 0;

  init() {
    this.px = 60;
    this.py = H / 2;
    this.done = false;
    this.target.collected = false;
    this.walls = [
      { x: 120, y: 80, w: 20, h: 200 },
      { x: 120, y: 440, w: 20, h: 200 },
      { x: 280, y: 160, w: 20, h: 180 },
      { x: 280, y: 420, w: 20, h: 140 },
      { x: 200, y: 300, w: 80, h: 20 },
    ];
    this.guards = [
      { x: 200, y: 160, angle: 0, speed: 0.012, range: 110, fov: 0.9, patrolY: 160, amp: 80 },
      { x: 350, y: 400, angle: Math.PI, speed: 0.015, range: 100, fov: 0.8, patrolY: 400, amp: 70 },
      { x: 420, y: 280, angle: -Math.PI / 2, speed: 0.01, range: 90, fov: 0.7, patrolY: 280, amp: 60 },
    ];
    this.lights = [
      { x: 130, y: 80, range: 90 },
      { x: 380, y: 200, range: 80 },
      { x: 250, y: 600, range: 85 },
      { x: 420, y: 500, range: 70 },
    ];
  }

  isInLight(x: number, y: number) {
    for (const g of this.guards) {
      const d = dist(x, y, g.x, g.y);
      if (d < g.range) {
        const ang = Math.atan2(y - g.y, x - g.x);
        let diff = Math.abs(ang - g.angle);
        if (diff > Math.PI) diff = 2 * Math.PI - diff;
        if (diff < g.fov) return true;
      }
    }
    for (const l of this.lights) {
      if (dist(x, y, l.x, l.y) < l.range * 0.55) return true;
    }
    return false;
  }

  collidesWall(x: number, y: number, r = 10) {
    for (const w of this.walls) {
      if (x + r > w.x && x - r < w.x + w.w && y + r > w.y && y - r < w.y + w.h) return true;
    }
    return false;
  }

  update(ps: ParticleSystem) {
    const spd = this.speed * G.dt;
    let nx = this.px, ny = this.py;
    if (G.keys['ArrowLeft'] || G.keys['KeyA']) nx -= spd;
    if (G.keys['ArrowRight'] || G.keys['KeyD']) nx += spd;
    if (G.keys['ArrowUp'] || G.keys['KeyW']) ny -= spd;
    if (G.keys['ArrowDown'] || G.keys['KeyS']) ny += spd;
    nx = clamp(nx, 12, W - 12);
    ny = clamp(ny, 50, H - 30);
    if (!this.collidesWall(nx, this.py)) this.px = nx;
    if (!this.collidesWall(this.px, ny)) this.py = ny;

    for (const g of this.guards) {
      g.angle += g.speed * G.dt * 60;
      g.x = 200 + Math.cos(g.angle * 0.5) * 120;
      g.y = g.patrolY + Math.sin(g.angle) * g.amp;
    }

    const inLight = this.isInLight(this.px, this.py);
    if (inLight) {
      G.noise = Math.min(100, G.noise + 1.2 * G.dt * 60);
      this.alertTimer += G.dt * 60;
      if (this.alertTimer > 30) {
        sound.alert();
        this.alertTimer = 0;
      }
      ps.spawnTrail(this.px, this.py, '#ef4444');
    } else {
      G.noise = Math.max(0, G.noise - this.noiseDecay * G.dt * 60);
      this.alertTimer = 0;
    }

    if (!this.target.collected && dist(this.px, this.py, this.target.x, this.target.y) < 22) {
      this.target.collected = true;
      G.noise = Math.max(0, G.noise - 20);
      sound.collect();
      ps.spawnSparkle(this.target.x, this.target.y, '#f59e0b');
    }

    if (this.target.collected && this.px > W - 40 && this.py > H - 120) {
      this.done = true;
      sound.success();
    }

    this.stepTimer += G.dt * 60;
    if (this.stepTimer > 20 && (nx !== this.px || ny !== this.py)) {
      this.stepTimer = 0;
      sound.step();
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    // Ambient lights
    for (const l of this.lights) {
      const grd = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.range);
      grd.addColorStop(0, 'rgba(255,240,180,0.12)');
      grd.addColorStop(1, 'rgba(255,240,180,0)');
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(l.x, l.y, l.range, 0, Math.PI * 2); ctx.fill();
    }

    // Guard lights
    for (const g of this.guards) {
      ctx.save();
      ctx.translate(g.x, g.y);
      const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, g.range);
      grd.addColorStop(0, 'rgba(255,220,100,0.18)');
      grd.addColorStop(1, 'rgba(255,220,100,0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, g.range, g.angle - g.fov, g.angle + g.fov);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Walls
    ctx.fillStyle = '#1e1e2e';
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    for (const w of this.walls) {
      ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.strokeRect(w.x, w.y, w.w, w.h);
    }

    // Guards
    for (const g of this.guards) {
      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(Math.cos(g.angle) * 10, Math.sin(g.angle) * 10, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // Target
    if (!this.target.collected) {
      const pulse = Math.sin(Date.now() * 0.004) * 3;
      ctx.fillStyle = '#f59e0b';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 15 + pulse;
      ctx.fillRect(this.target.x - 10, this.target.y - 8, 20, 16);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('КЕЙС', this.target.x, this.target.y + 22);
    } else {
      ctx.fillStyle = '#10b981';
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 20;
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('[ ВЫХОД ]', W - 50, H - 80);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(W - 75, H - 110, 50, 40);
      ctx.setLineDash([]);
    }

    // Player
    const inLight = this.isInLight(this.px, this.py);
    ctx.save();
    ctx.translate(this.px, this.py);
    ctx.fillStyle = inLight ? '#ef4444' : PHASES[0].color;
    ctx.shadowColor = inLight ? '#ef4444' : PHASES[0].color;
    ctx.shadowBlur = inLight ? 22 : 12;
    ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.fillRect(-3, -3, 2.5, 2.5); ctx.fillRect(2, -3, 2.5, 2.5);
    ctx.restore();
  }
}

// ─── HACK PHASE ──────────────────────────────────────────────────────────────
class HackPhase {
  sequence: string[] = [];
  input: string[] = [];
  phase = 'show';
  timer = 0;
  showTime = 80;
  cursorBlink = 0;
  round = 0;
  maxRounds = 4;
  done = false;
  noiseDecay = 0.15;
  successFlash = 0;

  init() {
    this.round = 0;
    this.done = false;
    this.nextRound();
  }

  nextRound() {
    const len = 3 + this.round;
    this.sequence = [];
    const chars = 'ABCDEF0123456789';
    for (let i = 0; i < len; i++) this.sequence.push(chars[Math.floor(Math.random() * chars.length)]);
    this.input = [];
    this.phase = 'show';
    this.timer = 0;
    this.cursorBlink = 0;
  }

  onKey(key: string) {
    if (this.phase !== 'input') return;
    const valid = '0123456789ABCDEF';
    const k = key.toUpperCase();
    if (k === 'BACKSPACE') {
      if (this.input.length > 0) this.input.pop();
      sound.hackBeep();
      return;
    }
    if (valid.includes(k) && this.input.length < this.sequence.length) {
      this.input.push(k);
      sound.hackBeep();
      if (this.input.length === this.sequence.length) {
        const ok = this.input.every((c, i) => c === this.sequence[i]);
        if (ok) {
          this.phase = 'success';
          this.timer = 0;
          G.noise = Math.max(0, G.noise - 15);
          sound.success();
        } else {
          this.phase = 'fail';
          this.timer = 0;
          G.noise = Math.min(100, G.noise + 25);
          sound.hackError();
          G.shake = 8;
        }
      }
    }
  }

  update(_ps: ParticleSystem) {
    this.timer += G.dt * 60;
    this.cursorBlink += G.dt * 60;
    G.noise = Math.max(0, G.noise - this.noiseDecay * G.dt * 60);

    if (this.phase === 'show') {
      if (this.timer > this.showTime + this.sequence.length * 10) {
        this.phase = 'input';
        this.timer = 0;
      }
    } else if (this.phase === 'success') {
      this.successFlash += G.dt * 60;
      if (this.timer > 50) {
        this.round++;
        if (this.round >= this.maxRounds) {
          this.done = true;
          sound.success();
        } else this.nextRound();
      }
    } else if (this.phase === 'fail') {
      if (this.timer > 50) {
        this.input = [];
        this.phase = 'input';
        this.timer = 0;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    const c = ctx;
    const col = PHASES[1].color;

    c.fillStyle = '#080810';
    c.fillRect(0, 0, W, H);

    // Scanlines
    c.fillStyle = 'rgba(0,0,0,0.15)';
    for (let y = 0; y < H; y += 4) c.fillRect(0, y, W, 2);

    // Frame
    const fw = 360, fh = 420, fx = (W - fw) / 2, fy = (H - fh) / 2;
    c.strokeStyle = col;
    c.shadowColor = col;
    c.shadowBlur = this.phase === 'success' ? 30 : 15;
    c.lineWidth = 1;
    c.strokeRect(fx, fy, fw, fh);
    c.shadowBlur = 0;

    // Corners
    const corners = [[fx, fy], [fx + fw, fy], [fx, fy + fh], [fx + fw, fy + fh]];
    const signs = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
    c.strokeStyle = col; c.lineWidth = 2;
    corners.forEach(([cx, cy], i) => {
      const [sx, sy] = signs[i];
      c.strokeRect(cx - sx * 10, cy - sy * 10, sx * 20, sy * 20);
    });

    c.fillStyle = col;
    c.font = '11px monospace';
    c.textAlign = 'left';
    c.fillText('ВЗЛОМ СЕЙФА v2.1', fx + 16, fy + 24);
    c.fillStyle = 'rgba(255,255,255,0.3)';
    c.textAlign = 'right';
    c.fillText(`РАУНД ${this.round + 1}/${this.maxRounds}`, fx + fw - 16, fy + 24);

    const prog = this.round / this.maxRounds;
    c.fillStyle = 'rgba(255,255,255,0.1)';
    c.fillRect(fx + 16, fy + 35, fw - 32, 3);
    c.fillStyle = col;
    c.fillRect(fx + 16, fy + 35, (fw - 32) * prog, 3);

    const sy2 = fy + 100;
    c.textAlign = 'center';

    if (this.phase === 'show') {
      c.fillStyle = 'rgba(255,255,255,0.4)';
      c.font = '11px monospace';
      c.fillText('ЗАПОМНИ ПОСЛЕДОВАТЕЛЬНОСТЬ', W / 2, sy2 - 30);

      c.font = 'bold 36px monospace';
      const showCount = Math.max(0, Math.floor((this.timer - 20) / 10));
      this.sequence.forEach((ch, i) => {
        const revealed = i <= showCount;
        c.fillStyle = revealed ? col : 'rgba(255,255,255,0.15)';
        c.shadowColor = col;
        c.shadowBlur = revealed ? 15 : 0;
        c.fillText(ch, fx + 50 + i * ((fw - 40) / this.sequence.length), sy2 + 20);
      });
      c.shadowBlur = 0;
    } else if (this.phase === 'input' || this.phase === 'fail') {
      c.font = 'bold 36px monospace';
      this.sequence.forEach((_, i) => {
        c.fillStyle = 'rgba(255,255,255,0.08)';
        c.fillText('?', fx + 50 + i * ((fw - 40) / this.sequence.length), sy2 + 20);
      });

      c.fillStyle = 'rgba(255,255,255,0.4)';
      c.font = '11px monospace';
      c.fillText('ВВОДИ:', W / 2, sy2 + 70);

      this.sequence.forEach((expected, i) => {
        const entered = this.input[i];
        const isWrong = this.phase === 'fail' && entered && entered !== expected;
        c.font = 'bold 36px monospace';
        c.shadowBlur = 0;

        if (entered) {
          c.fillStyle = isWrong ? '#ef4444' : '#fff';
          c.shadowColor = isWrong ? '#ef4444' : '#fff';
          c.shadowBlur = isWrong ? 15 : 8;
          c.fillText(entered, fx + 50 + i * ((fw - 40) / this.sequence.length), sy2 + 110);
        } else if (i === this.input.length && Math.floor(this.cursorBlink / 20) % 2 === 0) {
          c.fillStyle = col;
          c.fillText('_', fx + 50 + i * ((fw - 40) / this.sequence.length), sy2 + 110);
        } else {
          c.fillStyle = 'rgba(255,255,255,0.15)';
          c.fillText('_', fx + 50 + i * ((fw - 40) / this.sequence.length), sy2 + 110);
        }
        c.shadowBlur = 0;
      });

      if (this.phase === 'fail') {
        c.fillStyle = '#ef4444';
        c.font = '12px monospace';
        c.fillText('ОШИБКА — ПОВТОР', W / 2, sy2 + 150);
      }
    } else if (this.phase === 'success') {
      c.fillStyle = '#10b981';
      c.shadowColor = '#10b981';
      c.shadowBlur = 20;
      c.font = 'bold 28px monospace';
      c.fillText('ВЗЛОМАНО', W / 2, sy2 + 60);
      c.shadowBlur = 0;
    }

    c.fillStyle = 'rgba(255,255,255,0.2)';
    c.font = '10px monospace';
    c.textAlign = 'center';
    c.fillText('[ 0-9 A-F BACKSPACE ]', W / 2, fy + fh - 20);
  }
}

// ─── CHASE PHASE ─────────────────────────────────────────────────────────────
class ChasePhase {
  px = W / 2;
  py = H - 80;
  speed = 4.5;
  cops: { x: number; y: number; speed: number; flashTimer: number }[] = [];
  obstacles: { x: number; y: number; w: number; h: number }[] = [];
  scrollY = 0;
  dist = 0;
  distNeeded = 800;
  spawnTimer = 0;
  done = false;
  noiseDecay = 0;
  sirenTimer = 0;

  init() {
    this.px = W / 2; this.py = H - 80;
    this.scrollY = 0; this.dist = 0;
    this.cops = []; this.obstacles = [];
    this.done = false; this.spawnTimer = 0;
    for (let i = 0; i < 3; i++) {
      this.cops.push({ x: rnd(60, W - 60), y: -100 - i * 80, speed: rnd(2.8, 3.6), flashTimer: 0 });
    }
    this.spawnObstacles();
  }

  spawnObstacles() {
    for (let i = 0; i < 14; i++) {
      this.obstacles.push({
        x: rnd(30, W - 70),
        y: -200 - i * rnd(80, 140),
        w: rnd(40, 120), h: 14
      });
    }
  }

  update(ps: ParticleSystem) {
    const spd = this.speed * G.dt;
    let nx = this.px, ny = this.py;
    if (G.keys['ArrowLeft'] || G.keys['KeyA']) nx -= spd * 1.4;
    if (G.keys['ArrowRight'] || G.keys['KeyD']) nx += spd * 1.4;
    if (G.keys['ArrowUp'] || G.keys['KeyW']) ny -= spd;
    if (G.keys['ArrowDown'] || G.keys['KeyS']) ny += spd * 0.6;
    nx = clamp(nx, 16, W - 16);
    ny = clamp(ny, H * 0.4, H - 20);

    let blocked = false;
    for (const ob of this.obstacles) {
      const worldY = ob.y + this.scrollY;
      if (nx + 10 > ob.x && nx - 10 < ob.x + ob.w && ny + 10 > worldY && ny - 10 < worldY + ob.h) blocked = true;
    }
    if (!blocked) { this.px = nx; this.py = ny; }

    this.scrollY += spd * 1.8;
    this.dist += spd * 1.8;

    this.sirenTimer += G.dt * 60;
    if (this.sirenTimer > 60) {
      sound.alert();
      this.sirenTimer = 0;
    }

    for (const cop of this.cops) {
      const dx = this.px - cop.x;
      const dy = (this.py) - (cop.y + this.scrollY);
      const d = Math.hypot(dx, dy) || 1;
      cop.x += (dx / d) * cop.speed * G.dt * 0.8;
      cop.y += spd * 1.5 * G.dt;
      cop.flashTimer += G.dt * 60;

      if (dist(this.px, this.py, cop.x, cop.y + this.scrollY) < 18) {
        G.noise = Math.min(100, G.noise + 2.5 * G.dt * 60);
        G.shake = 4;
        ps.spawnTrail(this.px, this.py, '#ef4444');
      }
    }

    this.spawnTimer += G.dt * 60;
    if (this.spawnTimer > 120) {
      this.spawnTimer = 0;
      this.cops.push({ x: rnd(40, W - 40), y: -50 - this.scrollY, speed: rnd(3, 4), flashTimer: 0 });
    }

    G.noise = Math.max(0, G.noise - 0.05 * G.dt * 60);

    if (this.dist >= this.distNeeded) {
      this.done = true;
      sound.success();
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    const c = ctx;
    const col = PHASES[2].color;

    c.fillStyle = '#111118';
    c.fillRect(0, 0, W, H);

    // Road lines
    c.strokeStyle = 'rgba(255,255,255,0.06)';
    c.lineWidth = 2; c.setLineDash([30, 20]);
    c.beginPath(); c.moveTo(W / 2, 0); c.lineTo(W / 2, H); c.stroke();
    c.setLineDash([]);

    // Road borders
    c.fillStyle = '#1a1a28';
    c.fillRect(0, 0, 25, H); c.fillRect(W - 25, 0, 25, H);

    // Obstacles
    for (const ob of this.obstacles) {
      const wy = ob.y + this.scrollY;
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

    // Progress
    const prog = this.dist / this.distNeeded;
    c.fillStyle = 'rgba(255,255,255,0.08)';
    c.fillRect(W - 20, H - 20 - H * 0.7, 6, H * 0.7);
    c.fillStyle = col;
    c.shadowColor = col; c.shadowBlur = 10;
    c.fillRect(W - 20, H - 20 - H * 0.7 * prog, 6, H * 0.7 * prog);
    c.shadowBlur = 0;
    c.fillStyle = 'rgba(255,255,255,0.4)';
    c.font = '9px monospace';
    c.textAlign = 'right';
    c.fillText('ДИСТАНЦИЯ', W - 24, H - 24);

    // Cops
    for (const cop of this.cops) {
      const cy = cop.y + this.scrollY;
      if (cy < -30 || cy > H + 30) continue;
      c.save();
      c.translate(cop.x, cy);
      c.fillStyle = '#ef4444';
      c.shadowColor = '#ef4444'; c.shadowBlur = 12;
      c.fillRect(-12, -18, 24, 36);
      c.fillStyle = '#fff';
      c.shadowBlur = 0;
      c.fillRect(-8, -14, 16, 10);
      const flashPhase = Math.floor(cop.flashTimer / 10) % 2;
      if (flashPhase === 0) {
        c.fillStyle = '#60a5fa';
        c.fillRect(-6, -22, 6, 6);
      } else {
        c.fillStyle = '#ef4444';
        c.fillRect(0, -22, 6, 6);
      }
      c.restore();
    }

    // Player
    c.save();
    c.translate(this.px, this.py);
    c.fillStyle = '#fff';
    c.shadowColor = '#fff'; c.shadowBlur = 10;
    c.fillRect(-11, -20, 22, 40);
    c.fillStyle = '#111';
    c.shadowBlur = 0;
    c.fillRect(-7, -16, 14, 12);
    c.fillStyle = '#f59e0b';
    c.fillRect(-11, -22, 22, 4);
    c.restore();
  }
}

// ─── SHOOTER PHASE ───────────────────────────────────────────────────────────
class ShooterPhase {
  px = W / 2;
  py = H - 100;
  cover: { x: number; y: number; w: number; h: number }[] = [];
  enemies: { x: number; y: number; hp: number; shootTimer: number; moveTimer: number; vx: number }[] = [];
  bullets: { x: number; y: number; vx: number; vy: number; life: number }[] = [];
  eBullets: { x: number; y: number; vx: number; vy: number; life: number }[] = [];
  kills = 0;
  killsNeeded = 8;
  shootTimer = 0;
  done = false;
  noiseDecay = 0.05;
  recoil = 0;

  init() {
    this.px = W / 2; this.py = H - 100;
    this.bullets = []; this.eBullets = [];
    this.kills = 0;
    this.shootTimer = 0; this.done = false;
    this.recoil = 0;

    this.cover = [
      { x: 60, y: H - 200, w: 80, h: 20 },
      { x: 200, y: H - 300, w: 80, h: 20 },
      { x: 340, y: H - 200, w: 80, h: 20 },
      { x: 120, y: H - 400, w: 60, h: 20 },
      { x: 300, y: H - 420, w: 70, h: 20 },
    ];

    this.enemies = [];
    this._spawnWave(4);
  }

  _spawnWave(count: number) {
    for (let i = 0; i < count; i++) {
      this.enemies.push({
        x: rnd(60, W - 60),
        y: rnd(80, H - 350),
        hp: 2,
        shootTimer: Math.floor(rnd(30, 90)),
        moveTimer: 0,
        vx: rnd(-1, 1)
      });
    }
  }

  isBehindCover(x: number, y: number) {
    for (const cov of this.cover) {
      if (x > cov.x && x < cov.x + cov.w && y > cov.y - 20 && y < cov.y + cov.h + 10) return true;
    }
    return false;
  }

  update(ps: ParticleSystem) {
    const spd = 4 * G.dt;
    let nx = this.px, ny = this.py;
    if (G.keys['ArrowLeft'] || G.keys['KeyA']) nx -= spd * 1.5;
    if (G.keys['ArrowRight'] || G.keys['KeyD']) nx += spd * 1.5;
    if (G.keys['ArrowUp'] || G.keys['KeyW']) ny -= spd;
    if (G.keys['ArrowDown'] || G.keys['KeyS']) ny += spd;
    this.px = clamp(nx, 16, W - 16);
    this.py = clamp(ny, H * 0.3, H - 20);

    this.shootTimer += G.dt * 60;
    this.recoil = Math.max(0, this.recoil - G.dt * 60 * 0.3);

    if ((G.keys['Space'] || G.keys['KeyE']) && this.shootTimer > 12) {
      this.shootTimer = 0;
      this.recoil = 6;
      let nearest = null, nd = Infinity;
      for (const e of this.enemies) {
        const d = dist(this.px, this.py, e.x, e.y);
        if (d < nd) { nd = d; nearest = e; }
      }
      if (nearest) {
        const dx = nearest.x - this.px, dy = nearest.y - this.py, len = Math.hypot(dx, dy) || 1;
        this.bullets.push({ x: this.px, y: this.py, vx: dx / len * 14, vy: dy / len * 14, life: 60 });
        sound.shoot();
        ps.spawnTrail(this.px, this.py, '#fff');
      }
    }

    for (const b of this.bullets) {
      b.x += b.vx * G.dt * 3; b.y += b.vy * G.dt * 3; b.life--;
    }
    this.bullets = this.bullets.filter(b => b.life > 0);

    for (const e of this.enemies) {
      e.moveTimer += G.dt * 60;
      if (e.moveTimer > 60) { e.moveTimer = 0; e.vx = rnd(-2, 2); }
      e.x = clamp(e.x + e.vx * G.dt * 1.5, 30, W - 30);

      e.shootTimer -= G.dt * 60;
      if (e.shootTimer <= 0) {
        e.shootTimer = rnd(50, 120);
        const dx = this.px - e.x, dy = this.py - e.y, len = Math.hypot(dx, dy) || 1;
        this.eBullets.push({ x: e.x, y: e.y, vx: dx / len * 5, vy: dy / len * 5, life: 80 });
      }

      for (const b of this.bullets) {
        if (b.life > 0 && dist(b.x, b.y, e.x, e.y) < 14) {
          e.hp--;
          b.life = 0;
          ps.spawnSparkle(e.x, e.y, '#ef4444');
          sound.hit();
        }
      }
    }

    const prevCount = this.enemies.length;
    this.enemies = this.enemies.filter(e => e.hp > 0);
    const killed = prevCount - this.enemies.length;
    this.kills += killed;
    for (let i = 0; i < killed; i++) {
      ps.spawnExplosion(this.px + rnd(-50, 50), this.py + rnd(-50, 50), '#ef4444', 15);
    }

    for (const b of this.eBullets) {
      b.x += b.vx * G.dt * 3; b.y += b.vy * G.dt * 3; b.life--;
      if (dist(b.x, b.y, this.px, this.py) < 12) {
        G.noise = Math.min(100, G.noise + 20);
        G.shake = 6;
        b.life = 0;
        ps.spawnExplosion(this.px, this.py, '#ef4444', 10);
        sound.hit();
      }
    }
    this.eBullets = this.eBullets.filter(b => b.life > 0);

    const inCover = this.isBehindCover(this.px, this.py);
    G.noise = Math.max(0, G.noise - (inCover ? 0.3 : this.noiseDecay) * G.dt * 60);

    if (this.enemies.length === 0 && this.kills < this.killsNeeded) {
      this._spawnWave(3);
    }

    if (this.kills >= this.killsNeeded) {
      this.done = true;
      sound.success();
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    const c = ctx;
    const col = PHASES[3].color;

    c.fillStyle = '#0c0c10';
    c.fillRect(0, 0, W, H);

    // Cover
    for (const cov of this.cover) {
      c.fillStyle = '#2a2a3e';
      c.strokeStyle = 'rgba(255,255,255,0.2)';
      c.lineWidth = 1;
      c.fillRect(cov.x, cov.y, cov.w, cov.h);
      c.strokeRect(cov.x, cov.y, cov.w, cov.h);
    }

    // Enemies
    for (const e of this.enemies) {
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

    // Enemy bullets
    c.fillStyle = '#ef4444';
    c.shadowColor = '#ef4444'; c.shadowBlur = 6;
    for (const b of this.eBullets) {
      c.beginPath(); c.arc(b.x, b.y, 3, 0, Math.PI * 2); c.fill();
    }

    // Player bullets
    c.fillStyle = '#fff'; c.shadowColor = '#fff'; c.shadowBlur = 8;
    for (const b of this.bullets) {
      c.beginPath(); c.arc(b.x, b.y, 4, 0, Math.PI * 2); c.fill();
    }
    c.shadowBlur = 0;

    // Player
    const inCov = this.isBehindCover(this.px, this.py);
    c.save();
    c.translate(this.px, this.py + this.recoil);
    c.fillStyle = inCov ? '#10b981' : col;
    c.shadowColor = inCov ? '#10b981' : col; c.shadowBlur = 15;
    c.beginPath(); c.arc(0, 0, 11, 0, Math.PI * 2); c.fill();
    c.shadowBlur = 0;
    c.fillStyle = '#fff';
    c.fillRect(-3, -3, 3, 3); c.fillRect(2, -3, 3, 3);
    c.restore();

    // HUD
    c.fillStyle = 'rgba(255,255,255,0.6)';
    c.font = '11px monospace'; c.textAlign = 'left';
    c.fillText(`ЦЕЛИ: ${this.kills}/${this.killsNeeded}`, 18, H - 18);
    c.fillStyle = 'rgba(255,255,255,0.3)';
    c.font = '10px monospace';
    c.fillText(inCov ? '[ В УКРЫТИИ ]' : '[ НА ВИДУ ]', 18, H - 34);
    c.fillStyle = 'rgba(255,255,255,0.3)'; c.textAlign = 'right';
    c.fillText('SPACE — огонь', W - 18, H - 18);
  }
}

// ─── ESCAPE PHASE ────────────────────────────────────────────────────────────
class EscapePhase {
  px = 40;
  py = H / 2;
  vy = 0;
  onGround = false;
  platforms: { x: number; y: number; w: number; h: number }[] = [];
  hazards: { x: number; y: number; r: number }[] = [];
  scrollX = 0;
  distX = 0;
  distNeeded = 1200;
  done = false;
  jumpPressed = false;
  noiseDecay = 0.06;
  stepTimer = 0;

  init() {
    this.px = 40; this.py = H / 2; this.vy = 0;
    this.scrollX = 0; this.distX = 0; this.done = false;
    this.onGround = false; this.jumpPressed = false;
    this.generateWorld();
  }

  generateWorld() {
    this.platforms = [];
    this.hazards = [];
    this.platforms.push({ x: 0, y: H - 40, w: W * 10, h: 40 });

    let cx = 200, cy = H - 120;
    for (let i = 0; i < 35; i++) {
      const pw = rnd(60, 140);
      this.platforms.push({ x: cx, y: cy, w: pw, h: 14 });
      if (Math.random() < 0.35) this.hazards.push({ x: cx + pw / 2, y: cy - 20, r: 8 });
      cx += rnd(100, 180);
      cy = clamp(cy + rnd(-80, 80), H - 380, H - 80);
    }
  }

  update(ps: ParticleSystem) {
    if ((G.keys['ArrowUp'] || G.keys['KeyW'] || G.keys['Space']) && this.onGround && !this.jumpPressed) {
      this.vy = -9.5;
      this.onGround = false;
      this.jumpPressed = true;
      sound.jump();
      ps.spawnSparkle(this.px, this.py + 10, '#10b981');
    }
    if (!(G.keys['ArrowUp'] || G.keys['KeyW'] || G.keys['Space'])) this.jumpPressed = false;

    this.vy += 0.45 * G.dt;
    this.vy = clamp(this.vy, -12, 14);

    let vx = 4.2 * G.dt;
    if (G.keys['ArrowRight'] || G.keys['KeyD']) vx = 5.5 * G.dt;
    if (G.keys['ArrowLeft'] || G.keys['KeyA']) vx = 2.0 * G.dt;

    let nx = this.px + vx;
    let ny = this.py + this.vy * G.dt;
    this.onGround = false;

    for (const p of this.platforms) {
      const wx = p.x - this.scrollX;
      if (nx + 10 > wx && nx - 10 < wx + p.w) {
        if (this.py + 12 <= p.y && ny + 12 >= p.y) {
          ny = p.y - 12; this.vy = 0; this.onGround = true;
        }
      }
    }

    this.px = nx;
    this.py = ny;

    if (this.px > W * 0.4) {
      const excess = this.px - W * 0.4;
      this.scrollX += excess;
      this.distX += excess;
      this.px = W * 0.4;
    }

    for (const h of this.hazards) {
      const hx = h.x - this.scrollX;
      if (dist(this.px, this.py, hx, h.y) < h.r + 10) {
        G.noise = Math.min(100, G.noise + 18);
        G.shake = 5;
        ps.spawnExplosion(this.px, this.py, '#ef4444', 8);
        sound.hit();
      }
    }

    if (this.py > H + 50) {
      G.noise = Math.min(100, G.noise + 30);
      this.py = H / 2; this.vy = 0;
      sound.fail();
    }

    G.noise = Math.max(0, G.noise - this.noiseDecay * G.dt * 60);

    if (this.distX >= this.distNeeded) {
      this.done = true;
      sound.victory();
    }

    this.stepTimer += G.dt * 60;
    if (this.onGround && this.stepTimer > 12) {
      this.stepTimer = 0;
      sound.step();
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    const c = ctx;
    const col = PHASES[4].color;

    const sky = c.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#0a1628');
    sky.addColorStop(1, '#1a0a28');
    c.fillStyle = sky; c.fillRect(0, 0, W, H);

    // City silhouette
    c.fillStyle = '#0f0f1a';
    for (let i = 0; i < 15; i++) {
      const bw = 30 + Math.sin(i * 1.7) * 20;
      const bh = 80 + Math.sin(i * 2.3) * 60;
      const bx = ((i * 70 - this.scrollX * 0.08) % (W + 100) + (W + 100)) % (W + 100) - 50;
      c.fillRect(bx, H - bh - 40, bw, bh + 40);
    }

    // Platforms
    for (const p of this.platforms) {
      const wx = p.x - this.scrollX;
      if (wx > W + 20 || wx + p.w < -20) continue;
      c.fillStyle = p.h > 20 ? '#1a1a2e' : '#334155';
      c.strokeStyle = 'rgba(255,255,255,0.15)';
      c.lineWidth = 1;
      c.fillRect(wx, p.y, p.w, p.h);
      if (p.h <= 20) c.strokeRect(wx, p.y, p.w, p.h);
    }

    // Hazards
    for (const h of this.hazards) {
      const hx = h.x - this.scrollX;
      if (hx < -20 || hx > W + 20) continue;
      const pulse = Math.sin(Date.now() * 0.005) * 2;
      c.fillStyle = '#ef4444';
      c.shadowColor = '#ef4444'; c.shadowBlur = 12 + pulse;
      c.beginPath(); c.arc(hx, h.y, h.r, 0, Math.PI * 2); c.fill();
      c.shadowBlur = 0;
    }

    // Progress
    const prog = this.distX / this.distNeeded;
    c.fillStyle = 'rgba(255,255,255,0.06)';
    c.fillRect(16, H - 16, W - 32, 3);
    c.fillStyle = col; c.shadowColor = col; c.shadowBlur = 8;
    c.fillRect(16, H - 16, (W - 32) * prog, 3);
    c.shadowBlur = 0;

    // Player
    c.save();
    c.translate(this.px, this.py);
    c.fillStyle = col;
    c.shadowColor = col; c.shadowBlur = 15;
    c.fillRect(-10, -14, 20, 28);
    c.shadowBlur = 0;
    c.fillStyle = '#fff';
    c.fillRect(-4, -8, 4, 4); c.fillRect(2, -8, 4, 4);
    const legPhase = this.onGround ? Math.sin(Date.now() * 0.015) * 5 : 0;
    c.fillStyle = col;
    c.fillRect(-6, 14, 6, 8 + legPhase);
    c.fillRect(2, 14, 6, 8 - legPhase);
    c.restore();

    c.fillStyle = 'rgba(255,255,255,0.25)';
    c.font = '10px monospace'; c.textAlign = 'right';
    c.fillText('↑ ПРЫЖОК', W - 18, H - 22);
  }
}

// ─── GAME ENGINE ───────────────────────────────────────────────────────────
export class GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  ps = new ParticleSystem();
  stealth = new StealthPhase();
  hack = new HackPhase();
  chase = new ChasePhase();
  shooter = new ShooterPhase();
  escape = new EscapePhase();
  phases = [this.stealth, this.hack, this.chase, this.shooter, this.escape];
  onPhaseChange?: (phase: number) => void;
  onFail?: () => void;
  onVictory?: (time: number, phaseTimes: number[]) => void;
  onNoiseChange?: (noise: number) => void;
  startTime = 0;
  phaseStartTime = 0;
  phaseTimes: number[] = [0, 0, 0, 0, 0];
  active = false;
  gameLoopId = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  start() {
    sound.init();
    G.phase = 0;
    G.noise = 0;
    G.running = true;
    G.paused = false;
    G.dt = 0;
    G.lastTime = 0;
    G.shake = 0;
    G.screenFlash = 0;
    G.combo = 0;
    G.score = 0;
    G.invulnerable = 120;
    this.phaseTimes = [0, 0, 0, 0, 0];
    this.startTime = performance.now();
    this.phaseStartTime = this.startTime;
    this.active = true;
    this.ps.particles = [];
    for (const p of this.phases) p.init();
    this.gameLoopId = requestAnimationFrame((ts) => this.loop(ts));
  }

  stop() {
    this.active = false;
    cancelAnimationFrame(this.gameLoopId);
  }

  pause() {
    G.paused = true;
  }

  resume() {
    G.paused = false;
    G.lastTime = 0;
  }

  handleKey(code: string, key: string, down: boolean) {
    if (G.phase === 1 && down && G.running) {
      if (code === 'Backspace') this.hack.onKey('BACKSPACE');
      else this.hack.onKey(key);
    }
  }

  transitionTo(phaseIdx: number) {
    G.running = false;
    G.invulnerable = 90;
    this.onPhaseChange?.(phaseIdx);
    setTimeout(() => {
      G.phase = phaseIdx;
      this.phases[phaseIdx].init();
      G.noise = 0;
      G.invulnerable = 90;
      this.phaseStartTime = performance.now();
      G.running = true;
      sound.phaseTransition();
    }, 1500);
  }

  fail() {
    G.running = false;
    this.onFail?.();
  }

  victory() {
    G.running = false;
    const total = Math.floor((performance.now() - this.startTime) / 1000);
    this.onVictory?.(total, this.phaseTimes);
  }

  loop(ts: number) {
    if (!this.active) return;
    this.gameLoopId = requestAnimationFrame((t) => this.loop(t));
    if (!G.lastTime) G.lastTime = ts;
    G.dt = Math.min((ts - G.lastTime) / 1000, 0.05);
    G.lastTime = ts;

    if (!G.running || G.paused) {
      this.drawOverlay();
      return;
    }

    const phase = this.phases[G.phase];
    phase.update(this.ps);
    this.ps.update();

    // Shake decay
    G.shake = Math.max(0, G.shake - G.dt * 60 * 0.5);
    G.screenFlash = Math.max(0, G.screenFlash - G.dt * 60 * 0.1);

    // Track phase time
    this.phaseTimes[G.phase] = Math.floor((ts - this.phaseStartTime) / 1000);

    this.onNoiseChange?.(G.noise);

    // Draw
    this.ctx.save();
    if (G.shake > 0) {
      const sx = (Math.random() - 0.5) * G.shake;
      const sy = (Math.random() - 0.5) * G.shake;
      this.ctx.translate(sx, sy);
    }

    phase.draw(this.ctx);
    this.ps.draw(this.ctx);

    // Noise flash overlay
    if (G.noise > 50) {
      this.ctx.fillStyle = `rgba(239, 68, 68, ${(G.noise - 50) / 150})`;
      this.ctx.fillRect(0, 0, W, H);
    }

    this.ctx.restore();

    if (G.invulnerable > 0) {
      G.invulnerable = Math.max(0, G.invulnerable - G.dt * 60);
    }

    if (G.noise >= 100 && G.invulnerable <= 0) {
      this.fail();
      return;
    }

    if (phase.done) {
      phase.done = false;
      if (G.phase < 4) this.transitionTo(G.phase + 1);
      else this.victory();
    }
  }

  drawOverlay() {
    // Draw last frame + pause overlay
    this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
    this.ctx.fillRect(0, 0, W, H);
    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 24px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('ПАУЗА', W / 2, H / 2);
  }
}

export function resetGameState() {
  G.phase = 0;
  G.noise = 0;
  G.running = false;
  G.paused = false;
  G.dt = 0;
  G.lastTime = 0;
  G.rafId = 0;
  G.shake = 0;
  G.screenFlash = 0;
  G.combo = 0;
  G.score = 0;
  G.invulnerable = 120;
  G.keys = {};
}
