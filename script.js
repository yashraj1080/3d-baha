(function () {
  'use strict';

  gsap.registerPlugin(ScrollTrigger);

  // ── Config ──────────────────────────────────────────────────────────────────
  const TOTAL_FRAMES  = 240;
  const FRAME_DIR     = 'ezgif-8c0347b71bd87244-jpg/';
  const FRAME_PREFIX  = 'ezgif-frame-';
  const FRAME_EXT     = '.jpg';

  // [startScrollFraction, endScrollFraction, startFrame, endFrame]
  const FRAME_MAP = [
    [0.00, 0.15, 1,   1],    // HERO
    [0.15, 0.35, 1,   60],   // ABOUT/ENGINEERING
    [0.35, 0.55, 60,  120],  // PERFORMANCE
    [0.55, 0.75, 120, 180],  // POWER
    [0.75, 0.90, 180, 240],  // FINAL REVEAL
    [0.90, 1.00, 240, 240],  // HOLD
  ];

  // ── State ───────────────────────────────────────────────────────────────────
  const images       = [];
  let   currentFrame = 0;
  let   loadedCount  = 0;
  let   canvas, ctx;
  let   dpr = 1;

  function pad(n) {
    return String(n).padStart(3, '0');
  }

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

  function drawFrame(idx) {
    idx = Math.max(1, Math.min(TOTAL_FRAMES, Math.round(idx)));
    const img = images[idx - 1];
    if (!img || !img.complete || img.naturalWidth === 0) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const iW = img.naturalWidth;
    const iH = img.naturalHeight;
    const scale = Math.max(W / iW, H / iH);
    const dw = iW * scale;
    const dh = iH * scale;
    const dx = (W - dw) / 2;
    const dy = (H - dh) / 2;

    ctx.drawImage(img, dx, dy, dw, dh);
    currentFrame = idx;

    const hudFrame = document.getElementById('hud-frame');
    if (hudFrame) hudFrame.textContent = pad(idx) + '/' + TOTAL_FRAMES;
  }

  function resizeCanvas() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width  = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    drawFrame(currentFrame);
  }

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

  // ── Counters ─────────────────────────────────────────────────────────────────
  function initCounters() {
    const counters = document.querySelectorAll('.counter');
    counters.forEach(counter => {
      ScrollTrigger.create({
        trigger: counter,
        start: 'top 90%',
        once: true,
        onEnter: () => {
          const target = +counter.getAttribute('data-target');
          gsap.to(counter, {
            innerHTML: target,
            duration: 2,
            snap: { innerHTML: 1 },
            ease: "power2.out"
          });
        }
      });
    });
  }

  // ── GSAP setup ───────────────────────────────────────────────────────────────
  function setupGSAP() {
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

    // Nav blur
    ScrollTrigger.create({
      start: 50,
      onEnter:  () => document.getElementById('site-nav').classList.add('scrolled'),
      onLeaveBack: () => document.getElementById('site-nav').classList.remove('scrolled'),
    });

    // Section dots
    const dotSections = [
      '#hero',
      '#sec-about',
      '#sec-vehicle',
      '#sec-team',
      '#sec-achievements',
      '#sec-sponsors',
      '#sec-gallery',
      '#sec-contact',
    ].map(sel => document.querySelector(sel)).filter(Boolean);
    const dots = Array.from(document.querySelectorAll('.sd'));

    dotSections.forEach((sec, i) => {
      ScrollTrigger.create({
        trigger: sec,
        start: 'top 55%',
        end: 'bottom 55%',
        onEnter: () => updateDot(i),
        onEnterBack: () => updateDot(i),
      });
    });

    function updateDot(i) {
      dots.forEach((d, j) => {
        if (i === j) d.classList.add('active');
        else d.classList.remove('active');
      });
    }

    // Text reveals
    document.querySelectorAll('.reveal').forEach(el => {
      gsap.fromTo(el, 
        { opacity: 0, y: 30 },
        {
          scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none reverse' },
          opacity: 1, y: 0, duration: 1, ease: 'power3.out', delay: parseFloat(el.style.getPropertyValue('--d')) || 0
        }
      );
    });

    document.querySelectorAll('.reveal-up').forEach(el => {
      gsap.fromTo(el, 
        { opacity: 0, y: 60 },
        {
          scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none reverse' },
          opacity: 1, y: 0, duration: 1.2, ease: 'power3.out', delay: parseFloat(el.style.getPropertyValue('--d')) || 0
        }
      );
    });

    ScrollTrigger.refresh();
  }

  // ── Idle Anim ────────────────────────────────────────────────────────────────
  let idleRaf  = null;
  let idleFrame = 1;
  let idleDir   = 1;

  function startIdle() {
    function tick() {
      idleRaf = requestAnimationFrame(tick);
      idleFrame += 0.1 * idleDir;
      if (idleFrame >= 15) { idleFrame = 15; idleDir = -1; }
      if (idleFrame <= 1)  { idleFrame = 1;  idleDir =  1; }
      drawFrame(Math.round(idleFrame));
    }
    tick();
  }

  function stopIdle() {
    if (idleRaf) { cancelAnimationFrame(idleRaf); idleRaf = null; }
  }

  // ── Loader ───────────────────────────────────────────────────────────────────
  function loadFrames(onComplete) {
    const bar = document.getElementById('loader-bar');
    const pct = document.getElementById('loader-pct');

    for (let i = 1; i <= TOTAL_FRAMES; i++) {
      const img = new Image();
      img.src = FRAME_DIR + FRAME_PREFIX + pad(i) + FRAME_EXT;
      images.push(img);

      img.onload = img.onerror = () => {
        loadedCount++;
        const p = loadedCount / TOTAL_FRAMES;
        if (bar) bar.style.width = (p * 100) + '%';
        if (pct) pct.textContent = Math.round(p * 100) + '%';
        if (loadedCount === TOTAL_FRAMES) onComplete();
      };
    }
  }

  // ── UI Interactions ──────────────────────────────────────────────────────────
  function initInteractions() {
    // Scroll buttons
    document.querySelectorAll('[data-scroll-to]').forEach(el => {
      el.addEventListener('click', e => {
        e.preventDefault();
        const target = document.querySelector(el.dataset.scrollTo);
        if (target) target.scrollIntoView({ behavior: 'smooth' });
        document.getElementById('nav-drawer').classList.remove('active');
      });
    });

    // Dots also scroll
    document.querySelectorAll('#sec-dots .sd[data-scroll-to]').forEach(el => {
      el.addEventListener('click', e => {
        e.preventDefault();
        const target = document.querySelector(el.dataset.scrollTo);
        if (target) target.scrollIntoView({ behavior: 'smooth' });
      });
    });

    // Mobile menu
    const burger = document.getElementById('nav-burger');
    const drawer = document.getElementById('nav-drawer');
    if (burger && drawer) {
      burger.addEventListener('click', () => {
        drawer.classList.toggle('active');
      });
    }

    // Premium hover spotlight on department cards
    document.querySelectorAll('.dept-card').forEach(card => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width) * 100;
        const y = ((e.clientY - r.top) / r.height) * 100;
        card.style.setProperty('--mx', x + '%');
        card.style.setProperty('--my', y + '%');
      });
    });
  }

  function init() {
    canvas = document.getElementById('buggy-canvas');
    ctx    = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    initInteractions();

    loadFrames(() => {
      const loader = document.getElementById('loader');
      gsap.to(loader, {
        opacity: 0, duration: 1, ease: 'power2.out', delay: 0.5,
        onComplete: () => {
          loader.style.display = 'none';
          startIdle();
          let scrollStarted = false;
          window.addEventListener('scroll', () => {
            if (!scrollStarted && window.scrollY > 10) {
              scrollStarted = true;
              stopIdle();
            }
          }, { passive: true });
        }
      });

      drawFrame(1);
      setupGSAP();
      initCounters();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
