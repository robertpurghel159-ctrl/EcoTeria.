import { MapLayout } from './zones.js';

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 15;
    this.speed = 250; // pixels per second

    this.keys = {
      w: false,
      a: false,
      s: false,
      d: false,
    };

    this.initEventListeners();
  }

  initEventListeners() {
    document.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright'].includes(key)) {
        if (key === 'arrowup') this.keys['w'] = true;
        else if (key === 'arrowleft') this.keys['a'] = true;
        else if (key === 'arrowdown') this.keys['s'] = true;
        else if (key === 'arrowright') this.keys['d'] = true;
        else this.keys[key] = true;
      }
    });

    document.addEventListener('keyup', (e) => {
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright'].includes(key)) {
        if (key === 'arrowup') this.keys['w'] = false;
        else if (key === 'arrowleft') this.keys['a'] = false;
        else if (key === 'arrowdown') this.keys['s'] = false;
        else if (key === 'arrowright') this.keys['d'] = false;
        else this.keys[key] = false;
      }
    });
  }

  update(dt, isPaused) {
    if (isPaused) return;

    let dx = 0;
    let dy = 0;

    if (this.keys.w) dy -= 1;
    if (this.keys.s) dy += 1;
    if (this.keys.a) dx -= 1;
    if (this.keys.d) dx += 1;

    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
      const length = Math.sqrt(dx * dx + dy * dy);
      dx /= length;
      dy /= length;
    }

    this.x += dx * this.speed * dt;
    this.y += dy * this.speed * dt;

    if (dx !== 0 || dy !== 0) {
      this.walkAnimTime = (this.walkAnimTime || 0) + dt * 20;
    } else {
      this.walkAnimTime = 0; // Reset when standing still
    }

    // Clamp to map boundaries
    if (this.x < this.radius) this.x = this.radius;
    if (this.x > MapLayout.width - this.radius) this.x = MapLayout.width - this.radius;
    if (this.y < this.radius) this.y = this.radius;
    if (this.y > MapLayout.height - this.radius) this.y = MapLayout.height - this.radius;
  }
}
