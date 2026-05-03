import type { Particle } from './types';

export class ParticleSystem {
  particles: Particle[] = [];

  spawn(
    x: number,
    y: number,
    count: number,
    color: string,
    speed: number = 3,
    size: number = 3,
    life: number = 40
  ) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = Math.random() * speed + 1;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life,
        maxLife: life,
        color,
        size: Math.random() * size + 1,
      });
    }
  }

  spawnExplosion(x: number, y: number, color: string = '#ef4444', count = 20) {
    this.spawn(x, y, count, color, 5, 4, 50);
  }

  spawnSparkle(x: number, y: number, color: string = '#f59e0b') {
    this.spawn(x, y, 8, color, 2, 2, 25);
  }

  spawnTrail(x: number, y: number, color: string) {
    if (Math.random() < 0.3) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 6,
        y: y + (Math.random() - 0.5) * 6,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        life: 20,
        maxLife: 20,
        color,
        size: Math.random() * 2 + 1,
      });
    }
  }

  update() {
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.life--;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  draw(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
