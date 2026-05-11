import { updateHUD, showScreen, hideScreen, showModal } from './ui.js';
import { particles } from './particles.js';

export const GameState = {
  budget: 1000,
  happiness: 50,
  sustainability: 50,
  foodWaste: 0,
  localIngredientsBought: 0,
  importIngredientsBought: 0,
  stockBatches: [], // [{amount, daysOld}]
  currentDay: 1,
  maxDays: 10,
  isPaused: true,
  expectedStudents: 50,
  mealsToCook: 50,
  supplier: 'none', // 'local' or 'import'
  dayPhase: 'morning', // 'morning', 'serving', 'end'
  
  priority: 50, // 0=Profit, 100=Eco
  menuPolicy: 'meat', // 'meat', 'veg', 'vegan'
  portionSize: 'normal', // 'small', 'normal', 'large'
  cookingStyle: 'early', // 'early', 'demand'
  efficiency: 85,
  
  yesterdayStats: null,
  todayEvent: "Normal day.",
  studentFeedback: "No comments yet.",
  
  // Real-time tracking during serving
  mealsAvailable: 0,
  statsToday: {
    served: 0,
    angry: 0,
    noFood: 0,
    leftovers: 0,
    income: 0,
    wasteCost: 0,
    happinessDelta: 0
  }
};

Object.defineProperty(GameState, 'stock', {
  get: function() {
    return this.stockBatches.reduce((sum, b) => sum + b.amount, 0);
  }
});

export function startGame() {
  GameState.budget = 1000;
  GameState.happiness = 50;
  GameState.sustainability = 50;
  GameState.foodWaste = 0;
  GameState.localIngredientsBought = 0;
  GameState.importIngredientsBought = 0;
  GameState.stockBatches = [];
  GameState.currentDay = 1;
  GameState.supplier = 'none';
  GameState.isPaused = false;
  GameState.priority = 50;
  GameState.menuPolicy = 'meat';
  GameState.portionSize = 'normal';
  GameState.cookingStyle = 'early';
  GameState.efficiency = 85;
  GameState.yesterdayStats = null;
  
  startMorning();
  
  updateHUD(GameState);
  hideScreen('start-screen');
  hideScreen('end-day-screen');
  hideScreen('game-over-screen');
  hideScreen('sustainability-profile-screen');
  document.getElementById('hud').classList.remove('hidden');
}

export function startMorning() {
  GameState.dayPhase = 'morning';
  GameState.isPaused = false;
  document.getElementById('time-display').innerText = 'Morning';
  
  // Age inventory
  let expiredAmount = 0;
  GameState.stockBatches.forEach(b => b.daysOld++);
  GameState.stockBatches = GameState.stockBatches.filter(b => {
    if (b.daysOld >= 3) {
      expiredAmount += b.amount;
      return false;
    }
    return true;
  });
  if (expiredAmount > 0) {
    GameState.foodWaste += Math.floor(expiredAmount * 0.5);
  }

  if (GameState.yesterdayStats) {
    const feedbacks = [];
    const ys = GameState.yesterdayStats;
    if (ys.noFood > 0) feedbacks.push("I didn't get food!");
    if (ys.angry > 0) feedbacks.push("Queue too long.");
    if (ys.leftovers > 20) feedbacks.push("Too much waste.");
    if (GameState.menuPolicy === 'vegan') feedbacks.push("Need more variety.");
    if (feedbacks.length === 0) feedbacks.push("Loved today's meal.");
    GameState.studentFeedback = feedbacks[Math.floor(Math.random() * feedbacks.length)];
  }

  const base = 40 + (GameState.currentDay * 10);
  GameState.expectedStudents = base + Math.floor(Math.random() * 20 - 10);
  
  handleRandomEvent();
  updateHUD(GameState);
}

function handleRandomEvent() {
  const events = [
    { text: "Normal day.", prob: 0.4 },
    { text: "Rainy day = more students.", prob: 0.15 },
    { text: "Delivery delay = less ingredients.", prob: 0.15 },
    { text: "School event = more demand.", prob: 0.1 },
    { text: "Free local vegetables = bonus stock.", prob: 0.1 },
    { text: "Equipment issue = lower efficiency.", prob: 0.1 },
  ];
  
  const r = Math.random();
  let cumulative = 0;
  let chosen = events[0];
  for (const e of events) {
    cumulative += e.prob;
    if (r <= cumulative) {
      chosen = e;
      break;
    }
  }
  
  GameState.todayEvent = chosen.text;

  if (chosen.text.includes("Rainy") || chosen.text.includes("event")) {
    GameState.expectedStudents += 25;
  } else if (chosen.text.includes("Delivery")) {
    if (GameState.stockBatches.length > 0) {
      GameState.stockBatches[0].amount = Math.floor(GameState.stockBatches[0].amount / 2);
    }
  } else if (chosen.text.includes("Free")) {
    GameState.stockBatches.push({ amount: 30, daysOld: 0 });
  } else if (chosen.text.includes("Equipment")) {
    GameState.efficiency = 65;
  } else {
    GameState.efficiency = 85;
  }
}

function consumeStock(amount) {
  let remaining = amount;
  GameState.stockBatches.sort((a, b) => b.daysOld - a.daysOld);
  for (let i = 0; i < GameState.stockBatches.length; i++) {
    const batch = GameState.stockBatches[i];
    if (batch.amount >= remaining) {
      batch.amount -= remaining;
      remaining = 0;
      break;
    } else {
      remaining -= batch.amount;
      batch.amount = 0;
    }
  }
  GameState.stockBatches = GameState.stockBatches.filter(b => b.amount > 0);
}

export function startService() {
  if (GameState.supplier === 'none') {
    alert("Please select a supplier in the Office first!");
    return false;
  }
  
  let multiplier = 1;
  if (GameState.portionSize === 'small') multiplier = 0.8;
  if (GameState.portionSize === 'large') multiplier = 1.3;
  
  const actualIngredientsNeeded = Math.ceil((GameState.mealsToCook * multiplier) / (GameState.efficiency / 100));

  if (GameState.stock < actualIngredientsNeeded && GameState.cookingStyle === 'early') {
    alert(`Not enough ingredients. You need ${actualIngredientsNeeded} to cook ${GameState.mealsToCook} meals.`);
    return false;
  }

  if (GameState.cookingStyle === 'early') {
    consumeStock(actualIngredientsNeeded);
    GameState.mealsAvailable = GameState.mealsToCook;
  } else {
    // Cook on demand - we start with 0 and consume as we go
    GameState.mealsAvailable = 0;
  }

  // Reset daily stats
  GameState.statsToday = {
    served: 0,
    angry: 0,
    noFood: 0,
    leftovers: 0,
    income: 0,
    wasteCost: 0,
    happinessDelta: 0
  };

  GameState.dayPhase = 'serving';
  GameState.isPaused = false;
  document.getElementById('time-display').innerText = 'Serving...';
  
  updateHUD(GameState);
  return true;
}

export function takeFood() {
  if (GameState.cookingStyle === 'early') {
    if (GameState.mealsAvailable > 0) {
      GameState.mealsAvailable--;
      return true;
    }
    return false;
  } else {
    // Cook on demand: try to consume stock for 1 meal
    let multiplier = 1;
    if (GameState.portionSize === 'small') multiplier = 0.8;
    if (GameState.portionSize === 'large') multiplier = 1.3;
    const ingrNeeded = Math.ceil((1 * multiplier) / (GameState.efficiency / 100));
    
    if (GameState.stock >= ingrNeeded) {
      consumeStock(ingrNeeded);
      return true;
    }
    return false;
  }
}

export function processStudent(outcome) {
  let hapDelta = 0;
  const priceModifier = 1 + ((50 - GameState.priority) / 100);
  
  if (outcome === 'success') {
    const income = Math.floor(10 * priceModifier);
    GameState.budget += income;
    GameState.statsToday.income += income;
    GameState.statsToday.served++;
    
    hapDelta += 5;
    if (GameState.portionSize === 'small') hapDelta -= 2;
    if (GameState.portionSize === 'large') hapDelta += 2;
    if (GameState.menuPolicy === 'vegan') hapDelta -= 1;
    if (GameState.menuPolicy === 'meat') hapDelta += 1;
    
    // Spawn particles for successful service
    // We don't have exactly where they are, so spawn at center
    particles.spawnSparks(160, 604, '#34D399', 15);
    particles.spawnText(160, 604, `+$${income}`, '#34D399');
  } else if (outcome === 'left_angry') {
    GameState.statsToday.angry++;
    hapDelta -= 3;
    particles.spawnText(512, 500, `Angry!`, '#EF4444');
  } else if (outcome === 'no_food') {
    GameState.statsToday.noFood++;
    hapDelta -= 5;
    particles.spawnText(384, 128, `No Food!`, '#EF4444');
  }

  const oldHappiness = GameState.happiness;
  GameState.happiness = Math.max(0, Math.min(100, GameState.happiness + hapDelta));
  GameState.statsToday.happinessDelta += (GameState.happiness - oldHappiness);

  updateHUD(GameState);
}

export function endDay() {
  GameState.dayPhase = 'end';
  GameState.isPaused = true;
  document.getElementById('hud').classList.add('hidden');
  
  // Calculate end-of-day waste and sustainability
  const leftovers = GameState.mealsAvailable; // Only applicable to 'early' style
  GameState.statsToday.leftovers = leftovers;
  GameState.foodWaste += leftovers;
  const wasteCost = leftovers * 2;
  GameState.budget -= wasteCost;
  GameState.statsToday.wasteCost = wasteCost;

  let sustDelta = (GameState.supplier === 'local' ? +5 : -5);
  sustDelta -= leftovers * 0.2;
  sustDelta += (GameState.priority - 50) * 0.1;
  if (GameState.menuPolicy === 'vegan') sustDelta += 10;
  if (GameState.menuPolicy === 'meat') sustDelta -= 10;

  GameState.sustainability = Math.max(0, Math.min(100, GameState.sustainability + sustDelta));

  GameState.yesterdayStats = {
    studentsExpected: GameState.expectedStudents,
    studentsServed: GameState.statsToday.served,
    leftovers: leftovers,
    wasteCost: wasteCost,
    happinessDelta: GameState.statsToday.happinessDelta,
    kitCooked: GameState.cookingStyle === 'early' ? GameState.mealsToCook : GameState.statsToday.served,
    kitServed: GameState.statsToday.served,
    kitLeftover: leftovers,
    kitWasteCost: wasteCost,
    angry: GameState.statsToday.angry,
    noFood: GameState.statsToday.noFood
  };
  
  document.getElementById('end-day-title').innerText = `End of Day ${GameState.currentDay}`;
  document.getElementById('end-budget-val').innerText = `$${Math.floor(GameState.budget)}`;
  document.getElementById('end-happiness-val').innerText = `${Math.floor(GameState.happiness)}%`;
  document.getElementById('end-sustainability-val').innerText = `${Math.floor(GameState.sustainability)}%`;
  document.getElementById('end-waste-val').innerText = `${Math.floor(GameState.foodWaste)} kg`;
  
  // Update the structured summary elements
  document.getElementById('end-served-val').innerText = `${GameState.statsToday.served}`;
  document.getElementById('end-angry-val').innerText = `${GameState.statsToday.angry}`;
  document.getElementById('end-nofood-val').innerText = `${GameState.statsToday.noFood}`;
  
  showScreen('end-day-screen');
}

export function nextDay() {
  if (GameState.currentDay >= GameState.maxDays) {
    showGameOver();
    return;
  }
  GameState.currentDay++;
  startMorning();
  hideScreen('end-day-screen');
  document.getElementById('hud').classList.remove('hidden');
}

function showGameOver() {
  hideScreen('end-day-screen');
  document.getElementById('hud').classList.add('hidden');
  
  const score = (GameState.happiness + GameState.sustainability + (GameState.budget > 1000 ? 50 : 0) - (GameState.foodWaste * 2));
  
  let result = "You managed to keep the cafeteria afloat!";
  if (GameState.happiness < 30) result = "Students are very unhappy with the food...";
  if (GameState.budget < 0) result = "You bankrupted the school!";
  
  document.getElementById('final-score-text').innerText = `Final Score: ${Math.floor(score)}\nBudget: $${Math.floor(GameState.budget)} | Happiness: ${Math.floor(GameState.happiness)}%\n\n${result}`;
  showScreen('game-over-screen');
}

export function showSustainabilityProfile() {
  hideScreen('game-over-screen');
  
  const local = GameState.localIngredientsBought;
  const imported = GameState.importIngredientsBought;
  const waste = Math.floor(GameState.foodWaste);
  const sust = Math.floor(GameState.sustainability);
  const hap = Math.floor(GameState.happiness);
  
  // CO2 calculation (arbitrary formula for game purposes)
  // Local: 0.5 kg CO2 per unit, Import: 3 kg CO2 per unit, Waste: 2 kg CO2 per unit
  const co2 = Math.floor((local * 0.5) + (imported * 3) + (waste * 2));
  
  let classification = "";
  let explanation = "";
  let interpretation = "";
  
  if (waste > 100 && sust < 50) {
    classification = "Wasteful Operator";
    explanation = "You produced a lot of food waste and ignored environmental impact.";
    if (imported > local) interpretation = "You relied heavily on cheap imports and cooked too much food, leading to massive emissions from both transport and rotting food.";
    else interpretation = "Even though you used some local food, your poor portion planning caused massive food waste, neutralizing your good intentions.";
  } else if (sust >= 80 && waste <= 50) {
    if (GameState.menuPolicy === 'vegan') {
      classification = "Eco Innovator";
      explanation = "You pushed the boundaries of sustainable food service with plant-based menus and low waste.";
      interpretation = "Your combination of local sourcing, plant-based menus, and strict waste reduction created a blueprint for a net-zero cafeteria.";
    } else {
      classification = "Sustainable Manager";
      explanation = "You carefully balanced food supply with student demand while prioritizing the environment.";
      interpretation = "You reduced waste successfully and relied on local products, significantly cutting transport emissions and landfill methane.";
    }
  } else if (GameState.budget > 1500 && sust < 60) {
    classification = "Profit-Focused Manager";
    explanation = "You ran a tight financial ship but cut corners on sustainability.";
    if (imported > local) interpretation = "You maximized profit by relying heavily on imported products, increasing your carbon footprint through transport emissions.";
    else interpretation = "You kept costs low but didn't invest in sustainable practices or menu options.";
  } else {
    classification = "Balanced Manager";
    explanation = "You found a middle ground between keeping the cafeteria afloat and being somewhat green.";
    interpretation = "You made some good choices but there is still room to improve either waste reduction or local sourcing.";
  }
  
  document.getElementById('profile-classification').innerText = classification;
  document.getElementById('profile-explanation').innerText = explanation;
  document.getElementById('profile-co2').innerText = `${co2} kg`;
  document.getElementById('profile-waste').innerText = `${waste} kg`;
  document.getElementById('profile-satisfaction').innerText = `${hap}%`;
  document.getElementById('profile-supplier').innerText = `${local} / ${imported}`;
  document.getElementById('profile-interpretation').innerText = interpretation;

  // Color logic for classification
  const classEl = document.getElementById('profile-classification');
  if (classification.includes("Sustainable") || classification.includes("Eco")) classEl.style.color = "var(--success)";
  else if (classification.includes("Wasteful")) classEl.style.color = "var(--danger)";
  else if (classification.includes("Profit")) classEl.style.color = "var(--warning)";
  else classEl.style.color = "#60A5FA"; // Blue for balanced
  
  showScreen('sustainability-profile-screen');
}

export function interact(zoneType) {
  if (GameState.isPaused || GameState.dayPhase !== 'morning') return;
  showModal(zoneType);
}

export function setSupplier(type) {
  GameState.supplier = type;
  document.getElementById('current-supplier-display').innerText = type === 'local' ? 'Local Farms' : 'Cheap Imports';
  particles.spawnSparks(650, 100, '#10B981', 15);
}

export function setMealsToCook(amount) {
  GameState.mealsToCook = amount;
}

function getSupplierCost() {
  return GameState.supplier === 'local' ? 5 : 2;
}

export function buyExact() {
  const amount = Math.ceil(GameState.expectedStudents * 1.1);
  const cost = amount * getSupplierCost();
  if (GameState.budget >= cost) {
    GameState.budget -= cost;
    GameState.stockBatches.push({ amount, daysOld: 0 });
    if (GameState.supplier === 'local') GameState.localIngredientsBought += amount;
    else GameState.importIngredientsBought += amount;
    updateHUD(GameState);
    particles.spawnSparks(100, 350, '#F59E0B', 15);
  } else {
    alert("Not enough budget!");
  }
}

export function buyBulk() {
  const cost = Math.floor(100 * getSupplierCost() * 0.8);
  if (GameState.budget >= cost) {
    GameState.budget -= cost;
    GameState.stockBatches.push({ amount: 100, daysOld: 0 });
    if (GameState.supplier === 'local') GameState.localIngredientsBought += 100;
    else GameState.importIngredientsBought += 100;
    updateHUD(GameState);
    particles.spawnSparks(100, 350, '#F59E0B', 15);
  } else {
    alert("Not enough budget!");
  }
}

export function buyEmergency() {
  const cost = 50 * getSupplierCost() * 2;
  if (GameState.budget >= cost) {
    GameState.budget -= cost;
    GameState.stockBatches.push({ amount: 50, daysOld: 0 });
    if (GameState.supplier === 'local') GameState.localIngredientsBought += 50;
    else GameState.importIngredientsBought += 50;
    updateHUD(GameState);
    particles.spawnSparks(100, 350, '#F59E0B', 15);
  } else {
    alert("Not enough budget!");
  }
}

export function donateFood() {
  let donated = 0;
  GameState.stockBatches = GameState.stockBatches.filter(b => {
    if (b.daysOld === 2) {
      donated += b.amount;
      return false;
    }
    return true;
  });
  if (donated > 0) {
    GameState.sustainability = Math.min(100, GameState.sustainability + 5);
    particles.spawnSparks(100, 350, '#10B981', 20);
    updateHUD(GameState);
  } else {
    alert("No 'Use Soon' food to donate!");
  }
}
