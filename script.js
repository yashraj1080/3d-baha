/* =============================================================================
   TEAM PREDATORS RACING — Image Sequence Scroll Engine
   Apple-style canvas scrubber: 240 JPG frames synced to scroll progress
   ============================================================================= */

(function () {
  'use strict';

  gsap.registerPlugin(ScrollTrigger);

  // ── Config ──────────────────────────────────────────────────────────────────
  const TOTAL_FRAMES  = 240;
  const FRAME_DIR     = 'ezgif-8c0347b71bd87244-jpg/';
  const FRAME_PREFIX  = 'ezgif-frame-';
  const FRAME_EXT     = '.jpg';

  // Scroll-to-frame mapping:
  // Each scroll section controls which frame range plays
  // [scrollStartFraction, scrollEndFraction, frameStart, frameEnd]
  // Fractions are proportional to total page scroll height
  const FRAME_MAP = [
    [0.00, 0.12, 1,   1],    // HERO    — static first frame (front 3/4 view)
    [0.12, 0.30, 1,   60],   // ENGINEERING — rotate to side showing chassis
    [0.30, 0.48, 60,  120],  // PERFORMANCE — continue rotating, suspension visible
    [0.48, 0.65, 120, 180],  // POWER   — rear three-quarter view showing engine area
    [0.65, 0.78, 180, 210],  // FINAL   — slow to dramatic front stance
    [0.78, 1.00, 210, 240],  // HOLD at final (full 360° completion)
  ];

  // ── State ───────────────────────────────────────────────────────────────────
  const images       = [];
  let   currentFrame = 0;
  let   loadedCount  = 0;
  let   canvas, ctx, containerW, containerH;

  // ── Pad frame number ────────────────────────────────────────────────────────
  function pad(n) {
    return String(n).padStart(3, '0');
  }

  // ── Get frame index from scroll progress ────────────────────────────────────
  function frameAtProgress(p) {
    p = Math.max(0, Math.min(1, p));
    for (const [s, e, fs, fe] of FRAME_MAP) {
      if (p >= s && p <= e) {
        const local = (p - s) / (e - s);
        return Math.round(fs + local * (fe - fs));
      }
    }
    return TOTAL_FRAMES;
  }

  // ── Draw a frame ────────────────────────────────────────────────────────────
  function drawFrame(idx) {
    idx = Math.max(1, Math.min(TOTAL_FRAMES, Math.round(idx)));
    const img = images[idx - 1];
    if (!img || !img.complete || img.naturalWidth === 0) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Cover-fit, centred
    const iW = img.naturalWidth;
    const iH = img.naturalHeight;
    const scale = Math.max(W / iW, H / iH);
    const dw = iW * scale;
    const dh = iH * scale;
    const dx = (W - dw) / 2;
    const dy = (H - dh) / 2;

    ctx.drawImage(img, dx, dy, dw, dh);
    currentFrame = idx;

    // Update HUD
    const hudFrame = document.getElementById('hud-frame');
    if (hudFrame) hudFrame.textContent = pad(idx) + '/' + TOTAL_FRAMES;
  }

  // ── Resize canvas ────────────────────────────────────────────────────────────
  function resizeCanvas() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    drawFrame(currentFrame);
  }

  // ── Smooth scroll-driven frame update ────────────────────────────────────────
  const scrubProxy = { progress: 0 };
  let   rafPending = false;

  function onScrollUpdate(self) {
    scrubProxy.progress = self.progress;
    if (!rafPending) {
      rafPending = true;
      requestAnimationFrame(() => {
        rafPending = false;
        const frame = frameAtProgress(scrubProxy.progress);
        drawFrame(frame);
      });
    }
  }

  // ── GSAP scroll setup ────────────────────────────────────────────────────────
  function setupGSAP() {
    // Master scrubber
    gsap.to(scrubProxy, {
      progress: 1,
      ease: 'none',
      scrollTrigger: {
        trigger: '#scroll-main',
        start: 'top top',
        end: 'bottom bottom',
        scrub: true,
        onUpdate: onScrollUpdate,
      }
    });

    // Nav glass on scroll
    ScrollTrigger.create({
      start: 60,
      onEnter:  () => document.getElementById('site-nav').classList.add('glass'),
      onLeaveBack: () => document.getElementById('site-nav').classList.remove('glass'),
    });

    // Section dot tracking
    const sections = document.querySelectorAll('.scroll-section');
    const dots      = document.querySelectorAll('.s-dot');
    sections.forEach((sec, i) => {
      ScrollTrigger.create({
        trigger: sec,
        start: 'top 55%',
        end: 'bottom 45%',
        onEnter:      () => updateDot(i),
        onEnterBack:  () => updateDot(i),
      });
    });
    function updateDot(i) {
      dots.forEach((d, j) => d.classList.toggle('active', i === j));
    }

    // GSAP text reveals
    document.querySelectorAll('.reveal').forEach(el => {
      // Skip hero elements (they have CSS animations already)
      if (el.closest('#hero')) return;
      gsap.from(el, {
        scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none reverse' },
        y: 45, opacity: 0, duration: 1.0, ease: 'power3.out',
      });
    });

    // Stagger spec-cards
    document.querySelectorAll('.spec-card, .team-card, .spc-card').forEach((el, i) => {
      gsap.from(el, {
        scrollTrigger: { trigger: el, start: 'top 90%', toggleActions: 'play none none reverse' },
        y: 35, opacity: 0, duration: .8, delay: (i % 4) * 0.1, ease: 'power3.out',
      });
    });

    ScrollTrigger.refresh();
  }

  // ── Hero idle rotation ────────────────────────────────────────────────────────
  // While the user hasn't scrolled, slowly animate through first 15 frames
  let idleRaf  = null;
  let idleFrame = 1;
  let idleDir   = 1;

  function startIdle() {
    function tick() {
      idleRaf = requestAnimationFrame(tick);
      idleFrame += 0.15 * idleDir;
      if (idleFrame >= 15) idleDir = -1;
      if (idleFrame <= 1)  idleDir =  1;
      drawFrame(Math.round(idleFrame));
    }
    tick();
  }

  function stopIdle() {
    if (idleRaf) { cancelAnimationFrame(idleRaf); idleRaf = null; }
  }

  // ── Load all frames ──────────────────────────────────────────────────────────
  function loadFrames(onComplete) {
    const bar    = document.getElementById('loader-bar');
    const pct    = document.getElementById('loader-pct');
    const status = document.getElementById('loader-status');

    for (let i = 1; i <= TOTAL_FRAMES; i++) {
      const img = new Image();
      img.src = FRAME_DIR + FRAME_PREFIX + pad(i) + FRAME_EXT;
      images.push(img);

      img.onload = img.onerror = () => {
        loadedCount++;
        const p = loadedCount / TOTAL_FRAMES;
        if (bar) bar.style.width = (p * 100).toFixed(1) + '%';
        if (pct) pct.textContent = Math.round(p * 100) + '%';
        if (loadedCount === TOTAL_FRAMES) onComplete();
      };
    }
  }

  // ── Scroll-to helper ─────────────────────────────────────────────────────────
  function initScrollButtons() {
    document.querySelectorAll('[data-scroll-to]').forEach(el => {
      el.addEventListener('click', e => {
        e.preventDefault();
        const target = document.querySelector(el.dataset.scrollTo);
        if (target) target.scrollIntoView({ behavior: 'smooth' });
      });
    });
  }

  // ── Main ─────────────────────────────────────────────────────────────────────
  function init() {
    canvas = document.getElementById('buggy-canvas');
    ctx    = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    initScrollButtons();

    loadFrames(() => {
      // Hide loader
      const loader = document.getElementById('loader');
      gsap.to(loader, {
        opacity: 0, duration: 1.5, ease: 'power2.out',
        onComplete: () => {
          loader.style.display = 'none';
          // Start idle rotation on hero
          startIdle();
          // Kill idle once user scrolls
          let scrollStarted = false;
          window.addEventListener('scroll', () => {
            if (!scrollStarted && window.scrollY > 10) {
              scrollStarted = true;
              stopIdle();
            }
          }, { passive: true });
        }
      });

      // Draw frame 1 immediately
      drawFrame(1);
      setupGSAP();
    });
  }

  // ── Boot ─────────────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
