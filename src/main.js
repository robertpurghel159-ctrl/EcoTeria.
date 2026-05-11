import './style.css';
import { Player } from './player.js';
import { Renderer } from './renderer.js';
import { startGame, nextDay, interact, GameState, endDay, takeFood, processStudent, showSustainabilityProfile } from './game.js';
import { initUIListeners, showPrompt, hidePrompt } from './ui.js';
import { checkZoneInteraction } from './zones.js';
import { particles } from './particles.js';
import { NPCSystem } from './npc.js';
import { TutorialManager } from './tutorial.js';

let renderer, player, npcSystem;
let lastTime = performance.now();
let currentZone = null;
let prevPhase = 'morning';

function init() {
  renderer = new Renderer('game-canvas');
  player = new Player(400, 300);
  npcSystem = new NPCSystem(15); // Ambient students
  npcSystem.setCallbacks(processStudent, takeFood);

  initUIListeners();
  TutorialManager.init();

  // Main UI Event Listeners
  document.getElementById('start-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    startGame();
    TutorialManager.start();
  });

  document.getElementById('next-day-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    nextDay();
  });

  document.getElementById('view-profile-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    showSustainabilityProfile();
  });

  document.getElementById('profile-restart-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    startGame();
    TutorialManager.start();
  });

  // Interaction key
  document.addEventListener('keydown', (e) => {
    if (e.code === 'KeyE' && currentZone && !GameState.isPaused) {
      interact(currentZone.name);
    }
  });

  requestAnimationFrame(animate);
}

function handleInteractions() {
  if (GameState.isPaused || GameState.dayPhase !== 'morning') {
    if (currentZone) {
      hidePrompt();
      currentZone = null;
    }
    return;
  }

  const zone = checkZoneInteraction(player.x, player.y);
  if (zone !== currentZone) {
    currentZone = zone;
    if (currentZone) {
      showPrompt(`Press E to ${currentZone.interactText}`);
    } else {
      hidePrompt();
    }
  }
}

function animate() {
  requestAnimationFrame(animate);

  const timeNow = performance.now();
  const dt = (timeNow - lastTime) / 1000;
  lastTime = timeNow;

  player.update(dt, GameState.isPaused);

  if (prevPhase === 'morning' && GameState.dayPhase === 'serving') {
    // Use GameState.expectedStudents for the visual crowd size
    npcSystem.startDay(GameState.expectedStudents);
  }
  prevPhase = GameState.dayPhase;

  npcSystem.update(dt, GameState.isPaused, GameState.dayPhase);

  if (GameState.dayPhase === 'serving' && npcSystem.isDone) {
    npcSystem.isDone = false; // Reset to prevent multiple calls
    endDay();
  }

  particles.update(dt);
  handleInteractions();
  TutorialManager.update(currentZone ? currentZone.name : null);
  
  const offsets = renderer.render(player, npcSystem.npcs, timeNow);
  particles.render(renderer.ctx, offsets.offsetX, offsets.offsetY);
}

init();
