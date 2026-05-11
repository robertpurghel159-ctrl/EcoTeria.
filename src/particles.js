export class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  spawnText(x, y, text, color) {
    this.particles.push({
      type: 'text',
      x, y, text, color,
      life: 1.0,
      maxLife: 1.0,
      vx: (Math.random() - 0.5) * 50,
      vy: -100 - Math.random() * 50
    });
  }

  spawnSparks(x, y, color, count = 10) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        type: 'spark',
        x, y, color,
        life: 0.5 + Math.random() * 0.5,
        maxLife: 1.0,
        vx: (Math.random() - 0.5) * 200,
        vy: (Math.random() - 0.5) * 200,
        size: Math.random() * 4 + 2
      });
    }
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Gravity/friction
      if (p.type === 'spark') {
        p.vx *= 0.95;
        p.vy *= 0.95;
      }
    }
  }

  render(ctx, offsetX, offsetY) {
    ctx.save();
    ctx.translate(offsetX, offsetY);

    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;

      if (p.type === 'text') {
        ctx.fillStyle = p.color;
        ctx.font = 'bold 20px "Press Start 2P", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(p.text, p.x, p.y);
      } else if (p.type === 'spark') {
        ctx.fillStyle = p.color;
        // Draw crisp 4x4 square instead of circle
        ctx.fillRect(Math.floor(p.x - p.size/2), Math.floor(p.y - p.size/2), p.size, p.size);
      }
    }

    ctx.restore();
  }
}

export const particles = new ParticleSystem();
