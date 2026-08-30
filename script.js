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
  let   currentYear  = '2027';

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

    // Timeline spine progress animation
    gsap.fromTo('.ach-spine-progress', 
      { height: '0%' },
      {
        scrollTrigger: {
          trigger: '.ach-timeline',
          start: 'top 25%',
          end: 'bottom 75%',
          scrub: true
        },
        height: '100%',
        ease: 'none'
      }
    );

    // Active state toggles for timeline items
    document.querySelectorAll('.ach-item').forEach(item => {
      ScrollTrigger.create({
        trigger: item,
        start: 'top 65%',
        end: 'bottom 35%',
        onEnter: () => item.classList.add('active'),
        onEnterBack: () => item.classList.add('active'),
        onLeave: () => item.classList.remove('active'),
        onLeaveBack: () => item.classList.remove('active')
      });
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

  // ── Year State & Rendering ──────────────────────────────────────────────────
  function renderYearData(year) {
    const data = window.YEARLY_DATA[year];
    if (!data) return;

    // 1. Vehicle Showcase Section
    const vehicleTitle = document.getElementById('vehicle-title');
    if (vehicleTitle) {
      const words = data.vehicle.tagline.split(' ');
      vehicleTitle.innerHTML = `${words[0]}<br><em>${words.slice(1).join(' ')}</em>`;
    }
    const vehicleDesc = document.getElementById('vehicle-desc');
    if (vehicleDesc) vehicleDesc.textContent = data.vehicle.description;

    const specGrid = document.getElementById('spec-grid-container');
    if (specGrid) {
      specGrid.innerHTML = data.vehicle.specs.map((spec, index) => `
        <div class="spec-card reveal" style="--d:${index * 0.1}s">
          <div class="sc-num">${spec.num}</div>
          <h3>${spec.title}</h3>
          <p>${spec.desc}</p>
        </div>
      `).join('');
    }

    // 2. Performance Section
    const perfTitle = document.getElementById('perf-title');
    if (perfTitle) {
      const words = data.vehicle.performance.tagline.split(' ');
      perfTitle.innerHTML = `${words[0]}<br><em>${words.slice(1).join(' ')}</em>`;
    }
    const perfDesc = document.getElementById('perf-desc');
    if (perfDesc) perfDesc.textContent = data.vehicle.performance.description;

    const perfBars = document.getElementById('perf-bars-container');
    if (perfBars) {
      perfBars.innerHTML = data.vehicle.performance.bars.map((bar, index) => `
        <div class="pbar reveal" style="--d:${index * 0.05}s">
          <div class="pbar-head"><span>${bar.label}</span><strong>${bar.value}</strong></div>
          <div class="pbar-track"><div class="pbar-fill ${index >= 2 ? 'accent' : ''}" style="--w:${bar.width}"></div></div>
        </div>
      `).join('');
    }

    // 3. Power Section
    const powerTitle = document.getElementById('power-title');
    if (powerTitle) {
      const words = data.vehicle.power.tagline.split(' ');
      powerTitle.innerHTML = `${words[0]}<br><em>${words.slice(1).join(' ')}</em>`;
    }
    const powerDesc = document.getElementById('power-desc');
    if (powerDesc) powerDesc.textContent = data.vehicle.power.description;

    const powerGrid = document.getElementById('power-grid-container');
    if (powerGrid) {
      powerGrid.innerHTML = `
        <div class="pg-item reveal">
          <div class="pg-val"><span class="counter" data-target="${data.vehicle.power.hp}">0</span><em>hp</em></div>
          <div class="pg-label">Max Power</div>
        </div>
        <div class="pg-item reveal" style="--d:.1s">
          <div class="pg-val"><span class="counter" data-target="${data.vehicle.power.cc}">0</span><em>cc</em></div>
          <div class="pg-label">Displacement</div>
        </div>
        <div class="pg-item reveal" style="--d:.15s">
          <div class="pg-val">${data.vehicle.power.transmission}</div>
          <div class="pg-label">Transmission</div>
        </div>
        <div class="pg-item reveal" style="--d:.2s">
          <div class="pg-val">${data.vehicle.power.ratio}</div>
          <div class="pg-label">Final Ratio</div>
        </div>
      `;
    }
    const powerEnduranceDesc = document.getElementById('power-endurance-desc');
    if (powerEnduranceDesc) powerEnduranceDesc.textContent = data.vehicle.power.endurance;

    // 4. HUD Updates
    const hudVehicle = document.getElementById('hud-vehicle');
    if (hudVehicle) hudVehicle.textContent = data.vehicle.name;

    const hudStatus = document.getElementById('hud-status');
    if (hudStatus) {
      hudStatus.textContent = data.status;
      if (data.status === 'ACTIVE') {
        hudStatus.className = 'hv live';
      } else {
        hudStatus.className = 'hv';
      }
    }

    // 5. Team Section
    const teamContainer = document.getElementById('team-members-container');
    if (teamContainer) {
      teamContainer.innerHTML = data.team.map((member, index) => {
        const initials = member.name.split(' ').map(n => n[0]).join('').toUpperCase();
        const linkedinHtml = member.linkedin ? `
          <a href="${member.linkedin}" target="_blank" rel="noopener noreferrer" class="tm-linkedin" aria-label="${member.name} LinkedIn">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
            </svg>
          </a>
        ` : '';
        return `
          <div class="tm-card reveal" style="--d:${index * 0.06}s">
            <div class="tm-photo-wrap">
              <div class="tm-photo-placeholder">${initials}</div>
              <img src="${member.photo}" alt="${member.name}" class="tm-photo" onerror="this.style.display='none';" />
            </div>
            <h4>${member.name}</h4>
            <p>${member.role}</p>
            ${linkedinHtml}
          </div>
        `;
      }).join('');
    }
  }

  function killTriggersInContainer(container) {
    if (!container) return;
    ScrollTrigger.getAll().forEach(trigger => {
      if (trigger.trigger && container.contains(trigger.trigger)) {
        trigger.kill();
      }
    });
  }

  function animateNewElements(container) {
    if (!container) return;

    // Counters
    container.querySelectorAll('.counter').forEach(counter => {
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

    // Reveal elements
    container.querySelectorAll('.reveal').forEach(el => {
      gsap.fromTo(el, 
        { opacity: 0, y: 30 },
        {
          scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none reverse' },
          opacity: 1, y: 0, duration: 1, ease: 'power3.out', delay: parseFloat(el.style.getPropertyValue('--d')) || 0
        }
      );
    });

    container.querySelectorAll('.reveal-up').forEach(el => {
      gsap.fromTo(el, 
        { opacity: 0, y: 60 },
        {
          scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none reverse' },
          opacity: 1, y: 0, duration: 1.2, ease: 'power3.out', delay: parseFloat(el.style.getPropertyValue('--d')) || 0
        }
      );
    });

    // Performance progress bars custom scroll animation
    container.querySelectorAll('.pbar-fill').forEach(fill => {
      const w = fill.style.getPropertyValue('--w') || '100%';
      fill.style.width = '0%';
      ScrollTrigger.create({
        trigger: fill,
        start: 'top 90%',
        once: true,
        onEnter: () => {
          fill.style.width = w;
        }
      });
    });
  }

  function changeYear(year, immediate = false) {
    if (year === currentYear && !immediate) return;
    currentYear = year;

    // Synchronize UI buttons
    document.querySelectorAll('.year-btn').forEach(btn => {
      if (btn.getAttribute('data-year') === year) btn.classList.add('active');
      else btn.classList.remove('active');
    });

    if (immediate) {
      killTriggersInContainer(document.getElementById('sec-vehicle'));
      killTriggersInContainer(document.getElementById('sec-performance'));
      killTriggersInContainer(document.getElementById('sec-power'));
      killTriggersInContainer(document.getElementById('sec-team'));

      renderYearData(year);

      animateNewElements(document.getElementById('sec-vehicle'));
      animateNewElements(document.getElementById('sec-performance'));
      animateNewElements(document.getElementById('sec-power'));
      animateNewElements(document.getElementById('sec-team'));

      ScrollTrigger.refresh();
      return;
    }

    const panels = [
      document.querySelector('#sec-vehicle .s-panel'),
      document.querySelector('#sec-performance .s-panel'),
      document.querySelector('#sec-power .s-panel'),
      document.getElementById('team-members-container')
    ].filter(Boolean);

    // Fade out panels
    gsap.to(panels, {
      opacity: 0,
      y: 20,
      duration: 0.4,
      stagger: 0.05,
      ease: 'power2.in',
      onComplete: () => {
        killTriggersInContainer(document.getElementById('sec-vehicle'));
        killTriggersInContainer(document.getElementById('sec-performance'));
        killTriggersInContainer(document.getElementById('sec-power'));
        killTriggersInContainer(document.getElementById('sec-team'));

        renderYearData(year);

        animateNewElements(document.getElementById('sec-vehicle'));
        animateNewElements(document.getElementById('sec-performance'));
        animateNewElements(document.getElementById('sec-power'));
        animateNewElements(document.getElementById('sec-team'));

        ScrollTrigger.refresh();

        // Fade in new content
        gsap.to(panels, {
          opacity: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.05,
          ease: 'power2.out'
        });
      }
    });
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

    // Year selectors click
    document.querySelectorAll('.year-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const year = btn.getAttribute('data-year');
        changeYear(year);
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
      changeYear('2027', true);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
