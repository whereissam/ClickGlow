<script lang="ts">
  let bouncing = $state(false);
  let showInstallModal = $state(false);
  let copied = $state(false);
  let quote = $state("");
  let showQuote = $state(false);
  let clickCount = $state(0);
  let particles = $state<{id: number; x: number; y: number; size: number; color: string; angle: number; dist: number}[]>([]);
  let particleId = 0;

  const quotes = [
    "Stay focused, you got this!",
    "I believe in you! Keep going!",
    "One more pomodoro? Please?",
    "You're on fire today!",
    "Don't open Twitter... I'm watching.",
    "I leveled up thanks to you!",
    "Focus mode activated!",
    "Your streak is looking great!",
    "Pet me more, I like it!",
    "I'm your accountability buddy!",
    "Less scrolling, more coding!",
    "You're my favorite human!",
    "XP goes brrrrr!",
    "My HP is full, thanks to you!",
    "Let's crush this together!",
  ];

  const colors = ["#7ED957", "#F7B801", "#5B8CFF", "#B388FF", "#4ade80", "#fbbf24"];

  function petClick(e: MouseEvent) {
    bouncing = true;
    clickCount++;
    setTimeout(() => bouncing = false, 500);

    // Show random quote
    quote = quotes[Math.floor(Math.random() * quotes.length)];
    showQuote = true;
    setTimeout(() => showQuote = false, 2200);

    // Spawn glowing dot particles from click point
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const count = 8 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      const id = particleId++;
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const dist = 50 + Math.random() * 60;
      const size = 3 + Math.random() * 5;
      particles = [...particles, {
        id, x: cx, y: cy, size, angle, dist,
        color: colors[Math.floor(Math.random() * colors.length)]
      }];
      setTimeout(() => {
        particles = particles.filter(p => p.id !== id);
      }, 700);
    }
  }

  function download() {
    showInstallModal = true;
  }

  async function copyCommand() {
    await navigator.clipboard.writeText("xattr -cr /Applications/ClickGlow.app");
    copied = true;
    setTimeout(() => copied = false, 2000);
  }
</script>

<section class="hero">
  <div class="hero-glow"></div>
  <div class="container">
    <div class="hero-content">
      <div class="badge">Privacy-First &middot; macOS &middot; Open Source</div>
      <h1>Your Digital Life,<br/><span class="gradient-text">Gamified.</span></h1>
      <p class="hero-desc">
        Track keyboard, mouse & app activity with beautiful heatmaps.
        Raise a virtual pet that thrives when you focus — and suffers when you don't.
        All data stays on your Mac. Zero telemetry.
      </p>
      <div class="hero-actions">
        <button class="btn-primary" onclick={download}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Download for macOS
        </button>
        <a href="https://github.com/whereissam/ClickGlow" class="btn-secondary">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
          View on GitHub
        </a>
      </div>
      <div class="platform-tags">
        <span class="platform available"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 4-5 4-5-.5-.5-2-1-2-3 0-1.5 1-2.5 1-2.5s-1-2.5-3-2.5c-1.25 0-2.5 1.06-4 1.06s-2.75-1.06-4-1.06c-2 0-3 2.5-3 2.5s1 1 1 2.5c0 2-1.5 2.5-2 3 0 0 1 5 4 5 1.25 0 2.5-1.06 4-1.06z"/><circle cx="12" cy="6" r="3"/></svg> macOS</span>
        <span class="platform soon">Windows — Coming Soon</span>
        <span class="platform soon">Linux — Coming Soon</span>
      </div>
    </div>

    <div class="hero-visual">
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="hero-pet-scene">
        <!-- Speech bubble quote -->
        {#if showQuote}
          <div class="pet-quote">
            <span>{quote}</span>
            <div class="quote-tail"></div>
          </div>
        {/if}

        <div class="hero-pet" class:bounce={bouncing} onclick={petClick}>
          <div class="pet-body">
            <div class="pet-shine"></div>
          </div>
          <div class="pet-eyes">
            <span class="eye"><span class="pupil"></span></span>
            <span class="eye"><span class="pupil"></span></span>
          </div>
          <div class="pet-cheeks"><span class="cheek"></span><span class="cheek"></span></div>
          <div class="pet-mouth"></div>

          <!-- Click particles -->
          {#each particles as p (p.id)}
            <span
              class="particle"
              style="left: {p.x}px; top: {p.y}px; --dx: {Math.cos(p.angle) * p.dist}px; --dy: {Math.sin(p.angle) * p.dist}px; width: {p.size}px; height: {p.size}px; background: {p.color}; box-shadow: 0 0 {p.size * 2}px {p.color};"
            ></span>
          {/each}
        </div>

        <div class="pet-shadow"></div>
        <div class="pet-label">
          {#if clickCount === 0}
            Click me!
          {:else if clickCount < 5}
            {clickCount} clicks! Keep going!
          {:else if clickCount < 15}
            {clickCount} clicks! I'm so happy!
          {:else}
            {clickCount} clicks! You're amazing!
          {/if}
        </div>
      </div>
    </div>
  </div>
</section>

<!-- Install Modal -->
{#if showInstallModal}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="modal-overlay" onclick={() => showInstallModal = false}>
    <div class="modal-card" onclick={(e) => e.stopPropagation()}>
      <button class="modal-close" aria-label="Close" onclick={() => showInstallModal = false}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>

      <h2>One Last Step</h2>
      <p class="modal-desc">Since ClickGlow isn't code-signed by Apple, macOS will flag it as damaged.</p>

      <div class="modal-instructions">
        Drag the App into your Applications folder to install it, then copy and paste this command into your Terminal to allow it to run:
      </div>

      <div class="modal-terminal">
        <div class="terminal-header">
          <span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span>
          <span class="terminal-title">bash</span>
        </div>
        <div class="terminal-body">
          <span class="terminal-prompt">$</span> xattr -cr /Applications/ClickGlow.app
        </div>
      </div>

      <div class="modal-actions">
        <button class="btn-copy" onclick={copyCommand}>
          {#if copied}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>
            Copied!
          {:else}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
            Copy Command
          {/if}
        </button>
        <button class="btn-dismiss" onclick={() => showInstallModal = false}>Got it, close</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .hero { position: relative; padding: 140px 0 80px; overflow: hidden; }
  .hero-glow { position: absolute; top: -200px; left: 50%; transform: translateX(-50%); width: 800px; height: 600px; background: radial-gradient(ellipse, rgba(247,184,1,0.08) 0%, transparent 70%); pointer-events: none; }
  .container { max-width: 1100px; margin: 0 auto; padding: 0 24px; display: flex; align-items: center; gap: 32px; }
  .hero-content { flex: 1; min-width: 0; }
  .badge { display: inline-block; padding: 6px 16px; background: rgba(247,184,1,0.08); border: 1px solid rgba(247,184,1,0.2); border-radius: 20px; font-size: 12px; font-weight: 600; color: var(--accent); letter-spacing: 0.5px; margin-bottom: 24px; }
  h1 { font-size: 56px; font-weight: 700; line-height: 1.1; margin-bottom: 20px; }
  .gradient-text { background: linear-gradient(135deg, var(--accent), var(--accent-secondary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .hero-desc { font-size: 17px; color: var(--text-dim); line-height: 1.7; max-width: 480px; margin-bottom: 32px; }
  .hero-actions { display: flex; gap: 12px; margin-bottom: 20px; }
  .btn-primary { display: inline-flex; align-items: center; gap: 8px; padding: 14px 28px; background: linear-gradient(135deg, var(--accent), var(--accent-secondary)); color: #0a0a0f; border: none; border-radius: var(--radius-sm); font-family: "Space Grotesk", sans-serif; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
  .btn-primary:hover { filter: brightness(1.1); transform: translateY(-2px); }
  .btn-secondary { display: inline-flex; align-items: center; gap: 8px; padding: 14px 28px; background: var(--bg-card); border: 1px solid var(--border); color: var(--text-dim); border-radius: var(--radius-sm); font-size: 15px; font-weight: 500; text-decoration: none; transition: all 0.2s; }
  .btn-secondary:hover { background: var(--bg-hover); color: var(--text); text-decoration: none; }

  .platform-tags { display: flex; gap: 12px; flex-wrap: wrap; }
  .platform { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 500; padding: 4px 10px; border-radius: 6px; }
  .platform.available { color: var(--green); background: rgba(126,217,87,0.08); }
  .platform.soon { color: var(--text-muted); background: rgba(255,255,255,0.03); }

  /* Pet Visual — bigger, closer */
  .hero-visual { flex-shrink: 0; width: 320px; }
  .hero-pet-scene { position: relative; display: flex; flex-direction: column; align-items: center; gap: 12px; }

  /* Speech bubble */
  .pet-quote {
    position: absolute;
    top: -64px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(247,184,1,0.12);
    border: 1px solid rgba(247,184,1,0.25);
    border-radius: 16px;
    padding: 10px 18px;
    font-size: 14px;
    font-weight: 500;
    color: var(--accent);
    white-space: nowrap;
    animation: quoteIn 0.3s ease;
    z-index: 10;
  }
  .quote-tail {
    position: absolute;
    bottom: -8px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 8px solid transparent;
    border-right: 8px solid transparent;
    border-top: 8px solid rgba(247,184,1,0.25);
  }
  @keyframes quoteIn { from { opacity: 0; transform: translateX(-50%) translateY(8px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }

  .hero-pet {
    position: relative;
    cursor: pointer;
    transition: transform 0.3s;
    animation: petFloat 3s ease-in-out infinite;
    user-select: none;
  }
  .hero-pet:hover { transform: scale(1.08); }
  .hero-pet.bounce { animation: petBounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); }

  .pet-body {
    position: relative;
    width: 200px;
    height: 160px;
    background: linear-gradient(180deg, #8AE65C 0%, #5DC73A 40%, #3FA828 100%);
    border-radius: 50% 50% 46% 46% / 55% 55% 38% 38%;
    box-shadow:
      0 12px 48px rgba(126,217,87,0.35),
      0 0 80px rgba(126,217,87,0.12),
      inset 0 -8px 20px rgba(0,0,0,0.1);
    overflow: hidden;
  }

  .pet-shine {
    position: absolute;
    top: 12%;
    left: 18%;
    width: 28px;
    height: 20px;
    background: rgba(255,255,255,0.25);
    border-radius: 50%;
    filter: blur(4px);
  }

  .pet-eyes {
    position: absolute;
    top: 30%;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 36px;
  }

  .eye {
    position: relative;
    width: 28px;
    height: 32px;
    background: #fff;
    border-radius: 50%;
    animation: blink 4s ease-in-out infinite;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  }

  .pupil {
    position: absolute;
    bottom: 6px;
    left: 50%;
    transform: translateX(-50%);
    width: 14px;
    height: 16px;
    background: #1E1F24;
    border-radius: 50%;
  }

  .pupil::after {
    content: "";
    position: absolute;
    top: 3px;
    right: 3px;
    width: 5px;
    height: 5px;
    background: #fff;
    border-radius: 50%;
  }

  .pet-cheeks {
    position: absolute;
    top: 48%;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 80px;
  }

  .cheek {
    width: 24px;
    height: 14px;
    background: rgba(255,150,150,0.3);
    border-radius: 50%;
    filter: blur(3px);
  }

  .pet-mouth {
    position: absolute;
    top: 56%;
    left: 50%;
    transform: translateX(-50%);
    width: 28px;
    height: 14px;
    border-bottom: 4px solid rgba(30,31,36,0.6);
    border-radius: 0 0 50% 50%;
  }

  .pet-shadow {
    width: 140px;
    height: 16px;
    background: radial-gradient(ellipse, rgba(126,217,87,0.2), transparent);
    border-radius: 50%;
    animation: shadowPulse 3s ease-in-out infinite;
  }

  .pet-label {
    font-size: 13px;
    color: var(--text-muted);
    font-weight: 500;
    transition: all 0.3s;
  }

  /* Click particles — glowing dots */
  .particle {
    position: absolute;
    border-radius: 50%;
    pointer-events: none;
    animation: particleBurst 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
    z-index: 20;
  }

  @keyframes particleBurst {
    0% { opacity: 1; transform: translate(0, 0) scale(1); }
    60% { opacity: 0.8; transform: translate(var(--dx), var(--dy)) scale(0.8); }
    100% { opacity: 0; transform: translate(var(--dx), calc(var(--dy) - 20px)) scale(0); }
  }

  @keyframes petFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-16px); } }
  @keyframes petBounce {
    0% { transform: translateY(0) scale(1); }
    20% { transform: translateY(-32px) scale(1.12, 0.88); }
    50% { transform: translateY(-8px) scale(0.92, 1.08); }
    70% { transform: translateY(-16px) scale(1.04, 0.96); }
    100% { transform: translateY(0) scale(1); }
  }
  @keyframes blink { 0%, 92%, 100% { transform: scaleY(1); } 95% { transform: scaleY(0.1); } }
  @keyframes shadowPulse { 0%, 100% { transform: scaleX(1); opacity: 1; } 50% { transform: scaleX(0.7); opacity: 0.5; } }

  /* Install Modal */
  .modal-overlay { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.7); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; animation: fadeIn 0.2s ease; }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

  .modal-card { position: relative; width: 520px; max-width: 90vw; background: #1a1a22; border: 1px solid var(--border); border-radius: 20px; padding: 40px 36px 32px; animation: slideUp 0.3s ease; }
  @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }

  .modal-close { position: absolute; top: 16px; right: 16px; background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 4px; }
  .modal-close:hover { color: var(--text); }

  .modal-card h2 { font-size: 24px; font-weight: 700; margin-bottom: 8px; }
  .modal-desc { font-size: 14px; color: var(--text-dim); margin-bottom: 20px; }
  .modal-instructions { background: rgba(255,255,255,0.04); border-radius: var(--radius-sm); padding: 16px; font-size: 14px; color: var(--text-dim); line-height: 1.6; margin-bottom: 20px; }

  .modal-terminal { border-radius: 10px; overflow: hidden; border: 1px solid var(--border); margin-bottom: 24px; }
  .terminal-header { display: flex; align-items: center; gap: 6px; padding: 10px 14px; background: rgba(255,255,255,0.03); border-bottom: 1px solid var(--border); }
  .dot { width: 10px; height: 10px; border-radius: 50%; }
  .dot.red { background: #ff5f56; }
  .dot.yellow { background: #ffbd2e; }
  .dot.green { background: #27c93f; }
  .terminal-title { margin-left: auto; font-size: 12px; color: var(--text-muted); }
  .terminal-body { padding: 16px 18px; font-family: "SF Mono", "Fira Code", monospace; font-size: 14px; color: var(--text); background: #0e0e14; }
  .terminal-prompt { color: var(--text-muted); margin-right: 8px; }

  .modal-actions { display: flex; gap: 12px; }
  .btn-copy { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 14px; background: var(--text); color: #0a0a0f; border: none; border-radius: var(--radius-sm); font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
  .btn-copy:hover { opacity: 0.9; }
  .btn-dismiss { flex: 1; padding: 14px; background: var(--bg-hover); border: 1px solid var(--border); color: var(--text-dim); border-radius: var(--radius-sm); font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
  .btn-dismiss:hover { background: var(--bg-card); color: var(--text); }

  @media (max-width: 768px) {
    .container { flex-direction: column; text-align: center; gap: 40px; }
    h1 { font-size: 40px; }
    .hero-desc { max-width: 100%; }
    .hero-actions { justify-content: center; flex-wrap: wrap; }
    .platform-tags { justify-content: center; }
    .hero-visual { width: 260px; }
    .pet-body { width: 160px; height: 128px; }
    .pet-eyes { gap: 28px; }
    .eye { width: 22px; height: 26px; }
    .pupil { width: 11px; height: 13px; }
    .pet-cheeks { gap: 60px; }
  }
</style>
