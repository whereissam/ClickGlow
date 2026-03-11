// Desktop Buddy - Floating pet window logic
const { invoke } = window.__TAURI__.core;

const buddyPet = document.getElementById('buddyPet');
const buddyBubble = document.getElementById('buddyBubble');
const container = document.getElementById('buddy-container');

let bubbleTimer = null;
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

// ===== Poll pet state + system stats =====

async function updateBuddy() {
  try {
    const [pet, reaction] = await Promise.all([
      invoke('get_pet'),
      invoke('get_buddy_state'),
    ]);

    // Update species & mood
    buddyPet.setAttribute('data-species', pet.species);
    buddyPet.setAttribute('data-mood', pet.mood);
    buddyPet.setAttribute('data-reaction', reaction.state);

    // Update grip hand colors via species
    // (handled by CSS sibling selectors)

    // Show speech bubble if there's a message
    if (reaction.message) {
      showBubble(reaction.message);
    }
  } catch (e) {
    console.error('Buddy update error:', e);
  }
}

// Poll every 5 seconds
setInterval(updateBuddy, 5000);
updateBuddy();

// ===== Speech Bubble =====

function showBubble(text, duration = 4000) {
  buddyBubble.textContent = text;
  buddyBubble.classList.add('visible');

  if (bubbleTimer) clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => {
    buddyBubble.classList.remove('visible');
  }, duration);
}

// ===== Click Interactions =====

let lastClickTime = 0;

buddyPet.addEventListener('click', (e) => {
  e.stopPropagation();
  const now = Date.now();

  if (now - lastClickTime < 300) {
    // Double click → backflip
    buddyPet.classList.remove('clicked');
    buddyPet.classList.add('double-clicked');
    showBubble('Wheee! \\(^o^)/');
    setTimeout(() => buddyPet.classList.remove('double-clicked'), 800);
  } else {
    // Single click → jump
    buddyPet.classList.remove('double-clicked');
    buddyPet.classList.add('clicked');
    showBubble(pickRandomReaction());
    setTimeout(() => buddyPet.classList.remove('clicked'), 500);
  }

  lastClickTime = now;
});

function pickRandomReaction() {
  const reactions = [
    'Hey!',
    '(o_o)',
    'Boing!',
    'Hehe~',
    'Stop poking me!',
    'I\'m working here!',
    ':3',
    'Need something?',
  ];
  return reactions[Math.floor(Math.random() * reactions.length)];
}

// ===== Dragging =====

container.addEventListener('mousedown', (e) => {
  isDragging = true;
  dragOffsetX = e.screenX;
  dragOffsetY = e.screenY;
  document.body.style.cursor = 'grabbing';
});

document.addEventListener('mousemove', async (e) => {
  if (!isDragging) return;

  const dx = e.screenX - dragOffsetX;
  const dy = e.screenY - dragOffsetY;
  dragOffsetX = e.screenX;
  dragOffsetY = e.screenY;

  // Get current window position and move it
  try {
    const { getCurrentWindow } = window.__TAURI__.window;
    const win = getCurrentWindow();
    const pos = await win.outerPosition();
    await win.setPosition({
      type: 'Physical',
      x: pos.x + dx,
      y: pos.y + dy,
    });
  } catch (err) {
    console.error('Drag error:', err);
  }
});

document.addEventListener('mouseup', () => {
  if (isDragging) {
    isDragging = false;
    document.body.style.cursor = '';
  }
});

// ===== Periodic idle messages =====

const idleMessages = [
  'Keep going!',
  '...',
  '*yawn*',
  'Nice weather today',
  'You\'re doing great!',
  '*stretches*',
  'Focus mode!',
];

setInterval(() => {
  // Only show idle messages if no active reaction
  const reaction = buddyPet.getAttribute('data-reaction');
  if (reaction === 'normal' && Math.random() < 0.3) {
    const msg = idleMessages[Math.floor(Math.random() * idleMessages.length)];
    showBubble(msg, 3000);
  }
}, 30000); // Every 30 seconds, 30% chance
