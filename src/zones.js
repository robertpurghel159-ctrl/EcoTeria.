export const MapLayout = {
  width: 1024,
  height: 704,
};

export const Zones = [
  {
    id: 'office',
    name: 'Office',
    color: 'rgba(16, 185, 129, 0.6)', // Green
    x: 704,
    y: 64,
    width: 256,
    height: 192,
    interactText: 'Open Office Manager',
  },
  {
    id: 'kitchen',
    name: 'Kitchen',
    color: 'rgba(239, 68, 68, 0.6)', // Red
    x: 64,
    y: 64,
    width: 256,
    height: 192,
    interactText: 'Cook Meals',
  },
  {
    id: 'storage',
    name: 'Storage',
    color: 'rgba(245, 158, 11, 0.6)', // Orange
    x: 64,
    y: 320,
    width: 192,
    height: 192,
    interactText: 'Check Storage',
  },
  {
    id: 'serving',
    name: 'Serving Queue',
    color: 'rgba(129, 140, 248, 0.6)', // Blue
    x: 384,
    y: 128,
    width: 256,
    height: 128,
    interactText: 'Start Service',
  },
  {
    id: 'trash',
    name: 'Disposal',
    color: 'rgba(75, 85, 99, 0.6)', // Gray
    x: 64,
    y: 540,
    width: 192,
    height: 128,
    interactText: 'Empty Trash',
  }
];

function createTable(x, y) {
  return {
    type: 'table',
    x,
    y,
    width: 128,
    height: 128,
    slots: [
      { id: `${x}_${y}_top`, x: x + 64, y: y - 20, occupied: false },
      { id: `${x}_${y}_bottom`, x: x + 64, y: y + 100, occupied: false },
      { id: `${x}_${y}_left`, x: x - 20, y: y + 40, occupied: false },
      { id: `${x}_${y}_right`, x: x + 148, y: y + 40, occupied: false },
    ]
  };
}

export const Decor = [
  // Dining Tables with Seating Slots
  createTable(384, 384),
  createTable(600, 384),
  createTable(816, 384),
  createTable(384, 540),
  createTable(600, 540),
  createTable(816, 540),
];

export function checkZoneInteraction(playerX, playerY) {
  const pad = 20;
  for (const zone of Zones) {
    if (
      playerX >= zone.x - pad &&
      playerX <= zone.x + zone.width + pad &&
      playerY >= zone.y - pad &&
      playerY <= zone.y + zone.height + pad
    ) {
      return zone;
    }
  }
  return null;
}
