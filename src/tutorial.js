import { GameState } from './game.js';
import { getActiveModal } from './ui.js';

export const TutorialManager = {
  isActive: false,
  currentStep: 0,
  isWaitingForAction: false,
  panel: null,
  titleEl: null,
  bodyEl: null,
  nextBtn: null,
  skipBtn: null,

  steps: [
    {
      id: 'welcome',
      title: "Welcome Manager!",
      body: "You are the new Cafeteria Manager.\nYour goal is to balance:\n- budget\n- student happiness\n- sustainability\n- food waste.",
      actionType: 'click', // wait for next button
      condition: () => true
    },
    {
      id: 'movement',
      title: "Movement",
      body: "Controls: WASD or Arrows to Move.\nPress E to interact.\n\nGo to the Office.",
      actionType: 'auto', // advance when condition met
      condition: (zone) => zone === 'Office'
    },
    {
      id: 'office',
      title: "The Office",
      body: "Here you set the rules.\nExpected students are shown.\n\nChoose a Supplier:\nLocal (costs more, good eco)\nImport (cheap, bad eco).",
      actionType: 'auto',
      condition: () => GameState.supplier !== 'none',
      onComplete: () => {
        // Show consequence
        TutorialManager.showCustom("Decision Made", "Your supplier choice impacts budget and sustainability everyday.\n\nLet's check the storage next.");
      }
    },
    {
      id: 'storage',
      title: "Storage Room",
      body: "Check ingredient stock.\nIngredients are limited. Expired food creates waste. Buying too much can lose money.",
      actionType: 'click',
      condition: () => getActiveModal() === 'Storage'
    },
    {
      id: 'kitchen',
      title: "The Kitchen",
      body: "Choose how many meals to cook.\nToo few meals = unhappy students.\nToo many meals = waste.\n\nSet your meals now.",
      actionType: 'click',
      condition: () => getActiveModal() === 'Kitchen'
    },
    {
      id: 'serving',
      title: "Serving Time",
      body: "Go to the Serving Queue and Start Service when ready.",
      actionType: 'auto',
      condition: () => GameState.dayPhase === 'serving',
      onComplete: () => {
        TutorialManager.showCustom("Service Started", "Students are entering and queueing.\nStudent happiness depends on good planning.");
      }
    },
    {
      id: 'end',
      title: "End of Day",
      body: "Your decisions affect future days.\nCheck your final stats here to learn and adapt for tomorrow.",
      actionType: 'click',
      condition: () => GameState.dayPhase === 'end'
    }
  ],

  init() {
    this.panel = document.getElementById('tutorial-overlay');
    this.titleEl = document.getElementById('tutorial-title');
    this.bodyEl = document.getElementById('tutorial-body');
    this.nextBtn = document.getElementById('tutorial-next-btn');
    this.skipBtn = document.getElementById('tutorial-skip-btn');

    this.nextBtn.addEventListener('click', () => {
      if (this.isCustomMessage) {
        this.isCustomMessage = false;
        this.currentStep++;
        this.showCurrentStep();
      } else {
        const step = this.steps[this.currentStep];
        if (step && step.actionType === 'click') {
          if (step.onComplete) step.onComplete();
          else {
            this.currentStep++;
            this.showCurrentStep();
          }
        }
      }
    });

    this.skipBtn.addEventListener('click', () => {
      this.skip();
    });
  },

  start() {
    if (GameState.currentDay !== 1) return;
    this.isActive = true;
    this.currentStep = 0;
    this.isCustomMessage = false;
    this.showCurrentStep();
  },

  skip() {
    this.isActive = false;
    this.panel.classList.add('hidden');
  },

  showCustom(title, body) {
    this.isCustomMessage = true;
    this.titleEl.innerText = title;
    this.bodyEl.innerText = body;
    this.nextBtn.style.display = 'block';
    this.panel.classList.remove('hidden');
  },

  showCurrentStep() {
    if (this.currentStep >= this.steps.length) {
      this.skip();
      return;
    }

    const step = this.steps[this.currentStep];
    this.titleEl.innerText = step.title;
    this.bodyEl.innerText = step.body;

    if (step.actionType === 'auto') {
      this.nextBtn.style.display = 'none';
      this.isWaitingForAction = true;
    } else {
      // actionType === 'click'
      // If there's a condition for 'click' (like waiting for a modal to open)
      // we hide the next button UNTIL the condition is met
      if (step.condition && !step.condition()) {
        this.nextBtn.style.display = 'none';
        this.isWaitingForAction = true;
      } else {
        this.nextBtn.style.display = 'block';
        this.isWaitingForAction = false;
      }
    }

    this.panel.classList.remove('hidden');
  },

  update(currentZone) {
    if (!this.isActive || this.isCustomMessage) return;

    const step = this.steps[this.currentStep];
    if (!step) return;

    if (this.isWaitingForAction) {
      if (step.condition && step.condition(currentZone)) {
        this.isWaitingForAction = false;
        if (step.actionType === 'auto') {
          if (step.onComplete) step.onComplete();
          else {
            this.currentStep++;
            this.showCurrentStep();
          }
        } else {
          // It's a click step that was waiting for a condition to show Next
          this.nextBtn.style.display = 'block';
        }
      }
    } else {
      // It's a click step and the condition is met, so we just wait for the user to click next
      // But if the modal is closed, we might need to hide the next button again
      if (step.actionType === 'click' && step.condition && !step.condition(currentZone)) {
         this.nextBtn.style.display = 'none';
         this.isWaitingForAction = true;
      }
    }
  }
};
