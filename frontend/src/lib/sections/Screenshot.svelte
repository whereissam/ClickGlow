<section class="screenshot-section" id="preview">
  <div class="container">
    <h2 class="section-title">See it in action</h2>
    <p class="section-desc">A cozy game-inspired UI that makes data tracking feel fun.</p>
    <div class="screenshot-wrapper">
      <div class="browser-frame">
        <div class="browser-dots">
          <span class="dot red"></span>
          <span class="dot yellow"></span>
          <span class="dot green"></span>
        </div>
        <img src="/assets/screenshot.png" alt="ClickGlow Dashboard" class="screenshot-img" />
      </div>
    </div>
  </div>
</section>

<style>
  .screenshot-section { padding: 80px 0; }
  .container { max-width: 1000px; margin: 0 auto; padding: 0 24px; text-align: center; }
  .section-title { font-size: 40px; font-weight: 700; margin-bottom: 16px; }
  .section-desc { color: var(--text-dim); font-size: 17px; margin-bottom: 48px; }

  .screenshot-wrapper {
    perspective: 1000px;
  }

  .browser-frame {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 20px 80px rgba(0,0,0,0.5);
    transform: rotateX(2deg);
    transition: transform 0.4s;
  }

  .browser-frame:hover {
    transform: rotateX(0deg);
  }

  .browser-dots {
    display: flex;
    gap: 6px;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border);
  }

  .dot { width: 10px; height: 10px; border-radius: 50%; }
  .dot.red { background: #ff5f56; }
  .dot.yellow { background: #ffbd2e; }
  .dot.green { background: #27c93f; }

  .screenshot-img {
    width: 100%;
    display: block;
  }
</style>
