<section class="features" id="features">
  <div class="container">
    <h2 class="section-title">Everything you need to<br/><span class="gradient-text">understand your digital habits.</span></h2>
    <p class="section-desc">ClickGlow tracks what you do on your Mac and turns it into beautiful visualizations — all without sending a single byte to the cloud.</p>

    <div class="features-grid">
      <div class="feature-card highlight">
        <div class="feature-icon" style="background: rgba(247,184,1,0.1); color: #F7B801;">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7" opacity="0.5"/><circle cx="12" cy="12" r="10" opacity="0.25"/></svg>
        </div>
        <h3>Mouse Heatmaps</h3>
        <p>See exactly where you click and move. Beautiful gradient heatmaps with click-only and movement filters. Export as PNG.</p>
      </div>

      <div class="feature-card">
        <div class="feature-icon" style="background: rgba(91,140,255,0.1); color: #5B8CFF;">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h0m4 0h0m4 0h0m4 0h0m-10 4h8"/></svg>
        </div>
        <h3>Keyboard Analytics</h3>
        <p>Discover your most-used keys with frequency charts. See your peak typing hours and track keystroke patterns.</p>
      </div>

      <div class="feature-card">
        <div class="feature-icon" style="background: rgba(126,217,87,0.1); color: #7ED957;">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="10" r="7"/><path d="M8 14c0 2.2 1.8 4 4 4s4-1.8 4-4"/><circle cx="9" cy="9" r="1" fill="currentColor"/><circle cx="15" cy="9" r="1" fill="currentColor"/></svg>
        </div>
        <h3>Focus Pet</h3>
        <p>Raise a virtual Tamagotchi that thrives on your productivity. Complete pomodoros to earn XP. Visit YouTube — your pet takes damage.</p>
      </div>

      <div class="feature-card">
        <div class="feature-icon" style="background: rgba(179,136,255,0.1); color: #B388FF;">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
        </div>
        <h3>App Tracking</h3>
        <p>Auto-categorize apps as productive, neutral, or distraction. See time breakdowns and catch your #1 "Time Thief" with a wanted poster.</p>
      </div>

      <div class="feature-card">
        <div class="feature-icon" style="background: rgba(255,107,53,0.1); color: #FF6B35;">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        </div>
        <h3>Weekly Reports</h3>
        <p>Auto-generated weekly summaries with charts, top keys, peak hours, and daily averages. Track your progress over time.</p>
      </div>

      <div class="feature-card">
        <div class="feature-icon" style="background: rgba(248,113,113,0.1); color: #f87171;">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        </div>
        <h3>100% Private</h3>
        <p>All data stored locally in SQLite. Zero network calls, zero telemetry, zero cloud. Your data never leaves your Mac.</p>
      </div>
    </div>
  </div>
</section>

<style>
  .features {
    padding: 100px 0;
  }

  .container {
    max-width: 1100px;
    margin: 0 auto;
    padding: 0 24px;
  }

  .section-title {
    font-size: 40px;
    font-weight: 700;
    text-align: center;
    margin-bottom: 16px;
    line-height: 1.2;
  }

  .gradient-text {
    background: linear-gradient(135deg, var(--accent), var(--accent-secondary));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .section-desc {
    text-align: center;
    color: var(--text-dim);
    font-size: 17px;
    max-width: 560px;
    margin: 0 auto 60px;
    line-height: 1.6;
  }

  .features-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
  }

  .feature-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 32px 28px;
    transition: all 0.3s ease;
  }

  .feature-card:hover {
    border-color: rgba(247,184,1,0.2);
    transform: translateY(-4px);
    box-shadow: 0 12px 40px rgba(0,0,0,0.3);
  }

  .feature-card.highlight {
    border-color: rgba(247,184,1,0.15);
    box-shadow: 0 0 30px rgba(247,184,1,0.03);
  }

  .feature-icon {
    width: 52px;
    height: 52px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 20px;
  }

  h3 {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 10px;
  }

  .feature-card p {
    font-size: 14px;
    color: var(--text-dim);
    line-height: 1.6;
  }

  @media (max-width: 768px) {
    .features-grid { grid-template-columns: 1fr; }
    .section-title { font-size: 30px; }
  }
</style>
