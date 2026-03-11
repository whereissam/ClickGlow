<footer class="footer">
  <div class="container">
    <div class="footer-top">
      <div class="footer-brand">
        <img src="/assets/logo.png" alt="ClickGlow" class="footer-logo" />
        <span class="footer-name">ClickGlow</span>
      </div>
      <p class="footer-tagline">Your digital life, gamified. Privacy-first.</p>
    </div>
    <div class="footer-bottom">
      <span class="footer-copy">Built with Tauri + Rust. All data stays local.</span>
      <div class="footer-links">
        <a href="https://github.com/whereissam/ClickGlow">GitHub</a>
        <a href="https://github.com/whereissam/ClickGlow/releases">Releases</a>
        <a href="https://github.com/whereissam/ClickGlow/issues">Issues</a>
      </div>
    </div>
  </div>
</footer>

<style>
  .footer {
    padding: 60px 0 32px;
    border-top: 1px solid var(--border);
  }

  .container {
    max-width: 1100px;
    margin: 0 auto;
    padding: 0 24px;
  }

  .footer-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 32px;
  }

  .footer-brand {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .footer-logo {
    width: 32px;
    height: 32px;
    border-radius: 8px;
  }

  .footer-name {
    font-family: "Space Grotesk", sans-serif;
    font-weight: 700;
    font-size: 18px;
    background: linear-gradient(135deg, var(--accent), var(--accent-secondary));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .footer-tagline {
    color: var(--text-muted);
    font-size: 14px;
  }

  .footer-bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 24px;
    border-top: 1px solid var(--border);
  }

  .footer-copy {
    color: var(--text-muted);
    font-size: 13px;
  }

  .footer-links {
    display: flex;
    gap: 20px;
  }

  .footer-links a {
    color: var(--text-dim);
    font-size: 13px;
    transition: color 0.2s;
  }

  .footer-links a:hover {
    color: var(--accent);
    text-decoration: none;
  }

  @media (max-width: 768px) {
    .footer-top, .footer-bottom { flex-direction: column; gap: 12px; text-align: center; }
  }
</style>
