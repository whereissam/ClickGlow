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

// ===== Screen & position state =====
let screenW = 1920;
let screenH = 1080;
let winX = 0;
let winY = 0;
const WIN_W = 200;
const WIN_H = 180;

// Edge state: "right", "left", "bottom", "top"
let currentEdge = 'right';
let behaviorState = 'idle'; // "idle", "peeking", "walking", "transitioning"
let walkDirection = 1;
let walkInterval = null;
let peekTimer = null;
let isPeeking = false;

// ===== Init: get screen info =====
async function initScreen() {
  try {
    const [w, h] = await invoke('get_screen_info');
    screenW = w;
    screenH = h;
    const [x, y] = await invoke('get_buddy_position');
    winX = x;
    winY = y;
    detectEdge();
  } catch (e) {
    console.error('Screen init error:', e);
  }
}
initScreen();

function detectEdge() {
  const margin = 20;
  if (winX >= screenW - WIN_W - margin) {
    currentEdge = 'right';
  } else if (winX <= margin) {
    currentEdge = 'left';
  } else if (winY >= screenH - WIN_H - margin) {
    currentEdge = 'bottom';
  } else if (winY <= margin) {
    currentEdge = 'top';
  }
  container.setAttribute('data-edge', currentEdge);
}

// ===== Click-through on transparent areas =====
// Make transparent areas pass-through so user can interact with windows behind

let ignoring = false;

async function setupClickThrough() {
  try {
    const { getCurrentWindow } = window.__TAURI__.window;
    const win = getCurrentWindow();

    // On macOS, setIgnoreCursorEvents with forward:true lets events pass through
    // but the window still gets mousemove to detect when cursor enters the pet
    const setIgnore = async (ignore) => {
      if (ignore === ignoring) return;
      ignoring = ignore;
      try {
        await win.setIgnoreCursorEvents(ignore, { forward: true });
      } catch (_e) { /* ignore */ }
    };

    // Start ignoring by default (transparent areas pass through)
    await setIgnore(true);

    // When mouse enters interactive elements, stop ignoring
    const interactiveEls = [buddyPet, buddyBubble, container.querySelector('.buddy-grip')];
    for (const el of interactiveEls) {
      if (!el) continue;
      el.addEventListener('mouseenter', () => setIgnore(false));
    }

    // When mouse leaves the container entirely, re-enable pass-through
    container.addEventListener('mouseleave', () => setIgnore(true));
  } catch (_e) {
    console.error('Click-through setup error:', _e);
  }
}
setupClickThrough();

// ===== Poll pet state + system stats =====

async function updateBuddy() {
  try {
    const [pet, reaction] = await Promise.all([
      invoke('get_pet'),
      invoke('get_buddy_state'),
    ]);

    buddyPet.setAttribute('data-species', pet.species);
    buddyPet.setAttribute('data-mood', pet.mood);
    buddyPet.setAttribute('data-reaction', reaction.state);

    if (reaction.message) {
      showBubble(reaction.message);
    }

    // Handle "blown" reaction — pet flies off screen
    if (reaction.state === 'blown' && !buddyPet.classList.contains('blown-away')) {
      blowAway();
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
    buddyPet.classList.remove('clicked');
    buddyPet.classList.add('double-clicked');
    showBubble('Wheee! \\(^o^)/');
    setTimeout(() => buddyPet.classList.remove('double-clicked'), 800);
  } else {
    buddyPet.classList.remove('double-clicked');
    buddyPet.classList.add('clicked');
    showBubble(pickRandomReaction());
    setTimeout(() => buddyPet.classList.remove('clicked'), 500);
  }

  lastClickTime = now;
});

// ===== Right-click context menu =====
buddyPet.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  e.stopPropagation();
  showContextMenu();
});

let contextMenuEl = null;

function createMenuButton(label, action) {
  const btn = document.createElement('button');
  btn.textContent = label;
  btn.dataset.action = action;
  return btn;
}

function showContextMenu() {
  removeContextMenu();

  contextMenuEl = document.createElement('div');
  contextMenuEl.className = 'buddy-context-menu';

  const items = [
    ['Feed Pet', 'feed'],
    ['Poke', 'poke'],
    ['Sleep', 'sleep'],
    ['Boss Fight', 'boss'],
    ['Walk', 'walk'],
    ['Peek', 'peek'],
    ['Water Count', 'water_count'],
  ];

  for (const [label, action] of items) {
    contextMenuEl.appendChild(createMenuButton(label, action));
  }

  contextMenuEl.style.position = 'absolute';
  contextMenuEl.style.left = '0px';
  contextMenuEl.style.top = '0px';
  document.body.appendChild(contextMenuEl);

  contextMenuEl.addEventListener('click', (e) => {
    const action = e.target.closest('button')?.dataset.action;
    if (!action) return;
    removeContextMenu();
    handleContextAction(action);
  });

  setTimeout(() => {
    document.addEventListener('click', removeContextMenu, { once: true });
  }, 10);
}

function removeContextMenu() {
  if (contextMenuEl) {
    contextMenuEl.remove();
    contextMenuEl = null;
  }
}

async function handleContextAction(action) {
  switch (action) {
    case 'feed':
      try {
        await invoke('feed_pet', { focusMins: 5 });
        showBubble('Yummy! +HP +XP!', 3000);
        buddyPet.classList.add('celebrating');
        setTimeout(() => buddyPet.classList.remove('celebrating'), 2000);
      } catch (_e) {
        showBubble('Not hungry right now');
      }
      break;
    case 'poke':
      buddyPet.classList.add('clicked');
      showBubble('Hey! That tickles!');
      setTimeout(() => buddyPet.classList.remove('clicked'), 500);
      break;
    case 'sleep':
      showBubble('Zzz... goodnight...', 3000);
      buddyPet.setAttribute('data-mood', 'sleeping');
      setTimeout(() => updateBuddy(), 5000);
      break;
    case 'boss':
      await startBossFight();
      break;
    case 'walk':
      startWalk();
      break;
    case 'peek':
      doPeek();
      break;
    case 'water_count':
      try {
        const count = await invoke('get_water_count');
        showBubble(`You drank ${count} glasses today!`, 4000);
      } catch (_e) {
        showBubble('No water data yet!', 3000);
      }
      break;
  }
}

function pickRandomReaction() {
  const reactions = [
    'Hey!', '(o_o)', 'Boing!', 'Hehe~', 'Stop poking me!',
    "I'm working here!", ':3', 'Need something?',
    "Shouldn't you be coding?", 'Focus! Focus! Focus!',
    '*happy wiggle*',
  ];
  return reactions[Math.floor(Math.random() * reactions.length)];
}

// ===== Dragging with edge snap + panic =====

let dragStartX = 0;
let dragStartY = 0;

container.addEventListener('mousedown', (e) => {
  isDragging = true;
  dragOffsetX = e.screenX;
  dragOffsetY = e.screenY;
  dragStartX = winX;
  dragStartY = winY;
  document.body.style.cursor = 'grabbing';
  stopWalk();
});

document.addEventListener('mouseup', async () => {
  if (!isDragging) return;
  isDragging = false;
  document.body.style.cursor = '';

  const distFromEdge = distanceFromNearestEdge();
  if (distFromEdge > 100) {
    await panicScrambleBack();
  } else {
    detectEdge();
    await snapToEdge();
  }
});

function distanceFromNearestEdge() {
  const dRight = screenW - (winX + WIN_W);
  const dLeft = winX;
  const dBottom = screenH - (winY + WIN_H);
  const dTop = winY;
  return Math.min(dRight, dLeft, dBottom, dTop);
}

async function snapToEdge() {
  const dRight = screenW - (winX + WIN_W);
  const dLeft = winX;
  const dBottom = screenH - (winY + WIN_H);
  const dTop = winY;
  const min = Math.min(dRight, dLeft, dBottom, dTop);

  let targetX = winX;
  let targetY = winY;

  if (min === dRight) {
    targetX = screenW - WIN_W;
    currentEdge = 'right';
  } else if (min === dLeft) {
    targetX = 0;
    currentEdge = 'left';
  } else if (min === dBottom) {
    targetY = screenH - WIN_H;
    currentEdge = 'bottom';
  } else {
    targetY = 0;
    currentEdge = 'top';
  }

  container.setAttribute('data-edge', currentEdge);
  await animateMoveTo(targetX, targetY, 200);
}

async function panicScrambleBack() {
  buddyPet.classList.add('panicking');
  showBubble('AAAH! Put me back!', 2000);
  await animateMoveTo(dragStartX, dragStartY, 400);
  buddyPet.classList.remove('panicking');
  detectEdge();
}

async function animateMoveTo(targetX, targetY, durationMs) {
  const startX = winX;
  const startY = winY;
  const startTime = Date.now();

  return new Promise((resolve) => {
    function step() {
      const elapsed = Date.now() - startTime;
      const t = Math.min(elapsed / durationMs, 1);
      const ease = 1 - Math.pow(1 - t, 3);

      const x = Math.round(startX + (targetX - startX) * ease);
      const y = Math.round(startY + (targetY - startY) * ease);

      invoke('set_buddy_position', { x: x, y: y }).catch(() => {});
      winX = x;
      winY = y;

      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        resolve();
      }
    }
    requestAnimationFrame(step);
  });
}

// ===== Mouse cursor tracking (pet watches cursor) =====
// Handled inside the unified mousemove handler below

// ===== Peek Animation =====

function doPeek() {
  if (isPeeking) return;
  isPeeking = true;
  behaviorState = 'peeking';

  container.classList.add('peeking');
  showBubble('*peeks*', 2000);

  const hideOffset = currentEdge === 'right' ? 40 : currentEdge === 'left' ? -40 : 0;
  const hideOffsetY = currentEdge === 'bottom' ? 40 : currentEdge === 'top' ? -40 : 0;

  invoke('set_buddy_position', {
    x: winX + hideOffset,
    y: winY + hideOffsetY,
  }).catch(() => {});

  setTimeout(() => {
    container.classList.add('peek-out');
    invoke('set_buddy_position', { x: winX, y: winY }).catch(() => {});
  }, 600);

  peekTimer = setTimeout(() => {
    container.classList.remove('peeking', 'peek-out');
    isPeeking = false;
    behaviorState = 'idle';
  }, 4000);
}

// ===== Unified mousemove: drag + eye tracking + peek hide =====
document.addEventListener('mousemove', async (e) => {
  // 1. Handle drag
  if (isDragging) {
    const dx = e.screenX - dragOffsetX;
    const dy = e.screenY - dragOffsetY;
    dragOffsetX = e.screenX;
    dragOffsetY = e.screenY;

    try {
      const { getCurrentWindow } = window.__TAURI__.window;
      const win = getCurrentWindow();
      const pos = await win.outerPosition();
      winX = pos.x + dx;
      winY = pos.y + dy;
      await win.setPosition({ type: 'Physical', x: winX, y: winY });
    } catch (err) {
      console.error('Drag error:', err);
    }
    return;
  }

  // 2. Eye tracking
  if (!isPeeking) {
    const petRect = buddyPet.getBoundingClientRect();
    const petCx = petRect.left + petRect.width / 2;
    const petCy = petRect.top + petRect.height / 2;
    const dx = e.clientX - petCx;
    const dy = e.clientY - petCy;
    const maxShift = 2;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const eyes = buddyPet.querySelectorAll('.buddy-eye');
    if (dist > 0 && dist < 200) {
      const shiftX = (dx / dist) * maxShift;
      const shiftY = (dy / dist) * maxShift;
      eyes.forEach(eye => { eye.style.transform = `translate(${shiftX}px, ${shiftY}px)`; });
    } else {
      eyes.forEach(eye => { eye.style.transform = ''; });
    }
  }

  // 3. Peek hide on mouse approach
  if (isPeeking) {
    const petRect = buddyPet.getBoundingClientRect();
    const dist = Math.sqrt(
      Math.pow(e.clientX - (petRect.left + petRect.width / 2), 2) +
      Math.pow(e.clientY - (petRect.top + petRect.height / 2), 2)
    );
    if (dist < 60) {
      container.classList.remove('peek-out');
      container.classList.add('peek-hide');
      showBubble('Eek!', 1500);
      clearTimeout(peekTimer);
      setTimeout(() => {
        container.classList.remove('peeking', 'peek-hide');
        isPeeking = false;
        behaviorState = 'idle';
      }, 800);
    }
  }
});

// ===== Walk Animation =====

function startWalk() {
  if (behaviorState === 'walking') {
    stopWalk();
    return;
  }
  stopWalk();
  behaviorState = 'walking';
  container.classList.add('walking');
  showBubble('*walks along edge*', 2000);

  walkDirection = 1;
  walkInterval = setInterval(async () => {
    const step = 3;
    if (currentEdge === 'right' || currentEdge === 'left') {
      winY += step * walkDirection;
      if (winY >= screenH - WIN_H - 10) {
        walkDirection = -1;
        startEdgeTransition('bottom');
        return;
      }
      if (winY <= 10) {
        walkDirection = 1;
        startEdgeTransition('top');
        return;
      }
    } else {
      winX += step * walkDirection;
      if (winX >= screenW - WIN_W - 10) {
        walkDirection = -1;
        startEdgeTransition('right');
        return;
      }
      if (winX <= 10) {
        walkDirection = 1;
        startEdgeTransition('left');
        return;
      }
    }

    try {
      await invoke('set_buddy_position', { x: winX, y: winY });
    } catch (_e) {
      stopWalk();
    }
  }, 50);

  setTimeout(() => stopWalk(), 15000);
}

function stopWalk() {
  if (walkInterval) {
    clearInterval(walkInterval);
    walkInterval = null;
  }
  container.classList.remove('walking');
  if (behaviorState === 'walking') {
    behaviorState = 'idle';
  }
}

// ===== Edge Transition =====

async function startEdgeTransition(newEdge) {
  stopWalk();
  behaviorState = 'transitioning';
  container.classList.add('transitioning');
  showBubble('*climbs around corner*', 2000);

  let cornerX = winX;
  let cornerY = winY;

  if (newEdge === 'bottom') cornerY = screenH - WIN_H;
  else if (newEdge === 'top') cornerY = 0;
  else if (newEdge === 'right') cornerX = screenW - WIN_W;
  else if (newEdge === 'left') cornerX = 0;

  await animateMoveTo(cornerX, cornerY, 500);

  currentEdge = newEdge;
  container.setAttribute('data-edge', currentEdge);
  container.classList.remove('transitioning');
  behaviorState = 'idle';

  setTimeout(() => {
    if (behaviorState === 'idle') startWalk();
  }, 500);
}

// ===== Blown Away (fan speed) =====

async function blowAway() {
  buddyPet.classList.add('blown-away');
  showBubble('AAAH! The fan!!', 3000);

  const flyX = currentEdge === 'left' ? screenW + 50 : -150;
  await animateMoveTo(flyX, winY - 100, 800);

  setTimeout(async () => {
    showBubble('*crawls back*', 2000);
    buddyPet.classList.remove('blown-away');
    buddyPet.classList.add('crawling-back');

    const targetX = currentEdge === 'right' ? screenW - WIN_W : 0;
    const targetY = Math.min(Math.max(winY, 100), screenH - WIN_H - 100);
    await animateMoveTo(targetX, targetY, 2000);

    buddyPet.classList.remove('crawling-back');
    detectEdge();
  }, 3000);
}

// ===== Periodic idle messages =====

const idleMessages = [
  'Keep going!', '...', '*yawn*', 'Nice weather today',
  "You're doing great!", '*stretches*', 'Focus mode!',
  'Code hard, nap harder', 'Ship it!', '*does a little dance*',
];

setInterval(() => {
  const reaction = buddyPet.getAttribute('data-reaction');
  if (reaction === 'normal' && behaviorState === 'idle' && Math.random() < 0.3) {
    const msg = idleMessages[Math.floor(Math.random() * idleMessages.length)];
    showBubble(msg, 3000);
  }
}, 30000);

// ===== Random autonomous behaviors =====

setInterval(() => {
  if (behaviorState !== 'idle') return;
  if (buddyPet.getAttribute('data-reaction') !== 'normal') return;

  const roll = Math.random();
  if (roll < 0.1) {
    doPeek();
  } else if (roll < 0.15) {
    startWalk();
  }
}, 60000);

// ===== Boss Fight Mode =====

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
      if (msg) showBubble(msg, 5000);
      if (!boss.active) {
        clearInterval(bossTickInterval);
        bossTickInterval = null;
        buddyPet.removeAttribute('data-boss');
        if (boss.hp <= 0) {
          buddyPet.classList.add('celebrating');
          setTimeout(() => buddyPet.classList.remove('celebrating'), 5000);
        }
      }
    } catch (e) {
      console.error('Boss tick error:', e);
    }
  }, 60000);
}

(async () => {
  try {
    const boss = await invoke('get_boss_fight');
    if (boss.active) {
      buddyPet.setAttribute('data-boss', 'active');
      startBossTick();
      showBubble(`Boss fight in progress! ${boss.hp}HP left!`, 4000);
    }
  } catch (_e) { /* ignore */ }
})();

window.startBossFight = startBossFight;

// ===== Hydration & Break Reminders =====

let activeReminder = null; // "water" or "break" or null
const reminderActions = document.getElementById('reminderActions');
const reminderOk = document.getElementById('reminderOk');
const reminderSnooze = document.getElementById('reminderSnooze');

async function pollReminders() {
  if (activeReminder) return; // already showing a reminder
  try {
    const check = await invoke('check_reminders');

    if (check.water_due) {
      activeReminder = 'water';
      showWaterReminder(check.water_count_today);
    } else if (check.break_due) {
      activeReminder = 'break';
      showBreakReminder();
    }
  } catch (_e) { /* ignore */ }
}

function showWaterReminder(count) {
  buddyPet.classList.add('drinking');
  showBubble(`Drink water! (${count} today)`, 8000);
  reminderActions.classList.add('visible');

  setTimeout(() => {
    buddyPet.classList.remove('drinking');
  }, 2000);
}

function showBreakReminder() {
  buddyPet.classList.add('stretching');
  showBubble('Time for a stretch break!', 8000);
  reminderActions.classList.add('visible');

  setTimeout(() => {
    buddyPet.classList.remove('stretching');
  }, 3000);
}

reminderOk.addEventListener('click', async (e) => {
  e.stopPropagation();
  reminderActions.classList.remove('visible');

  if (activeReminder === 'water') {
    try {
      const count = await invoke('acknowledge_water');
      showBubble(`Refreshing! ${count} glasses today!`, 3000);
      buddyPet.classList.add('celebrating');
      setTimeout(() => buddyPet.classList.remove('celebrating'), 2000);
    } catch (_e) { /* ignore */ }
  } else if (activeReminder === 'break') {
    try {
      await invoke('acknowledge_break');
      showBubble('Good stretch! Feel better?', 3000);
      buddyPet.classList.add('celebrating');
      setTimeout(() => buddyPet.classList.remove('celebrating'), 2000);
    } catch (_e) { /* ignore */ }
  }
  activeReminder = null;
});

reminderSnooze.addEventListener('click', async (e) => {
  e.stopPropagation();
  reminderActions.classList.remove('visible');

  if (activeReminder) {
    try {
      await invoke('snooze_reminder', { reminderType: activeReminder, snoozeMins: 10 });
      buddyPet.classList.add('disappointed');
      showBubble('Fine... 10 more minutes...', 3000);
      setTimeout(() => buddyPet.classList.remove('disappointed'), 3000);
    } catch (_e) { /* ignore */ }
  }
  activeReminder = null;
});

// Poll reminders every 30 seconds
setInterval(pollReminders, 30000);
setTimeout(pollReminders, 15000); // first check after 15s

// ===== Weekly Time Thief Notification =====

(async () => {
  try {
    const msg = await invoke('get_weekly_time_thief');
    if (msg) {
      setTimeout(() => showBubble(msg, 6000), 10000);
    }
  } catch (_e) { /* ignore */ }
})();
