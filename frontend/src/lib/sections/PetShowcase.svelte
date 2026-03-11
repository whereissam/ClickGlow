<script lang="ts">
  let activeSpecies = $state<"slime" | "dragon" | "wizard">("slime");
</script>

<section class="showcase" id="pet">
  <div class="container">
    <h2 class="section-title">Meet your <span class="gradient-text">Focus Pet</span></h2>
    <p class="section-desc">A Tamagotchi-style companion that lives and dies by your productivity. Evolve it from a humble Slime to a mighty Wizard.</p>

    <div class="evolution-track">
      <button class="evo-stage" class:active={activeSpecies === "slime"} onclick={() => activeSpecies = "slime"}>
        <div class="evo-pet" data-species="slime">
          <div class="evo-body"></div>
          <div class="evo-eyes"><span class="evo-eye"></span><span class="evo-eye"></span></div>
        </div>
        <span class="evo-label">Lv 1 · Slime</span>
        <span class="evo-xp">0 XP</span>
      </button>

      <div class="evo-arrow">→</div>

      <button class="evo-stage" class:active={activeSpecies === "dragon"} onclick={() => activeSpecies = "dragon"}>
        <div class="evo-pet" data-species="dragon">
          <div class="evo-body"></div>
          <div class="evo-eyes"><span class="evo-eye"></span><span class="evo-eye"></span></div>
        </div>
        <span class="evo-label">Lv 2 · Dragon</span>
        <span class="evo-xp">100 XP</span>
      </button>

      <div class="evo-arrow">→</div>

      <button class="evo-stage" class:active={activeSpecies === "wizard"} onclick={() => activeSpecies = "wizard"}>
        <div class="evo-pet" data-species="wizard">
          <div class="evo-body"></div>
          <div class="evo-eyes"><span class="evo-eye"></span><span class="evo-eye"></span></div>
        </div>
        <span class="evo-label">Lv 3 · Wizard</span>
        <span class="evo-xp">300 XP</span>
      </button>
    </div>

    <div class="rules-strip">
      <div class="rule good"><span class="rule-icon">+</span> Complete Pomodoro → +15 HP, +XP</div>
      <div class="rule bad"><span class="rule-icon">!</span> Distraction site → -3 HP / 10s</div>
      <div class="rule evolve"><span class="rule-icon">★</span> Evolve through focus, not grinding</div>
      <div class="rule mood"><span class="rule-icon">♥</span> HP=0 → Pet sleeps, streak resets</div>
    </div>
  </div>
</section>

<style>
  .showcase { padding: 100px 0; }
  .container { max-width: 900px; margin: 0 auto; padding: 0 24px; text-align: center; }
  .section-title { font-size: 40px; font-weight: 700; margin-bottom: 16px; }
  .gradient-text { background: linear-gradient(135deg, var(--green), #4CAF50); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .section-desc { color: var(--text-dim); font-size: 17px; max-width: 500px; margin: 0 auto 48px; line-height: 1.6; }

  .evolution-track {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 24px;
    margin-bottom: 48px;
  }

  .evo-arrow { font-size: 24px; color: var(--text-muted); }

  .evo-stage {
    all: unset;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 28px 36px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    transition: all 0.3s;
  }

  .evo-stage:hover { border-color: rgba(126,217,87,0.3); transform: translateY(-4px); }
  .evo-stage.active { border-color: var(--green); box-shadow: 0 0 30px rgba(126,217,87,0.1); }

  .evo-pet { position: relative; animation: evoBreathe 2.5s ease-in-out infinite; }
  .evo-body { border-radius: 50% 50% 45% 45% / 60% 60% 40% 40%; }

  .evo-pet[data-species="slime"] .evo-body { width: 56px; height: 42px; background: linear-gradient(180deg, #7ED957, #4CAF50); box-shadow: 0 4px 16px rgba(126,217,87,0.3); }
  .evo-pet[data-species="dragon"] .evo-body { width: 64px; height: 48px; background: linear-gradient(180deg, #FF6B35, #E53E3E); border-radius: 40% 40% 50% 50% / 50% 50% 40% 40%; box-shadow: 0 4px 16px rgba(255,107,53,0.3); }
  .evo-pet[data-species="wizard"] .evo-body { width: 56px; height: 48px; background: linear-gradient(180deg, #B388FF, #7C4DFF); border-radius: 35% 35% 50% 50% / 45% 45% 40% 40%; box-shadow: 0 4px 20px rgba(179,136,255,0.4); }

  .evo-eyes { position: absolute; top: 32%; left: 50%; transform: translateX(-50%); display: flex; gap: 12px; }
  .evo-eye { width: 6px; height: 7px; background: #1E1F24; border-radius: 50%; animation: blink 4s ease-in-out infinite; }

  @keyframes evoBreathe { 0%, 100% { transform: scaleY(1) scaleX(1); } 50% { transform: scaleY(1.05) scaleX(0.97); } }
  @keyframes blink { 0%, 92%, 100% { transform: scaleY(1); } 95% { transform: scaleY(0.1); } }

  .evo-label { font-family: "Space Grotesk", sans-serif; font-size: 14px; font-weight: 600; }
  .evo-xp { font-size: 12px; color: var(--text-muted); }

  .rules-strip {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 10px;
  }

  .rule {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    border-radius: 24px;
    font-size: 13px;
    font-weight: 600;
  }

  .rule-icon { font-size: 14px; }
  .rule.good { background: rgba(74,222,128,0.08); color: #4ade80; }
  .rule.bad { background: rgba(248,113,113,0.08); color: #f87171; }
  .rule.evolve { background: rgba(168,85,247,0.08); color: #a855f7; }
  .rule.mood { background: rgba(251,191,36,0.08); color: #fbbf24; }

  @media (max-width: 768px) {
    .evolution-track { flex-direction: column; }
    .evo-arrow { transform: rotate(90deg); }
    .section-title { font-size: 30px; }
  }
</style>
