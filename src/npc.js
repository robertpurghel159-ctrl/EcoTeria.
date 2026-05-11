import { Decor } from './zones.js';

export class NPC {
  constructor(x, y, colorType, id) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.colorType = colorType;
    this.speed = 100 + Math.random() * 50;
    
    this.state = 'ENTER'; 
    this.targetX = 512;
    this.targetY = 750;
    this.waitTimer = 0;
    
    this.assignedSlot = null;
    this.queueIndex = -1;
    this.walkAnimTime = 0;
    
    this.hasFood = false;
    this.patience = 30; // Seconds before leaving line
    
    // Outcome tracking
    this.outcome = 'pending'; // 'success', 'left_angry', 'no_food'
  }

  setTarget(tx, ty) {
    this.targetX = tx;
    this.targetY = ty;
  }

  findSeat() {
    const availableSlots = [];
    for (const d of Decor) {
      if (d.type === 'table' && d.slots) {
        for (const slot of d.slots) {
          if (!slot.occupied) {
            availableSlots.push(slot);
          }
        }
      }
    }
    
    if (availableSlots.length > 0) {
      const slot = availableSlots[Math.floor(Math.random() * availableSlots.length)];
      slot.occupied = true;
      this.assignedSlot = slot;
      this.setTarget(slot.x, slot.y);
      return true;
    }
    return false;
  }

  update(dt, system) {
    if (this.waitTimer > 0) {
      this.waitTimer -= dt;
      this.walkAnimTime = 0;
      
      if (this.state === 'QUEUE') {
        this.patience -= dt;
        if (this.patience <= 0) {
          // Ran out of patience
          this.outcome = 'left_angry';
          system.leaveQueue(this);
          this.state = 'EXIT';
          this.setTarget(512, 800);
          this.waitTimer = 0;
          return;
        }
      }
      
      if (this.waitTimer <= 0) {
        // State transitions after waiting
        if (this.state === 'GET_FOOD') {
          // Attempt to get food
          if (system.takeFood()) {
            this.hasFood = true;
            if (this.findSeat()) {
              this.state = 'WALKING_TO_SEAT';
            } else {
              this.state = 'WAITING_FOR_SEAT';
              this.waitTimer = 1;
            }
          } else {
            this.outcome = 'no_food';
            this.state = 'EXIT';
            this.setTarget(512, 800);
          }
        } else if (this.state === 'WAITING_FOR_SEAT') {
          if (this.findSeat()) {
            this.state = 'WALKING_TO_SEAT';
          } else {
            this.waitTimer = 1; // Wait and try again
          }
        } else if (this.state === 'EAT') {
          if (this.assignedSlot) {
            this.assignedSlot.occupied = false;
            this.assignedSlot = null;
          }
          this.state = 'TRASH';
          // Trash coordinate: 64 + 96, 540 + 64 (center of trash zone)
          this.setTarget(160, 604); 
        } else if (this.state === 'TRASH') {
          this.outcome = 'success';
          this.state = 'EXIT';
          this.setTarget(512, 800);
        }
      }
      return;
    }

    // Move towards target
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    const moveDist = this.speed * dt;

    if (dist <= moveDist) {
      // Reached target
      this.x = this.targetX;
      this.y = this.targetY;
      this.walkAnimTime = 0;
      
      if (this.state === 'ENTER') {
        this.state = 'QUEUE';
        system.joinQueue(this);
      } else if (this.state === 'WALKING_TO_SEAT') {
        // Just reached the seat
        this.state = 'EAT';
        this.waitTimer = 3 + Math.random() * 3; // Eat for 3-6s
      } else if (this.state === 'TRASH') {
        this.waitTimer = 0.5; // Dump trash
      }
    } else {
      // Walk
      this.x += (dx / dist) * moveDist;
      this.y += (dy / dist) * moveDist;
      this.walkAnimTime += dt;
    }
  }
}

export class NPCSystem {
  constructor(count) {
    this.npcs = [];
    this.colors = ['red', 'green', 'yellow', 'purple'];
    this.spawnTimer = 0;
    this.spawnedCount = 0;
    this.exitedCount = 0;
    this.targetCount = 0;
    this.isDone = false;
    this.dayTimer = 0;
    
    this.queue = [];
    // Queue base coordinates: Serving area is x: 384, y: 128
    // Let's start the queue near 512, 220 and go down
    this.queueBaseX = 512;
    this.queueBaseY = 220;
    this.queueSpacing = 40;
    
    this.gameCallback = null; // To call game.js processStudent
    this.takeFoodCallback = null; // To check if food is available
  }

  setCallbacks(processStudent, takeFood) {
    this.gameCallback = processStudent;
    this.takeFoodCallback = takeFood;
  }

  startDay(targetCount) {
    this.clearAll();
    this.spawnedCount = 0;
    this.exitedCount = 0;
    this.targetCount = targetCount;
    this.isDone = false;
    this.dayTimer = 0;
    this.spawnTimer = 0.5; // initial delay
  }

  spawnNPC() {
    const color = this.colors[Math.floor(Math.random() * this.colors.length)];
    const npc = new NPC(480 + Math.random() * 64, 800, color, this.spawnedCount);
    // Target door area to enter
    npc.setTarget(480 + Math.random() * 64, 650);
    this.npcs.push(npc);
  }

  joinQueue(npc) {
    this.queue.push(npc);
    this.updateQueuePositions();
  }

  leaveQueue(npc) {
    const idx = this.queue.indexOf(npc);
    if (idx !== -1) {
      this.queue.splice(idx, 1);
      this.updateQueuePositions();
    }
  }

  updateQueuePositions() {
    for (let i = 0; i < this.queue.length; i++) {
      const npc = this.queue[i];
      npc.queueIndex = i;
      npc.setTarget(this.queueBaseX, this.queueBaseY + (i * this.queueSpacing));
    }
  }

  takeFood() {
    if (this.takeFoodCallback) {
      return this.takeFoodCallback();
    }
    return false;
  }

  clearAll() {
    this.npcs = [];
    this.queue = [];
    for (const d of Decor) {
      if (d.type === 'table' && d.slots) {
        for (const slot of d.slots) {
          slot.occupied = false;
        }
      }
    }
  }

  update(dt, isPaused, dayPhase) {
    if (isPaused) return;

    if (dayPhase === 'morning') {
      if (this.npcs.length > 0) {
        this.clearAll();
      }
      this.isDone = false;
      return;
    }

    if (dayPhase === 'serving') {
      this.dayTimer += dt;
      this.spawnTimer -= dt;
      
      if (this.spawnTimer <= 0 && this.spawnedCount < this.targetCount && this.npcs.length < 30) {
        this.spawnNPC();
        this.spawnedCount++;
        this.spawnTimer = Math.max(0.1, 1.2 - (this.targetCount / 100)); 
      }
      
      // Process head of queue
      if (this.queue.length > 0) {
        const head = this.queue[0];
        // If head has reached the front of the queue
        if (Math.abs(head.x - this.queueBaseX) < 5 && Math.abs(head.y - this.queueBaseY) < 5) {
          if (head.state === 'QUEUE') {
            this.leaveQueue(head);
            head.state = 'GET_FOOD';
            head.waitTimer = 0.5; // time to serve food
          }
        }
      }
    }

    for (let i = this.npcs.length - 1; i >= 0; i--) {
      const npc = this.npcs[i];
      npc.update(dt, this);
      
      if (npc.state === 'EXIT' && npc.y >= 790) {
        if (this.gameCallback) {
          this.gameCallback(npc.outcome);
        }
        this.npcs.splice(i, 1);
        this.exitedCount++;
      }
    }

    if (dayPhase === 'serving' && !this.isDone) {
      if ((this.spawnedCount >= this.targetCount && this.exitedCount >= this.targetCount) || this.dayTimer > 90) {
        this.isDone = true;
      }
    }
  }
}
