<script lang="ts">
  let showInstallModal = $state(false);
  let copied = $state(false);

  function download() {
    window.open("https://github.com/whereissam/ClickGlow/releases", "_blank");
    showInstallModal = true;
  }

  async function copyCommand() {
    await navigator.clipboard.writeText("xattr -cr /Applications/ClickGlow.app");
    copied = true;
    setTimeout(() => copied = false, 2000);
  }
</script>

<section class="cta-section">
  <div class="cta-glow"></div>
  <div class="container">
    <h2>Ready to gamify your<br/><span class="gradient-text">digital life?</span></h2>
    <p class="cta-desc">Free, open source, and privacy-first. Download ClickGlow and start tracking today.</p>
    <div class="cta-actions">
      <button class="btn-primary" onclick={download}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Download for macOS
      </button>
      <a href="https://github.com/whereissam/ClickGlow" class="btn-secondary">
        View Source on GitHub
      </a>
    </div>
  </div>
</section>

<!-- Install Modal (same as Hero) -->
{#if showInstallModal}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="modal-overlay" onclick={() => showInstallModal = false}>
    <div class="modal-card" onclick={(e) => e.stopPropagation()}>
      <button class="modal-close" aria-label="Close" onclick={() => showInstallModal = false}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
      <h3>One Last Step</h3>
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
  .cta-section {
    position: relative;
    padding: 120px 0;
    text-align: center;
    overflow: hidden;
  }

  .cta-glow {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 600px;
    height: 400px;
    background: radial-gradient(ellipse, rgba(247,184,1,0.06) 0%, transparent 70%);
    pointer-events: none;
  }

  .container {
    position: relative;
    max-width: 640px;
    margin: 0 auto;
    padding: 0 24px;
  }

  h2 { font-size: 48px; font-weight: 700; line-height: 1.1; margin-bottom: 20px; }
  .gradient-text { background: linear-gradient(135deg, var(--accent), var(--accent-secondary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .cta-desc { font-size: 17px; color: var(--text-dim); margin-bottom: 36px; line-height: 1.6; }

  .cta-actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }

  .btn-primary { display: inline-flex; align-items: center; gap: 8px; padding: 16px 32px; background: linear-gradient(135deg, var(--accent), var(--accent-secondary)); color: #0a0a0f; border: none; border-radius: var(--radius-sm); font-family: "Space Grotesk", sans-serif; font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
  .btn-primary:hover { filter: brightness(1.1); transform: translateY(-2px); }

  .btn-secondary { display: inline-flex; align-items: center; gap: 8px; padding: 16px 32px; background: var(--bg-card); border: 1px solid var(--border); color: var(--text-dim); border-radius: var(--radius-sm); font-size: 16px; font-weight: 500; text-decoration: none; transition: all 0.2s; }
  .btn-secondary:hover { background: var(--bg-hover); color: var(--text); text-decoration: none; }

  /* Modal — duplicated from Hero for encapsulation */
  .modal-overlay { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.7); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; animation: fadeIn 0.2s ease; }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .modal-card { position: relative; width: 520px; max-width: 90vw; background: #1a1a22; border: 1px solid var(--border); border-radius: 20px; padding: 40px 36px 32px; animation: slideUp 0.3s ease; }
  @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
  .modal-close { position: absolute; top: 16px; right: 16px; background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 4px; }
  .modal-close:hover { color: var(--text); }
  .modal-card h3 { font-size: 24px; font-weight: 700; margin-bottom: 8px; }
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
    h2 { font-size: 36px; }
  }
</style>
