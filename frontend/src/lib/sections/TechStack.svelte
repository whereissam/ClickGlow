<section class="techstack">
  <div class="container">
    <h2 class="section-title">Built with <span class="gradient-text">serious tech.</span></h2>
    <p class="section-desc">ClickGlow uses a native-first architecture. No Electron bloat, no web wrappers — just Rust and SQLite doing the heavy lifting.</p>

    <div class="stack-grid">
      <div class="stack-card">
        <div class="stack-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
        </div>
        <h3>Tauri v2</h3>
        <p>Native macOS window with a tiny footprint. 10x smaller than Electron.</p>
      </div>

      <div class="stack-card">
        <div class="stack-icon rust">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
        </div>
        <h3>Rust Backend</h3>
        <p>System-level event capture, zero crashes, memory-safe by design.</p>
      </div>

      <div class="stack-card">
        <div class="stack-icon sqlite">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4.03 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/></svg>
        </div>
        <h3>SQLite</h3>
        <p>All data stored locally. Fast queries, zero network calls, fully offline.</p>
      </div>

      <div class="stack-card">
        <div class="stack-icon js">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9v6m6-6v6"/></svg>
        </div>
        <h3>Vanilla JS Frontend</h3>
        <p>Lightweight UI with zero framework overhead. Canvas-based heatmap rendering.</p>
      </div>
    </div>

    <div class="comparison">
      <div class="comparison-header">
        <span></span>
        <span class="comp-label you">ClickGlow</span>
        <span class="comp-label them">Typical Tracker</span>
      </div>
      <div class="comparison-row">
        <span class="comp-feature">Data storage</span>
        <span class="comp-value good">Local SQLite</span>
        <span class="comp-value bad">Cloud server</span>
      </div>
      <div class="comparison-row">
        <span class="comp-feature">Telemetry</span>
        <span class="comp-value good">Zero</span>
        <span class="comp-value bad">Analytics SDK</span>
      </div>
      <div class="comparison-row">
        <span class="comp-feature">App size</span>
        <span class="comp-value good">~8 MB</span>
        <span class="comp-value bad">200+ MB</span>
      </div>
      <div class="comparison-row">
        <span class="comp-feature">RAM usage</span>
        <span class="comp-value good">~30 MB</span>
        <span class="comp-value bad">300+ MB</span>
      </div>
      <div class="comparison-row">
        <span class="comp-feature">Gamification</span>
        <span class="comp-value good">Built-in pet</span>
        <span class="comp-value bad">None</span>
      </div>
      <div class="comparison-row">
        <span class="comp-feature">Price</span>
        <span class="comp-value good">Free & open source</span>
        <span class="comp-value bad">$5-15/mo</span>
      </div>
    </div>
  </div>
</section>

<style>
  .techstack { padding: 100px 0; }
  .container { max-width: 1000px; margin: 0 auto; padding: 0 24px; }
  .section-title { font-size: 40px; font-weight: 700; text-align: center; margin-bottom: 16px; }
  .gradient-text { background: linear-gradient(135deg, var(--accent), var(--accent-secondary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .section-desc { text-align: center; color: var(--text-dim); font-size: 17px; max-width: 520px; margin: 0 auto 60px; line-height: 1.6; }

  .stack-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-bottom: 64px;
  }

  .stack-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 28px 20px;
    text-align: center;
    transition: all 0.3s;
  }

  .stack-card:hover {
    border-color: rgba(247,184,1,0.2);
    transform: translateY(-4px);
  }

  .stack-icon {
    width: 56px;
    height: 56px;
    margin: 0 auto 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 14px;
    background: rgba(247,184,1,0.08);
    color: var(--accent);
  }

  .stack-icon.rust { background: rgba(255,107,53,0.08); color: #FF6B35; }
  .stack-icon.sqlite { background: rgba(91,140,255,0.08); color: #5B8CFF; }
  .stack-icon.js { background: rgba(251,191,36,0.08); color: #fbbf24; }

  .stack-card h3 { font-size: 16px; font-weight: 600; margin-bottom: 8px; }
  .stack-card p { font-size: 13px; color: var(--text-dim); line-height: 1.5; }

  /* Comparison Table */
  .comparison {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
  }

  .comparison-header {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    padding: 16px 24px;
    background: rgba(255,255,255,0.02);
    border-bottom: 1px solid var(--border);
  }

  .comp-label {
    font-size: 13px;
    font-weight: 700;
    text-align: center;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .comp-label.you { color: var(--accent); }
  .comp-label.them { color: var(--text-muted); }

  .comparison-row {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    padding: 14px 24px;
    border-bottom: 1px solid rgba(255,255,255,0.03);
    transition: background 0.2s;
  }

  .comparison-row:last-child { border-bottom: none; }
  .comparison-row:hover { background: rgba(255,255,255,0.02); }

  .comp-feature {
    font-size: 14px;
    color: var(--text-dim);
    font-weight: 500;
  }

  .comp-value {
    font-size: 14px;
    text-align: center;
    font-weight: 500;
  }

  .comp-value.good { color: var(--green); }
  .comp-value.bad { color: var(--text-muted); }

  @media (max-width: 768px) {
    .stack-grid { grid-template-columns: repeat(2, 1fr); }
    .section-title { font-size: 30px; }
    .comparison-header, .comparison-row { grid-template-columns: 1.2fr 1fr 1fr; font-size: 12px; padding: 12px 16px; }
  }
</style>
