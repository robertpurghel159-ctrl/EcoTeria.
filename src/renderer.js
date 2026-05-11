import { MapLayout, Zones, Decor } from './zones.js';
import { Sprites } from './sprites.js';

export class Renderer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.cameraX = 0;
    this.cameraY = 0;
    
    // Resize to fit window
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    // Must re-disable smoothing after resize
    this.ctx.imageSmoothingEnabled = false;
  }

  render(player, npcs, timeNow) {
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false; // Guarantee crisp pixels
    
    const width = this.canvas.width;
    const height = this.canvas.height;

    // Camera Deadzone Logic
    const targetCamX = (width / 2) - player.x;
    const targetCamY = (height / 2) - player.y;

    // If map is smaller than screen, lock to center.
    if (MapLayout.width <= width && MapLayout.height <= height) {
      this.cameraX = (width - MapLayout.width) / 2;
      this.cameraY = (height - MapLayout.height) / 2;
    } else {
      // Smooth lerp camera
      this.cameraX += (targetCamX - this.cameraX) * 0.1;
      this.cameraY += (targetCamY - this.cameraY) * 0.1;
      
      // Clamp camera to map bounds
      if (this.cameraX > 0) this.cameraX = 0;
      if (this.cameraY > 0) this.cameraY = 0;
      if (this.cameraX < width - MapLayout.width) this.cameraX = width - MapLayout.width;
      if (this.cameraY < height - MapLayout.height) this.cameraY = height - MapLayout.height;
    }

    const offsetX = this.cameraX;
    const offsetY = this.cameraY;

    // Clear background
    ctx.fillStyle = '#0F172A'; // Darker Slate
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(offsetX, offsetY);

    // Draw Base Floor (Checkered)
    const tileSize = 64; 
    for (let x = 0; x < MapLayout.width; x += tileSize) {
      for (let y = 0; y < MapLayout.height; y += tileSize) {
        ctx.drawImage(Sprites.floors.checkered, x, y, tileSize, tileSize);
      }
    }

    // Draw Zone Labels & Backgrounds (Raised Platforms)
    for (const zone of Zones) {
      if (!zone.color) continue;
      
      // Pulsing glow for areas
      const glow = Math.sin(timeNow / 300) * 0.1 + 0.9; // Less variance, higher base
      ctx.globalAlpha = glow;
      
      // Shadow to make the zone pop out
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 15;
      ctx.shadowOffsetY = 10;
      
      // Colored floor background
      ctx.fillStyle = zone.color;
      ctx.fillRect(zone.x, zone.y, zone.width, zone.height);
      
      // Clear shadow for border and text
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      
      // Clean arcade border
      ctx.lineWidth = 3;
      ctx.strokeStyle = zone.color.replace(/[\d.]+\)$/g, '1.0)'); // Make border solid version of color
      ctx.strokeRect(zone.x, zone.y, zone.width, zone.height);
      
      ctx.globalAlpha = 1.0;

      // Draw Zone Name directly above zone
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px "Press Start 2P", sans-serif';
      ctx.textAlign = 'center';
      
      // Add text shadow for readability
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 2;
      ctx.fillText(zone.name, zone.x + zone.width / 2, zone.y + 40);
      
      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
    }

    // --- Y-SORTING RENDER QUEUE ---
    // We put all props, player, and npcs into an array and sort by their bottom Y coordinate.
    const renderables = [];

    // 1. Decor (Props)
    for (const d of Decor) {
      renderables.push({
        ySort: d.y + d.height, // Bottom edge of prop
        render: () => {
          // Hard shadow
          ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
          ctx.beginPath();
          ctx.ellipse(d.x + d.width/2, d.y + d.height - 10, d.width/2, 10, 0, 0, Math.PI * 2);
          ctx.fill();

          const propSprite = Sprites.props[d.type] || Sprites.props.table;
          ctx.drawImage(propSprite, d.x, d.y, d.width, d.height);
        }
      });
    }

    // 2. Player
    renderables.push({
      ySort: player.y + 30, // Bottom edge of player
      render: () => {
        // Hard pixel shadow oval
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(player.x, player.y + 10, 22, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // Soft glow around player
        ctx.save();
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetY = 0;

        // Player Bobbing
        const bob = player.walkAnimTime > 0 ? Math.sin(timeNow / 100) * 4 : 0;

        let sprite = Sprites.player.idle;
        if (player.walkAnimTime > 0) {
          const frame = Math.floor(timeNow / 150) % 4;
          if (frame === 0 || frame === 2) sprite = Sprites.player.idle;
          else if (frame === 1) sprite = Sprites.player.walk1;
          else sprite = Sprites.player.walk2;
        }

        const sprW = 64;
        const sprH = 96;
        ctx.drawImage(sprite, player.x - sprW / 2, player.y - sprH + 10 + bob, sprW, sprH);
        ctx.restore(); // remove glow

        // Draw animated arrow marker above player
        const arrowOffset = Math.sin(timeNow / 200) * 5;
        ctx.fillStyle = '#fde047'; // Bright Yellow
        ctx.beginPath();
        ctx.moveTo(player.x - 8, player.y - sprH + 10 - 20 + arrowOffset + bob);
        ctx.lineTo(player.x + 8, player.y - sprH + 10 - 20 + arrowOffset + bob);
        ctx.lineTo(player.x, player.y - sprH + 10 - 10 + arrowOffset + bob);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#1e1e24';
        ctx.stroke();
      }
    });

    // 3. NPCs
    for (const npc of npcs) {
      renderables.push({
        ySort: npc.y + 25,
        render: () => {
          // Hard pixel shadow oval
          ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
          ctx.beginPath();
          ctx.ellipse(npc.x, npc.y + 10, 20, 8, 0, 0, Math.PI * 2);
          ctx.fill();

          const npcSprites = Sprites.npcs[npc.colorType];
          let sprite = npcSprites.idle;

          const bob = npc.walkAnimTime > 0 ? Math.sin(timeNow / 100) * 3 : 0;

          if (npc.walkAnimTime > 0) {
            const frame = Math.floor(timeNow / 150) % 4;
            if (frame === 0 || frame === 2) sprite = npcSprites.idle;
            else if (frame === 1) sprite = npcSprites.walk1;
            else sprite = npcSprites.walk2;
          }

          const sprW = 64;
          const sprH = 96;
          ctx.drawImage(sprite, npc.x - sprW / 2, npc.y - sprH + 10 + bob, sprW, sprH);
        }
      });
    }

    // Sort by ySort (Depth)
    renderables.sort((a, b) => a.ySort - b.ySort);

    // Render in correct order
    for (const item of renderables) {
      item.render();
    }

    ctx.restore();

    // Vignette lighting effect over entire screen
    const gradient = ctx.createRadialGradient(width/2, height/2, height/4, width/2, height/2, width);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    return { offsetX, offsetY };
  }
}
