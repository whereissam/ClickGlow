<script lang="ts">
  let openIndex = $state<number | null>(null);

  function toggle(i: number) {
    openIndex = openIndex === i ? null : i;
  }

  const faqs = [
    {
      q: "Is ClickGlow really free?",
      a: "Yes — ClickGlow is 100% free and open source under the MIT license. No premium tiers, no subscriptions, no ads."
    },
    {
      q: "Does it send my data anywhere?",
      a: "Never. All data is stored locally in a SQLite database on your Mac. There are zero network calls, zero analytics SDKs, and zero telemetry. Your keystroke and mouse data never leaves your machine."
    },
    {
      q: "Why does macOS say the app is damaged?",
      a: "ClickGlow isn't code-signed with an Apple Developer certificate yet. macOS quarantines unsigned apps by default. Run `xattr -cr /Applications/ClickGlow.app` in Terminal to fix it — this just removes the quarantine flag."
    },
    {
      q: "What permissions does it need?",
      a: "ClickGlow needs Accessibility permission to capture keyboard and mouse events. It also requests Screen Recording permission to detect which app is in the foreground. Both are standard macOS permissions for input tracking apps."
    },
    {
      q: "Will there be a Windows/Linux version?",
      a: "It's on the roadmap. ClickGlow is built with Tauri, which supports cross-platform builds. The Rust backend is already platform-agnostic — we just need to adapt the input capture layer for each OS."
    },
    {
      q: "How does the Focus Pet work?",
      a: "Your pet gains HP and XP when you complete Pomodoro focus sessions. It loses HP when you spend time on distraction sites (configurable). If HP reaches 0, your pet falls asleep and your streak resets. Earn enough XP and your pet evolves."
    },
    {
      q: "Can I export my data?",
      a: "Yes — you can export heatmaps as PNG images and view raw data in the SQLite database directly. We plan to add CSV export for all activity data in a future release."
    }
  ];
</script>

<section class="faq-section" id="faq">
  <div class="container">
    <h2 class="section-title">Frequently asked <span class="gradient-text">questions</span></h2>
    <p class="section-desc">Everything you need to know about ClickGlow.</p>

    <div class="faq-list">
      {#each faqs as faq, i}
        <button class="faq-item" class:open={openIndex === i} onclick={() => toggle(i)}>
          <div class="faq-question">
            <span>{faq.q}</span>
            <svg class="faq-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          {#if openIndex === i}
            <div class="faq-answer">{faq.a}</div>
          {/if}
        </button>
      {/each}
    </div>
  </div>
</section>

<style>
  .faq-section { padding: 100px 0; }
  .container { max-width: 720px; margin: 0 auto; padding: 0 24px; }
  .section-title { font-size: 40px; font-weight: 700; text-align: center; margin-bottom: 16px; }
  .gradient-text { background: linear-gradient(135deg, var(--accent), var(--accent-secondary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .section-desc { text-align: center; color: var(--text-dim); font-size: 17px; margin: 0 auto 48px; }

  .faq-list { display: flex; flex-direction: column; gap: 8px; }

  .faq-item {
    all: unset;
    cursor: pointer;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 20px 24px;
    transition: all 0.2s;
    width: 100%;
    box-sizing: border-box;
  }

  .faq-item:hover { border-color: rgba(247,184,1,0.2); }
  .faq-item.open { border-color: rgba(247,184,1,0.15); }

  .faq-question {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 15px;
    font-weight: 600;
    color: var(--text);
  }

  .faq-chevron {
    flex-shrink: 0;
    transition: transform 0.2s;
    color: var(--text-muted);
  }

  .faq-item.open .faq-chevron { transform: rotate(180deg); }

  .faq-answer {
    margin-top: 12px;
    font-size: 14px;
    color: var(--text-dim);
    line-height: 1.7;
  }

  @media (max-width: 768px) {
    .section-title { font-size: 30px; }
  }
</style>
