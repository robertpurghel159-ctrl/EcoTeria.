import { GameState, setSupplier, setMealsToCook, buyExact, buyBulk, buyEmergency, donateFood, startService } from './game.js';
import { tooltipData } from './tooltipData.js';

let activeModal = null;

export function getActiveModal() {
  return activeModal;
}

export function updateHUD(state) {
  document.getElementById('day-display').innerText = `Day ${state.currentDay}`;
  document.getElementById('budget-display').innerText = `$${Math.floor(state.budget)}`;
  document.getElementById('waste-display').innerText = `${Math.floor(state.foodWaste)} kg`;
  
  const happinessEl = document.getElementById('happiness-display');
  const happinessFill = document.getElementById('happiness-fill');
  happinessEl.innerText = `${Math.floor(state.happiness)}%`;
  happinessFill.style.width = `${Math.floor(state.happiness)}%`;
  if (state.happiness > 60) happinessFill.style.backgroundColor = 'var(--success)';
  else if (state.happiness > 30) happinessFill.style.backgroundColor = 'var(--warning)';
  else happinessFill.style.backgroundColor = 'var(--danger)';

  const sustEl = document.getElementById('sustainability-display');
  const sustFill = document.getElementById('sustainability-fill');
  sustEl.innerText = `${Math.floor(state.sustainability)}%`;
  sustFill.style.width = `${Math.floor(state.sustainability)}%`;
  if (state.sustainability > 60) sustFill.style.backgroundColor = 'var(--success)';
  else if (state.sustainability > 30) sustFill.style.backgroundColor = 'var(--warning)';
  else sustFill.style.backgroundColor = 'var(--danger)';
}

export function showScreen(id) {
  document.getElementById(id).classList.remove('hidden');
}

export function hideScreen(id) {
  document.getElementById(id).classList.add('hidden');
  if (id.endsWith('-modal')) {
    activeModal = null;
  }
}

export function showPrompt(text) {
  const prompt = document.getElementById('interaction-prompt');
  document.getElementById('prompt-text').innerText = text;
  prompt.classList.remove('hidden');
}

export function hidePrompt() {
  document.getElementById('interaction-prompt').classList.add('hidden');
}

export function showModal(zoneType) {
  activeModal = zoneType;
  if (zoneType === 'Office') {
    GameState.isPaused = true;
    document.getElementById('expected-students-display').innerText = GameState.expectedStudents;
    
    // Yesterday summary
    const yestBox = document.getElementById('yesterday-summary');
    if (GameState.yesterdayStats) {
      yestBox.classList.remove('hidden');
      const ys = GameState.yesterdayStats;
      document.getElementById('yest-students').innerText = `${ys.studentsServed} / ${ys.studentsExpected}`;
      document.getElementById('yest-leftovers').innerText = ys.leftovers;
      document.getElementById('yest-waste').innerText = ys.wasteCost;
      const hapStr = ys.happinessDelta >= 0 ? `+${Math.floor(ys.happinessDelta)}` : `${Math.floor(ys.happinessDelta)}`;
      document.getElementById('yest-happiness').innerText = hapStr;
      document.getElementById('student-comment').innerText = GameState.studentFeedback;
    } else {
      yestBox.classList.add('hidden');
    }

    document.getElementById('priority-slider').value = GameState.priority;
    const policyRadios = document.getElementsByName('menuPolicy');
    for (const r of policyRadios) {
      if (r.value === GameState.menuPolicy) r.checked = true;
    }
    
    showScreen('office-modal');
  } else if (zoneType === 'Kitchen') {
    GameState.isPaused = true;
    document.getElementById('meals-input').value = GameState.mealsToCook;
    document.getElementById('efficiency-display').innerText = `${GameState.efficiency}%`;

    const kitBox = document.getElementById('kitchen-report');
    if (GameState.yesterdayStats) {
      kitBox.classList.remove('hidden');
      const ys = GameState.yesterdayStats;
      document.getElementById('kit-cooked').innerText = ys.kitCooked;
      document.getElementById('kit-served').innerText = ys.kitServed;
      document.getElementById('kit-leftover').innerText = ys.kitLeftover;
      document.getElementById('kit-waste-cost').innerText = ys.kitWasteCost;
    } else {
      kitBox.classList.add('hidden');
    }

    const portionRadios = document.getElementsByName('portionSize');
    for (const r of portionRadios) {
      if (r.value === GameState.portionSize) r.checked = true;
    }
    const styleRadios = document.getElementsByName('cookingStyle');
    for (const r of styleRadios) {
      if (r.value === GameState.cookingStyle) r.checked = true;
    }

    showScreen('kitchen-modal');
  } else if (zoneType === 'Storage') {
    GameState.isPaused = true;
    document.getElementById('stock-display').innerText = GameState.stock;
    
    let fresh = 0, soon = 0, expired = 0;
    GameState.stockBatches.forEach(b => {
      if (b.daysOld <= 1) fresh += b.amount;
      else if (b.daysOld === 2) soon += b.amount;
      else expired += b.amount;
    });
    
    document.getElementById('stock-fresh').innerText = fresh;
    document.getElementById('stock-soon').innerText = soon;
    document.getElementById('stock-expired').innerText = expired;

    showScreen('storage-modal');
  } else if (zoneType === 'Serving Queue') {
    GameState.isPaused = true;
    showScreen('serving-modal');
  }
}
function initTooltips() {
  const icons = document.querySelectorAll('.info-icon');
  const tooltip = document.getElementById('global-tooltip');
  const titleEl = document.getElementById('tooltip-title');
  const descEl = document.getElementById('tooltip-desc');
  const dataEl = document.getElementById('tooltip-data');
  const learnMoreBtn = document.getElementById('learn-more-btn');
  const detailedPanel = document.getElementById('detailed-panel');
  const contextEl = document.getElementById('tooltip-context');
  const impactEl = document.getElementById('tooltip-impact');
  const sourceEl = document.getElementById('tooltip-source');

  let activeTooltipId = null;

  icons.forEach(icon => {
    icon.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = icon.getAttribute('data-tooltip-id');
      
      if (activeTooltipId === id && !tooltip.classList.contains('hidden')) {
        tooltip.classList.add('hidden');
        activeTooltipId = null;
        return;
      }

      if (tooltipData[id]) {
        activeTooltipId = id;
        titleEl.innerText = tooltipData[id].title;
        descEl.innerText = tooltipData[id].description;
        dataEl.innerText = tooltipData[id].data;
        
        contextEl.innerText = tooltipData[id].detailedContext;
        impactEl.innerHTML = tooltipData[id].quantifiedImpact.map(i => `<li>${i}</li>`).join('');
        sourceEl.innerText = tooltipData[id].source;
        detailedPanel.classList.add('hidden');
        learnMoreBtn.innerText = 'Learn more ▼';
        
        const rect = icon.getBoundingClientRect();
        let left = rect.right + 10;
        let top = rect.top;
        
        if (left + 250 > window.innerWidth) {
          left = rect.left - 260;
        }
        
        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
        tooltip.classList.remove('hidden');
      }
    });
  });

  learnMoreBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (detailedPanel.classList.contains('hidden')) {
      detailedPanel.classList.remove('hidden');
      learnMoreBtn.innerText = 'Show less ▲';
    } else {
      detailedPanel.classList.add('hidden');
      learnMoreBtn.innerText = 'Learn more ▼';
    }
  });

  tooltip.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  document.addEventListener('click', () => {
    tooltip.classList.add('hidden');
    activeTooltipId = null;
  });
}

export function initUIListeners() {
  initTooltips();
  
  // Office
  document.getElementById('supplier-local-btn').addEventListener('click', () => setSupplier('local'));
  document.getElementById('supplier-import-btn').addEventListener('click', () => setSupplier('import'));
  
  document.getElementById('priority-slider').addEventListener('input', (e) => {
    GameState.priority = parseInt(e.target.value);
  });
  
  const policyRadios = document.getElementsByName('menuPolicy');
  for (const r of policyRadios) {
    r.addEventListener('change', (e) => {
      GameState.menuPolicy = e.target.value;
    });
  }

  document.getElementById('close-office-btn').addEventListener('click', () => {
    hideScreen('office-modal');
    GameState.isPaused = false;
  });

  // Kitchen
  document.getElementById('meals-input').addEventListener('change', (e) => setMealsToCook(parseInt(e.target.value) || 0));
  
  const portionRadios = document.getElementsByName('portionSize');
  for (const r of portionRadios) {
    r.addEventListener('change', (e) => {
      GameState.portionSize = e.target.value;
    });
  }
  const styleRadios = document.getElementsByName('cookingStyle');
  for (const r of styleRadios) {
    r.addEventListener('change', (e) => {
      GameState.cookingStyle = e.target.value;
    });
  }

  document.getElementById('close-kitchen-btn').addEventListener('click', () => {
    hideScreen('kitchen-modal');
    GameState.isPaused = false;
  });

  // Storage
  document.getElementById('buy-exact-btn').addEventListener('click', () => {
    buyExact();
    showModal('Storage'); // refresh display
  });
  document.getElementById('buy-bulk-btn').addEventListener('click', () => {
    buyBulk();
    showModal('Storage');
  });
  document.getElementById('buy-emergency-btn').addEventListener('click', () => {
    buyEmergency();
    showModal('Storage');
  });
  document.getElementById('donate-food-btn').addEventListener('click', () => {
    donateFood();
    showModal('Storage');
  });

  document.getElementById('close-storage-btn').addEventListener('click', () => {
    hideScreen('storage-modal');
    GameState.isPaused = false;
  });

  // Serving
  document.getElementById('start-service-btn').addEventListener('click', () => {
    if (startService()) {
      hideScreen('serving-modal');
    }
  });
  document.getElementById('close-serving-btn').addEventListener('click', () => {
    hideScreen('serving-modal');
    GameState.isPaused = false;
  });
}
