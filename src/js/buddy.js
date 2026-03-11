// Desktop Buddy - Floating pet window logic
const { invoke } = window.__TAURI__.core;

const buddyPet = document.getElementById('buddyPet');
const buddyBubble = document.getElementById('buddyBubble');
const container = document.getElementById('buddy-container');

let bubbleTimer = null;
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;
let bossTickInterval = null;

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

    // Show speech bubble if there's a message
    if (reaction.message) {
      showBubble(reaction.message);
    }

    // Check milestones
    const milestone = await invoke('check_milestone');
    if (milestone) {
      showBubble(milestone, 6000);
      buddyPet.classList.add('celebrating');
      setTimeout(() => buddyPet.classList.remove('celebrating'), 3000);
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
    "I'm working here!",
    ':3',
    'Need something?',
    "Shouldn't you be coding?",
    'Focus! Focus! Focus!',
    '*happy wiggle*',
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
  "You're doing great!",
  '*stretches*',
  'Focus mode!',
  'Code hard, nap harder',
  'Ship it!',
  '*does a little dance*',
];

setInterval(() => {
  const reaction = buddyPet.getAttribute('data-reaction');
  if (reaction === 'normal' && Math.random() < 0.3) {
    const msg = idleMessages[Math.floor(Math.random() * idleMessages.length)];
    showBubble(msg, 3000);
  }
}, 30000);

// ===== Boss Fight Mode (2hr deep work challenge) =====

async function startBossFight() {
  try {
    const boss = await invoke('start_boss_fight');
    showBubble('BOSS FIGHT! 2hr deep work challenge!', 5000);
    buddyPet.setAttribute('data-boss', 'active');
    startBossTick();
    return boss;
  } catch (e) {
    console.error('Boss fight start error:', e);
  }
}

function startBossTick() {
  if (bossTickInterval) clearInterval(bossTickInterval);
  bossTickInterval = setInterval(async () => {
    try {
      const [boss, msg] = await invoke('tick_boss_fight');
      if (msg) {
        showBubble(msg, 5000);
      }
      if (!boss.active) {
        clearInterval(bossTickInterval);
        bossTickInterval = null;
        buddyPet.removeAttribute('data-boss');
        if (boss.hp <= 0) {
          // Victory celebration
          buddyPet.classList.add('celebrating');
          setTimeout(() => buddyPet.classList.remove('celebrating'), 5000);
        }
      }
    } catch (e) {
      console.error('Boss tick error:', e);
    }
  }, 60000); // Tick every minute
}

// Check if boss fight was already active on load
(async () => {
  try {
    const boss = await invoke('get_boss_fight');
    if (boss.active) {
      buddyPet.setAttribute('data-boss', 'active');
      startBossTick();
      showBubble(`Boss fight in progress! ${boss.hp}HP left!`, 4000);
    }
  } catch (e) {
    // ignore
  }
})();

// Expose to window for context menu / main app
window.startBossFight = startBossFight;

// ===== Weekly Time Thief Notification =====

// Check once on startup (will show the bubble if there's a thief)
(async () => {
  try {
    const msg = await invoke('get_weekly_time_thief');
    if (msg) {
      // Delay so it doesn't conflict with other startup messages
      setTimeout(() => showBubble(msg, 6000), 10000);
    }
  } catch (e) {
    // ignore
  }
})();
