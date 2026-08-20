/* ============ SAADIFY — site animation engine ============ */
(() => {
  "use strict";

  // --- MAGIC FIX 1: Browser ki scroll memory disable karna ---
  if ("scrollRestoration" in history) {
    history.scrollRestoration = "manual";
  }
  window.scrollTo(0, 0);
  // -----------------------------------------------------------

  const gsap = window.gsap;
  const ST = window.ScrollTrigger;
  const SplitText = window.SplitText;
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const isTouch = window.matchMedia(
    "(hover: none), (max-width: 900px)",
  ).matches;

  // ---------------------------------------------------------------
  // GSAP/ScrollTrigger/SplitText/Lenis load from a CDN. If there's no
  // internet (or the CDN request fails/is slow), those globals won't
  // exist and the old code below (`if (!gsap) return;`) would abort
  // the ENTIRE script — meaning the preloader never gets removed
  // (site looks "stuck" forever) and nothing else works either
  // (menu, WhatsApp widget, etc). Instead: fail soft. Remove the
  // preloader and wire up the few things that don't need GSAP, then
  // stop — the animated extras just won't run, but the site stays
  // usable.
  // ---------------------------------------------------------------
  function bareMinimumFallback() {
    const pre = document.getElementById("preloader");
    if (pre) pre.remove();

    const btn = document.getElementById("menuBtn");
    const overlay = document.getElementById("menuOverlay");
    if (btn && overlay) {
      const label = btn.querySelector(".menu-label");
      btn.addEventListener("click", () => {
        const open = overlay.classList.toggle("menu-open-fallback");
        overlay.style.visibility = open ? "visible" : "hidden";
        overlay.style.clipPath = open
          ? "inset(0 0% 0% 0%)"
          : "inset(0 0 100% 0)";
        overlay.setAttribute("aria-hidden", open ? "false" : "true");
        btn.classList.toggle("open", open);
        if (label) label.textContent = open ? "CLOSE" : "MENU";
      });
      const closeBtn = document.getElementById("menuCloseBtn");
      if (closeBtn) closeBtn.addEventListener("click", () => btn.click());
    }

    const wa = document.getElementById("whatsapp");
    if (wa) wa.classList.add("show");

    document.querySelectorAll("[data-reveal]").forEach((el) => {
      el.style.opacity = 1;
      el.style.transform = "none";
    });

    const vsSection = document.getElementById("videoScrub");
    if (vsSection) vsSection.remove();
  }

  if (!gsap) {
    bareMinimumFallback();
    return;
  }

  try {
    if (ST) gsap.registerPlugin(ST);
    if (SplitText) gsap.registerPlugin(SplitText);
  } catch (_) {
    // a plugin script failed to load/parse (flaky network) — carry on
    // with whatever loaded successfully instead of crashing the boot.
  }

  let lenis = null;

  /* ---------------- Lenis smooth scroll ---------------- */
  function initLenis() {
    if (reduceMotion || !window.Lenis) return;
    lenis = new window.Lenis({
      duration: 1.1,
      smoothWheel: true,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });
    lenis.on("scroll", ST.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  function scrollToTarget(target, opts) {
    const options = Object.assign({ offset: 0, duration: 1.3 }, opts || {});
    if (lenis) lenis.scrollTo(target, options);
    else {
      if (target === 0) window.scrollTo({ top: 0, behavior: "smooth" });
      else {
        const el =
          typeof target === "string" ? document.querySelector(target) : target;
        el && el.scrollIntoView({ behavior: "smooth" });
      }
    }
  }

  /* ---------------- Smooth scroll for every in-page link ---------------- */
  function initAnchorScroll() {
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      if (a.closest(".menu-links")) return; // handled separately in initMenu
      const href = a.getAttribute("href");
      if (!href) return;
      a.addEventListener("click", (e) => {
        if (href === "#") {
          e.preventDefault();
          scrollToTarget(0, { duration: 1.6 });
          return;
        }
        const el = document.querySelector(href);
        if (!el) return;
        e.preventDefault();
        scrollToTarget(href, { duration: 1.4 });
      });
    });
  }

  /* ---------------- Premium Awwwards Preloader ---------------- */
  function runPreloader() {
    const pre = document.getElementById("preloader");
    const count = document.getElementById("preloaderCount");
    const bar = document.getElementById("preloaderLineBar");
    const brand = document.querySelector(".preloader-brand");
    const bottom = document.querySelector(".preloader-bottom");

    if (!pre) return;

    // Loading ke dauran background scroll band karna
    if (lenis) lenis.stop();

    const obj = { p: 0 };
    const tl = gsap.timeline({
      onComplete: () => {
        pre.remove();
        if (lenis) lenis.start(); // Loading puri honay par scroll on ho jayega

        // MAGIC FIX: Loader complete hone ke foran baad video chalayen
        const heroVid = document.getElementById("heroVideo");
        if (heroVid) heroVid.play().catch(() => {});
      },
    });

    // 1. Text neechay se reveal ho kar samnay aayega
    tl.to(brand, { y: 0, duration: 1.2, ease: "power4.out" }).to(
      bottom,
      { opacity: 1, duration: 0.5 },
      "-=0.6",
    );

    // 2. Loading Counter and Bar
    tl.to(obj, {
      p: 100,
      duration: 1.5,
      ease: "power2.inOut",
      onUpdate: () => {
        count.textContent = Math.round(obj.p);
        bar.style.width = obj.p + "%";
      },
    });

    // 3. Awwwards Exit: Text zoom out ho kar fade hoga, aur background curve ban kar upar slide karega
    tl.to(bottom, { opacity: 0, y: 20, duration: 0.4, ease: "power3.in" })
      .to(
        brand,
        {
          scale: 1.15,
          opacity: 0,
          filter: "blur(12px)",
          duration: 0.8,
          ease: "power3.inOut",
        },
        "-=0.2",
      )
      .to(
        pre,
        {
          yPercent: -100,
          borderBottomLeftRadius: "50vw",
          borderBottomRightRadius: "50vw",
          duration: 1.1,
          ease: "power4.inOut",
        },
        "-=0.5",
      );
  }

  /* ---------------- Custom cursor ---------------- */
  function initCursor() {
    if (reduceMotion || isTouch) return;
    document.body.classList.add("cursor-on");
    const cursor = document.getElementById("cursor");
    const dot = document.getElementById("cursorDot");
    const ring = document.createElement("span");
    ring.className = "cursor-ring";
    ring.textContent = "VIEW";
    cursor.appendChild(ring);

    gsap.set([cursor, dot], { xPercent: -50, yPercent: -50 });
    const cx = gsap.quickTo(cursor, "x", { duration: 0.4, ease: "power3" });
    const cy = gsap.quickTo(cursor, "y", { duration: 0.4, ease: "power3" });
    const dx = gsap.quickTo(dot, "x", { duration: 0.15, ease: "power2" });
    const dy = gsap.quickTo(dot, "y", { duration: 0.15, ease: "power2" });

    window.addEventListener("pointermove", (e) => {
      cx(e.clientX);
      cy(e.clientY);
      dx(e.clientX);
      dy(e.clientY);
      const t = e.target;
      const isLink = t.closest("a,button");
      cursor.classList.toggle(
        "cursor-hover",
        !!t.closest("a,button,.cert,.skill-cat li"),
      );
      if (t.closest("[data-magnetic]")) {
        cursor.dataset.tip = "1";
        ring.textContent = "OPEN";
      } else if (
        t.closest(".cert") ||
        t.closest(".proj") ||
        t.closest("a.exp-item")
      ) {
        cursor.dataset.tip = "1";
        ring.textContent = "VIEW";
      } else {
        delete cursor.dataset.tip;
        cursor.dataset.tip && cursor.removeAttribute("data-tip");
      }
    });
    document.addEventListener("mousedown", () =>
      gsap.to(cursor, { scale: 0.8, duration: 0.2 }),
    );
    document.addEventListener("mouseup", () =>
      gsap.to(cursor, { scale: 1, duration: 0.3 }),
    );
  }

  /* ---------------- Magnetic buttons ---------------- */
  function initMagnetic() {
    if (reduceMotion || isTouch) return;
    document.querySelectorAll("[data-magnetic]").forEach((el) => {
      const xTo = gsap.quickTo(el, "x", { duration: 0.3, ease: "power3" });
      const yTo = gsap.quickTo(el, "y", { duration: 0.3, ease: "power3" });
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * 0.3);
        yTo((e.clientY - r.top - r.height / 2) * 0.3);
      });
      el.addEventListener("pointerleave", () => {
        xTo(0);
        yTo(0);
      });
    });
  }

  /* ---------------- Menu ---------------- */
  function initMenu() {
    const btn = document.getElementById("menuBtn");
    const overlay = document.getElementById("menuOverlay");
    const links = overlay.querySelectorAll(".menu-links a");
    let open = false;

    const label = btn.querySelector(".menu-label");
    const tl = gsap
      .timeline({ paused: true })
      .set(overlay, { visibility: "visible", clipPath: "inset(0 0 100% 0)" })
      .to(overlay, {
        clipPath: "inset(0 0% 0% 0%)",
        duration: 0.42,
        ease: "power2.inOut",
      })
      .to(overlay, { clipPath: "inset(0 0% 0% 0%)", duration: 0 }, ">")
      .from(links, {
        yPercent: 120,
        opacity: 0,
        stagger: 0.035,
        duration: 0.4,
        ease: "power4.out",
        delay: 0.08,
      });

    function close() {
      if (!open) return;
      open = false;
      tl.reverse();
      gsap.set(overlay, { clipPath: "inset(0 0 100% 0)" });
      setTimeout(() => gsap.set(overlay, { visibility: "hidden" }), 300);
      setTimeout(() => gsap.set(links, { yPercent: 0, opacity: 1 }), 150);
      btn.classList.remove("open");
      if (label) label.textContent = "MENU";
      overlay.setAttribute("aria-hidden", "true");
      if (lenis) lenis.start();
    }
    btn.addEventListener("click", () => {
      open = !open;
      if (open) {
        tl.restart();
        btn.classList.add("open");
        if (label) label.textContent = "CLOSE";
        overlay.setAttribute("aria-hidden", "false");
        if (lenis) lenis.stop();
      } else close();
    });
    const closeBtn = document.getElementById("menuCloseBtn");
    if (closeBtn) closeBtn.addEventListener("click", close);
    links.forEach((l) =>
      l.addEventListener("click", () => {
        const id = l.getAttribute("href");
        close();
        setTimeout(() => scrollToTarget(id, { duration: 1.4 }), 340);
      }),
    );
    overlay.querySelectorAll('.menu-socials a[href^="#"]').forEach((l) =>
      l.addEventListener("click", (e) => {
        const id = l.getAttribute("href");
        e.preventDefault();
        close();
        setTimeout(() => scrollToTarget(id, { duration: 1.4 }), 340);
      }),
    );
  }

  /* ---------------- SplitText ---------------- */
  function splitLines(el) {
    if (reduceMotion || !SplitText) return null;
    try {
      const st = new SplitText(el, { type: "lines", linesClass: "split-line" });
      st.lines.forEach((l) => {
        l.innerHTML = `<div>${l.innerHTML}</div>`;
      });
      return st;
    } catch (_) {
      return null;
    }
  }

  /* ---------------- Hero ---------------- */
  function initHero() {
    const runSplits = () => {
      document.querySelectorAll("[data-split]").forEach((el) => {
        const st = splitLines(el);
        if (st)
          gsap.to(st.lines, {
            yPercent: -110,
            duration: 0.9,
            stagger: 0.06,
            delay: 1.5,
            ease: "power4.out",
          });
      });
      gsap.fromTo(
        ".hero-title",
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 1, delay: 1.7, ease: "power3.out" },
      );
      gsap.fromTo(
        ".hero-sub",
        { opacity: 0, y: 18 },
        { opacity: 1, y: 0, duration: 1, delay: 1.9, ease: "power3.out" },
      );
    };
    if (document.fonts && document.fonts.ready)
      document.fonts.ready.then(runSplits);
    else runSplits();

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: "#home",
        start: "top top",
        end: "bottom top",
        scrub: 0.6,
      },
    });
    tl.to("#heroVisualWrap", {
      yPercent: -50,
      scale: 1.18,
      opacity: 0.25,
      ease: "power1.out",
    })
      .to(".hero-type", { yPercent: -32, opacity: 0.2, ease: "power1.out" }, 0)
      .to(".hero-big", { yPercent: -18, ease: "power1.out" }, 0)
      .to(".scroll-hint", { opacity: 0, duration: 0.2, ease: "none" }, 0);

    const hint = document.getElementById("scrollHint");
    const hideHint = () => gsap.to(hint, { opacity: 0, duration: 0.5 });
    window.addEventListener("wheel", hideHint, { once: true, passive: true });
  }

  /* ---------------- Image Sequence Scrubbing (Zero Lag) ---------------- */
  function initHeroVideoScrub() {
    const canvas = document.getElementById("scrubCanvas");
    const frameContainer = document.getElementById("vsFrame");
    const caption = document.getElementById("vsCaption");
    const section = document.getElementById("videoScrub");

    if (!canvas || !frameContainer || !section || isTouch) {
      if (section) section.remove();
      return;
    }

    const context = canvas.getContext("2d");
    canvas.width = 1280;
    canvas.height = 720;

    const frameCount = 192; // Total extracted frames ki tadad
    const currentFrame = (index) =>
      `assets/video/frames/frame_${(index + 1).toString().padStart(3, "0")}.jpg`;

    const images = [];
    const imageSeq = { frame: 0 };

    // Images memory mein preload karein
    for (let i = 0; i < frameCount; i++) {
      const img = new Image();
      img.src = currentFrame(i);
      images.push(img);
    }

    // Pehli image draw karein
    images[0].onload = render;
    function render() {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(
        images[imageSeq.frame],
        0,
        0,
        canvas.width,
        canvas.height,
      );
    }

    const startRect = frameContainer.getBoundingClientRect();
    const startW = startRect.width;
    const startH = startRect.height;

    // Stage 1: Grow Fullscreen
    gsap
      .timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "30% top",
          scrub: 0.5,
        },
      })
      .set(frameContainer, { maxWidth: "none", maxHeight: "none" }, 0)
      .to(
        frameContainer,
        { width: "100vw", height: "100vh", borderRadius: 0, ease: "none" },
        0,
      )
      .to(caption, { opacity: 0, duration: 0.2 }, 0);

    // Stage 2: Scroll par images change karein (Magic happens here)
    gsap.to(imageSeq, {
      frame: frameCount - 1,
      snap: "frame",
      ease: "none",
      scrollTrigger: {
        trigger: section,
        start: "30% top",
        end: "70% top",
        scrub: 0.5,
      },
      onUpdate: render,
    });

    // Stage 3: Shrink back
    gsap
      .timeline({
        scrollTrigger: {
          trigger: section,
          start: "70% top",
          end: "bottom top",
          scrub: 0.5,
        },
      })
      .to(
        frameContainer,
        {
          width: startW,
          height: startH,
          borderRadius: 26,
          yPercent: 12,
          opacity: 0.85,
          ease: "none",
        },
        0,
      )
      .set(frameContainer, { maxWidth: startW, maxHeight: startH });

    gsap.fromTo(
      caption,
      { opacity: 0 },
      {
        opacity: 1,
        duration: 0.4,
        scrollTrigger: {
          trigger: section,
          start: "top 70%",
          end: "top 30%",
          scrub: true,
        },
      },
    );

    ST.refresh();
  }

  /* ---------------- Seamless video loop (no jerk/jump at the restart point) ---------------- */
  // Native `loop` restarts a video by pausing, seeking to 0 and re-playing,
  // which on most browsers shows a tiny stutter/black-frame at the seam.
  // Instead we jump back to the start slightly BEFORE the video actually
  // ends, while it's still playing — the video never stops, so there's
  // nothing for the eye to catch.
  function initSeamlessLoop(video, leadOut = 0.12) {
    if (!video) return;
    video.loop = false;
    video.removeAttribute("loop");
    let resetting = false;
    const reset = () => {
      if (resetting) return;
      resetting = true;
      try {
        video.currentTime = 0;
      } catch (_) {}
      const p = video.play();
      if (p && p.catch) p.catch(() => {});
      setTimeout(() => {
        resetting = false;
      }, 60);
    };
    video.addEventListener("timeupdate", () => {
      if (video.duration && video.currentTime >= video.duration - leadOut)
        reset();
    });
    video.addEventListener("ended", reset); // safety net if timeupdate granularity misses it
  }

  function initVideoLoops() {
    initSeamlessLoop(document.getElementById("heroVideo"));
    initSeamlessLoop(document.getElementById("footerVideo"));
  }

  /* ---------------- Certificate lights that flee the cursor ---------------- */
  function initCertLights() {
    const section = document.querySelector(".certs");
    const holder = document.getElementById("certLights");
    if (!section || !holder || reduceMotion || isTouch) return;
    const COUNT = 34;
    const lights = [];
    for (let i = 0; i < COUNT; i++) {
      const el = document.createElement("span");
      el.className = "cert-light";
      const size = 3 + Math.random() * 5; // varied firefly sizes
      el.style.width = size + "px";
      el.style.height = size + "px";
      el.style.animationDuration = 2.2 + Math.random() * 2.6 + "s";
      el.style.animationDelay = Math.random() * 4 + "s";
      holder.appendChild(el);
      const base = { x: 4 + Math.random() * 92, y: 8 + Math.random() * 84 };
      el.style.left = base.x + "%";
      el.style.top = base.y + "%";
      lights.push({ el, base, x: 0, y: 0 });
    }
    let mouse = { x: -9999, y: -9999 };
    section.addEventListener("pointermove", (e) => {
      const r = section.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    });
    section.addEventListener("pointerleave", () => {
      mouse.x = -9999;
      mouse.y = -9999;
    });
    const RADIUS = 150,
      PUSH = 70;
    function raf() {
      const r = section.getBoundingClientRect();
      lights.forEach((l) => {
        const lx = (l.base.x / 100) * r.width;
        const ly = (l.base.y / 100) * r.height;
        const dx = lx - mouse.x,
          dy = ly - mouse.y;
        const dist = Math.hypot(dx, dy);
        let tx = 0,
          ty = 0;
        if (dist < RADIUS) {
          const force = (RADIUS - dist) / RADIUS;
          const ang = Math.atan2(dy, dx);
          tx = Math.cos(ang) * force * PUSH;
          ty = Math.sin(ang) * force * PUSH;
        }
        l.x += (tx - l.x) * 0.14;
        l.y += (ty - l.y) * 0.14;
        l.el.style.transform = `translate(${l.x}px,${l.y}px)`;
      });
      requestAnimationFrame(raf);
    }
    raf();
  }

  /* ---------------- Scroll reveals ---------------- */
  function initReveals() {
    document.querySelectorAll("[data-reveal]").forEach((el) => {
      gsap.fromTo(
        el,
        { autoAlpha: 0, y: 40 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 85%" },
        },
      );
    });
  }

  /* ---------------- Timeline ---------------- */
  function initTimeline() {
    const items = document.querySelectorAll(".tl-item");
    const line = document.querySelector(".timeline-line");
    if (!line) return;
    items.forEach((item) => {
      ST.create({
        trigger: item,
        start: "top 85%",
        onEnter: () => item.classList.add("active"),
        onLeaveBack: () => item.classList.remove("active"),
      });
    });
    gsap.fromTo(
      line,
      { scaleY: 0, transformOrigin: "top" },
      {
        scaleY: 1,
        ease: "none",
        scrollTrigger: {
          trigger: ".timeline",
          start: "top 80%",
          end: "bottom 55%",
          scrub: true,
        },
      },
    );
  }

  /* ---------------- Big type moments ---------------- */
  function initTypeMoments() {
    const wordEl = document.getElementById("tmWord");
    if (!wordEl) return;
    const words = ["MARKETING", "BUILD", "GROW", "SCALE", "SAADIFY"];
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: ".type-moment",
        start: "top top",
        end: "bottom bottom",
        scrub: true,
      },
      onUpdate: (self) => {
        const idx = Math.min(
          words.length - 1,
          Math.floor(self.progress * words.length),
        );
        if (wordEl.textContent !== words[idx]) {
          gsap.to(wordEl, {
            opacity: 0,
            scale: 0.9,
            duration: 0.08,
            onComplete: () => {
              wordEl.textContent = words[idx];
              gsap.fromTo(
                wordEl,
                { opacity: 0, scale: 1.1 },
                { opacity: 1, scale: 1, duration: 0.3, ease: "power3.out" },
              );
            },
          });
        }
      },
    });
    gsap.to(wordEl, {
      scale: 1.15,
      ease: "none",
      scrollTrigger: {
        trigger: ".type-moment",
        start: "top top",
        end: "bottom bottom",
        scrub: true,
      },
    });
  }

  /* ---------------- Stacking cards ---------------- */
  function initStackCards() {
    const cards = document.querySelectorAll(".scard");
    if (!cards.length) return;
    const wrap = document.getElementById("cards");
    if (wrap) wrap.style.setProperty("--card-count", cards.length);

    // give every card its stacked index so CSS can offset each one a
    // little further down than the last (visible stack, not a dead overlap)
    cards.forEach((card, i) => card.style.setProperty("--i", i));

    if (isTouch) {
      // on mobile the cards are plain stacked-in-flow (see CSS), just fade them in
      cards.forEach((card) => {
        gsap.fromTo(
          card,
          { autoAlpha: 0, y: 30 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.7,
            ease: "power2.out",
            scrollTrigger: { trigger: card, start: "top 90%" },
          },
        );
      });
      return;
    }

    cards.forEach((card, i) => {
      gsap.fromTo(
        card,
        { scale: 0.94, opacity: 0.55 },
        {
          scale: 1,
          opacity: 1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: card,
            start: "top 95%",
            end: "top 40%",
            scrub: true,
          },
        },
      );
      // as the NEXT card arrives, ease this one back slightly so the stack reads as depth, not a stuck pile
      if (i < cards.length - 1) {
        gsap.to(card, {
          scale: 0.96,
          y: -18,
          ease: "none",
          scrollTrigger: {
            trigger: cards[i + 1],
            start: "top 95%",
            end: "top 8vh",
            scrub: true,
          },
        });
      }
    });
  }

  /* ---------------- Process ---------------- */
  function initProcess() {
    const bar = document.getElementById("processLineBar");
    const steps = Array.from(document.querySelectorAll("[data-step]"));
    if (!bar || !steps.length) return;

    // single scrubbed progress drives BOTH the bar and each dot, so a dot
    // only lights up once the bar has actually reached its position
    ST.create({
      trigger: ".process-track",
      start: "top 70%",
      end: "bottom 40%",
      scrub: true,
      onUpdate: (self) => {
        const p = self.progress;
        bar.style.width = p * 100 + "%";
        steps.forEach((step, i) => {
          const threshold = i / (steps.length - 1);
          step.classList.toggle("active", p >= threshold - 0.015);
        });
      },
      onLeaveBack: () => {
        bar.style.width = "0%";
        steps.forEach((s) => s.classList.remove("active"));
      },
    });
  }

  /* ---------------- Marquee ---------------- */
  function initMarquees() {
    document.querySelectorAll(".marquee").forEach((mq) => {
      const speed = parseFloat(mq.dataset.speed || 1);
      const dir = parseFloat(mq.dataset.dir || 1);
      const group = mq.querySelector(".mq-group");
      const tracks = mq.querySelectorAll(".mq-track");
      if (!group || tracks.length < 2) return;
      // grow BOTH tracks identically so their widths stay equal (no gap/jump on loop)
      let safe = 0;
      while (tracks[0].scrollWidth < window.innerWidth * 1.4 && safe++ < 40) {
        tracks.forEach((t) => {
          t.innerHTML += t.innerHTML;
        });
      }
      const isNegative = dir < 0;
      // group holds 2 identical tracks side by side -> moving exactly 50% of its own width loops seamlessly
      const tween = gsap.fromTo(
        group,
        { xPercent: isNegative ? -50 : 0 },
        {
          xPercent: isNegative ? 0 : -50,
          duration: 40 / speed,
          ease: "none",
          repeat: -1,
        },
      );
      if (reduceMotion) tween.pause();
      mq.addEventListener("pointerenter", () =>
        gsap.to(tween, { timeScale: 0.2, duration: 0.5, overwrite: true }),
      );
      mq.addEventListener("pointerleave", () =>
        gsap.to(tween, { timeScale: 1, duration: 0.5, overwrite: true }),
      );
    });
  }

  /* ---------------- Projects cursor preview ---------------- */
  function initProjects() {
    if (reduceMotion || isTouch) return;
    const list = document.getElementById("projectList");
    const preview = document.getElementById("projPreview");
    const previewImg = document.getElementById("projPreviewImg");
    const previewLabel = document.getElementById("projPreviewLabel");
    if (!list || !preview) return;
    const px = gsap.quickTo(preview, "x", { duration: 0.3, ease: "power3" });
    const py = gsap.quickTo(preview, "y", { duration: 0.3, ease: "power3" });
    list.querySelectorAll(".proj").forEach((row) => {
      const thumb = row.querySelector(".proj-thumb img");
      const name = row.querySelector("h3");
      row.addEventListener("pointerenter", () => {
        if (thumb && previewImg) {
          previewImg.src = thumb.src;
          previewImg.style.display = "block";
        }
        if (name && previewLabel) previewLabel.textContent = name.textContent;
        gsap.to(preview, { opacity: 1, duration: 0.3 });
      });
      row.addEventListener("pointerleave", () =>
        gsap.to(preview, { opacity: 0, duration: 0.3 }),
      );
      row.addEventListener("pointermove", (e) => {
        px(e.clientX + 22);
        py(e.clientY + 22);
      });
    });
  }

  /* ---------------- Marketing dashboard bars ---------------- */
  function initMerge() {
    document.querySelectorAll(".kpi .bar").forEach((bar, i) => {
      gsap.fromTo(
        bar,
        { width: 0 },
        {
          width: bar.dataset.v + "%",
          duration: 1.4,
          delay: i * 0.15,
          ease: "power3.out",
          scrollTrigger: { trigger: ".merge-stage", start: "top 75%" },
        },
      );
    });
  }

  /* ---------------- Creative orb ---------------- */
  function initCreative() {
    const orb = document.getElementById("glowOrb");
    const stage = document.querySelector(".creative-stage");
    if (!orb || !stage) return;
    const ty = gsap.quickTo(orb, "y", { duration: 0.5 });
    const tx = gsap.quickTo(orb, "x", { duration: 0.5 });
    stage.addEventListener("pointermove", (e) => {
      const r = stage.getBoundingClientRect();
      const nx = ((e.clientX - r.left) / r.width - 0.5) * 140;
      const ny = ((e.clientY - r.top) / r.height - 0.5) * 140;
      tx(nx);
      ty(ny);
    });
    stage.addEventListener("pointerleave", () => {
      tx(0);
      ty(0);
    });
    gsap.to(orb, {
      scale: 1.06,
      duration: 2.2,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut",
    });
  }

  /* ---------------- WhatsApp ---------------- */
  function initWhatsapp() {
    const wa = document.getElementById("whatsapp");
    const toggle = document.getElementById("waToggle");
    const body = document.getElementById("waBody");
    const input = document.getElementById("waInput");
    const sendBtn = document.getElementById("waSend");

    ST.create({
      trigger: "#home",
      start: "bottom 95%",
      onEnter: () => wa.classList.add("show"),
      onLeaveBack: () => {
        wa.classList.remove("show");
        body.classList.remove("open");
        wa.classList.remove("chat-open");
      },
    });

    toggle.addEventListener("click", () => {
      body.classList.toggle("open");
      wa.classList.toggle("chat-open", body.classList.contains("open"));

      // Agar chat open hui hai, toh thore delay ke sath focus karein taake jump na ho
      if (body.classList.contains("open")) {
        setTimeout(() => {
          input.focus({ preventScroll: true });
          const len = input.value.length;
          input.setSelectionRange(len, len);
        }, 50);
      }
    });

    // ESC key dabane par WhatsApp close ho jaye
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && body.classList.contains("open")) {
        body.classList.remove("open");
        wa.classList.remove("chat-open");
      }
    });

    // textarea grows 1 line -> ~3 lines, then a scrollbar takes over
    const autoGrow = () => {
      input.style.height = "auto";
      const maxH = parseFloat(getComputedStyle(input).maxHeight) || 78;
      const next = Math.min(input.scrollHeight, maxH);
      input.style.height = next + "px";
      input.style.overflowY = input.scrollHeight > maxH ? "auto" : "hidden";
    };
    input.addEventListener("input", autoGrow);
    autoGrow();

    const DEFAULT_MSG = "Hi Saad, I want to work with you ";
    const openChat = () => {
      const text = (input.value || "").trim() || DEFAULT_MSG.trim();
      window.open(
        "https://wa.me/923018567841?text=" + encodeURIComponent(text),
        "_blank",
      );
      input.value = DEFAULT_MSG;
      autoGrow();
      body.classList.remove("open");
      wa.classList.remove("chat-open");
    };
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        openChat();
      }
    });
    sendBtn.addEventListener("click", openChat);

    // Clicking a service card prefills WhatsApp with that service
    document.querySelectorAll(".scard[data-service]").forEach((card) => {
      card.style.cursor = "pointer";
      card.addEventListener("click", (e) => {
        if (e.target.closest("a")) return;
        const service = card.dataset.service;
        input.value = `Hi Saad, I want to work with you on ${service}. My name is `;
        wa.classList.add("show", "chat-open");
        body.classList.add("open");

        // Box screen par show hone ke baad height calculate karein
        autoGrow();

        // Timeout aur preventScroll se screen jump nahi karegi aur auto-typing mode on ho jayega
        setTimeout(() => {
          input.focus({ preventScroll: true });
          const len = input.value.length;
          input.setSelectionRange(len, len);
        }, 50);
      });
    });
  }

  /* ---------------- Finale: footer video page climbs over Contact (parallax reveal) ---------------- */
  function initFinaleReveal() {
    const footer = document.getElementById("footer");
    const video = document.getElementById("footerVideo");
    if (!footer) return;

    if (reduceMotion || isTouch) return; // keep it simple/static on mobile

    // Footer ko bottom se grow hone ke liye set kiya
    gsap.set(footer, { transformOrigin: "bottom center" });

    // GSAP Timeline create ki taake manually control kar sakein
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: footer,
        start: "top bottom", // Jab footer screen mein aana shuru ho
        end: "bottom bottom", // Jab screen bilkul bottom par ho
        scrub: 0.1, // Halka sa smooth scrub
        onUpdate: (self) => {
          // MAGIC FIX: Agar scroll 98% ya us se zyada ho jaye,
          // toh force kar do ke scale 1 ho aur border 0 ho jaye.
          // Is se Lenis/GSAP ka pixel mismatch wala bug khatam ho jayega.
          if (self.progress >= 0.98) {
            gsap.set(footer, { scale: 1, borderRadius: "0px" });
          }
        },
      },
    });

    // Animation jo scroll ke sath chalegi
    tl.fromTo(
      footer,
      {
        scale: 0.75,
        borderRadius: "20px",
      },
      {
        scale: 1,
        borderRadius: "0px",
        ease: "none",
      },
    );

    if (video) {
      ST.create({
        trigger: footer,
        start: "top 65%",
        end: "bottom top",
        onEnter: () => video.play().catch(() => {}),
        onEnterBack: () => video.play().catch(() => {}),
        onLeave: () => video.pause(),
        onLeaveBack: () => video.pause(),
      });
    }
  }

  /* ---------------- Back to top ---------------- */
  function initBackTop() {
    const bt = document.getElementById("backTop");
    if (!bt) return;
    bt.addEventListener("click", () =>
      scrollToTarget(0, {
        duration: 2.4,
        easing: (t) => 1 - Math.pow(1 - t, 4),
      }),
    );
  }

  /* ---------------- Easter eggs ---------------- */
  function initEasterEggs() {
    let typed = "";
    window.addEventListener("keydown", (e) => {
      // MAGIC FIX 1: Agar user text box (WhatsApp) mein type kar raha hai, toh color effect trigger na ho
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")
        return;

      typed = (typed + e.key).slice(-4).toUpperCase();
      if (typed === "SAAD") {
        // MAGIC FIX 2: Effect ko 'body' ke bajaye '#smoothWrap' par lagaya hai taake WhatsApp button apni jagah se na hile
        gsap.fromTo(
          "#smoothWrap",
          { filter: "hue-rotate(0deg)" },
          {
            filter: "hue-rotate(-30deg)",
            duration: 0.7,
            yoyo: true,
            repeat: 1,
          },
        );
      }
    });

    let clicks = 0;
    const brand = document.getElementById("brand");
    if (brand) {
      brand.addEventListener("click", () => {
        clicks++;
        if (clicks >= 4) {
          clicks = 0;
          gsap.to(brand, {
            x: 8,
            duration: 0.05,
            repeat: 8,
            yoyo: true,
            onComplete: () => gsap.to(brand, { x: 0, duration: 0.2 }),
          });
        }
      });
    }
  }

  /* ---------------- Boot ---------------- */
  // Each init runs in its own try/catch: if one piece errors out
  // (e.g. a CDN script failed to load on a slow/offline connection),
  // it's skipped instead of stopping every init after it — this is
  // what used to cause "sometimes cursor glitches, sometimes
  // everything else disappears" on refresh.
  function safe(fn) {
    try {
      fn();
    } catch (err) {
      console.warn("[saadify] skipped", fn.name || "init", "-", err);
    }
  }

  // Safety net: if anything above throws before the preloader's own
  // GSAP timeline finishes, don't leave the visitor staring at the
  // preloader forever.
  function preloaderSafetyNet() {
    setTimeout(() => {
      const pre = document.getElementById("preloader");
      if (pre) pre.remove();
    }, 4000);
  }

  function refreshST() {
    if (ST && ST.refresh) ST.refresh();
  }

  function boot() {
    preloaderSafetyNet();

    // --- MAGIC FIX 2: GSAP aur Lenis ki memory reset karna ---
    if (ST) ST.clearScrollMemory();
    window.scrollTo(0, 0);
    // ---------------------------------------------------------

    safe(initLenis);
    safe(runPreloader);
    safe(initCursor);
    safe(initMagnetic);
    safe(initMenu);
    safe(initAnchorScroll);
    safe(initHero);
    safe(initHeroVideoScrub);
    safe(initVideoLoops);
    safe(initReveals);
    safe(initTimeline);
    safe(initTypeMoments);
    safe(initStackCards);
    safe(initProcess);
    safe(initMarquees);
    safe(initProjects);
    safe(initMerge);
    safe(initCreative);
    safe(initCertLights);
    safe(initFinaleReveal);
    safe(initWhatsapp);
    safe(initBackTop);
    safe(initEasterEggs);

    if (document.fonts && document.fonts.ready)
      document.fonts.ready.then(refreshST);

    // --- MAGIC FIX 3: Load hone ke baad extra refresh ---
    window.addEventListener("load", () => {
      refreshST();
      setTimeout(refreshST, 500); // 500ms delay taake videos aur canvas safely render ho jayein
    });
    // ----------------------------------------------------

    const lazyImgs = document.querySelectorAll('img[loading="lazy"]');
    let pending = lazyImgs.length;
    if (pending) {
      lazyImgs.forEach((img) => {
        if (img.complete) {
          pending--;
        } else {
          img.addEventListener(
            "load",
            () => {
              pending--;
              refreshST();
            },
            { once: true },
          );
        }
      });
    }

    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(refreshST, 200);
    });
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
