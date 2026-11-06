/* ==========================================================================
   main.js — звёздочки-параллакс, плавный скролл, аккордеоны,
   активный пункт оглавления.
   ========================================================================== */
(function () {
  'use strict';

  function ensureReadingProgressBar() {
    var bar = document.getElementById('reading-progress');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'reading-progress';
      document.body.appendChild(bar);
    }
    function update() {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var pct = max > 0 ? (window.scrollY / max) * 100 : 0;
      bar.style.width = pct + '%';
    }
    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  function addParallaxParticles() {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var count = 12;
    for (var i = 0; i < count; i++) {
      var p = document.createElement('div');
      p.className = 'magic-particle';
      p.style.left = (Math.random() * 100) + '%';
      p.style.animationDuration = (8 + Math.random() * 14) + 's';
      p.style.animationDelay = (-Math.random() * 20) + 's';
      p.style.setProperty('--drift', ((Math.random() - 0.5) * 80).toFixed(0) + 'px');
      p.style.transform = 'scale(' + (0.6 + Math.random() * 0.8) + ')';
      document.body.appendChild(p);
    }
  }

  function addStars() {
    var count = 28;
    for (var i = 0; i < count; i++) {
      var s = document.createElement('div');
      s.className = 'magic-star';
      s.style.left = (Math.random() * 100) + '%';
      s.style.top = (Math.random() * 100) + '%';
      s.style.setProperty('--dur', (5 + Math.random() * 8) + 's');
      s.style.setProperty('--delay', (Math.random() * 8) + 's');
      s.style.setProperty('--px', ((Math.random() - 0.5) * 60) + 'px');
      document.body.appendChild(s);
    }
  }

  // параллакс звёзд при движении мыши (только тёмная тема, hover)
  function initParallax() {
    var canParallax = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!canParallax) return;
    document.body.setAttribute('data-parallax', 'on');
    var stars = document.querySelectorAll('.magic-star');
    if (!stars.length) return;
    var cx = innerWidth / 2, cy = innerHeight / 2;
    document.addEventListener('mousemove', function (e) {
      var nx = (e.clientX - cx) / cx;   // -1..1
      var ny = (e.clientY - cy) / cy;
      for (var i = 0; i < stars.length; i++) {
        var depth = 0.3 + (i % 5) * 0.15;
        stars[i].style.transform = 'translate(' + (nx * depth * 24) + 'px,' + (ny * depth * 24) + 'px)';
      }
    }, { passive: true });
  }

  // Плавный скролл + активный пункт оглавления
  function initToc() {
    var links = document.querySelectorAll('.toc-link[href^="#"]');
    if (!links.length) return;
    links.forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var target = document.querySelector(a.getAttribute('href'));
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    var headings = [];
    links.forEach(function (l) {
      var h = document.querySelector(l.getAttribute('href'));
      if (h) headings.push(h);
    });

    if (!('IntersectionObserver' in window)) return;
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          links.forEach(function (l) {
            l.classList.toggle('is-active', l.getAttribute('href') === '#' + en.target.id);
          });
        }
      });
    }, { rootMargin: '-15% 0px -70% 0px' });
    headings.forEach(function (h) { obs.observe(h); });
  }

  // Аккордеоны (блоки ответов) + старые .accordion-trigger
  function initAccordions() {
    document.querySelectorAll('.answer-block__toggle').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var block = btn.closest('.answer-block');
        if (block) block.classList.toggle('open');
      });
    });
    document.querySelectorAll('.accordion-trigger').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var item = btn.closest('.accordion-item');
        if (item) item.classList.toggle('open');
      });
    });
  }

  // Динамический 3D-наклон заголовка при движении мыши
  function initHeroTilt() {
    var title = document.querySelector('.hero__title');
    if (!title) return;
    var isFine = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!isFine) return; // на тач-устройствах и при reduced-motion эффект отключён
    var rect = title.getBoundingClientRect();
    var centerX = rect.left + rect.width / 2;
    var centerY = rect.top + rect.height / 2;
    function refreshCenter() {
      var r = title.getBoundingClientRect();
      centerX = r.left + r.width / 2;
      centerY = r.top + r.height / 2;
    }
    window.addEventListener('resize', refreshCenter);
    function onMove(e) {
      var dx = (e.clientX - centerX) / (rect.width / 2);   // -1..1
      var dy = (e.clientY - centerY) / (rect.height / 2);  // -1..1
      // только наклон (искажение) без изменения размера и без подъёма по оси Z
      title.style.transition = 'transform .05s ease-out';  // быстрый отклик на движение
      title.style.transform = 'perspective(600px) rotateX(' + (dy * -10).toFixed(2) + 'deg) rotateY(' + (dx * 14).toFixed(2) + 'deg)';
    }
    function onLeave() {
      title.style.transition = 'transform .35s cubic-bezier(.22,1.6,.36,1)'; // плавный возврат
      title.style.transform = '';
      setTimeout(function () { title.style.transition = ''; }, 360);
    }
    title.addEventListener('mousemove', onMove);
    title.addEventListener('mouseleave', onLeave);
  }

  // Плавное появление карточек при скролле (IntersectionObserver)
  function initReveal() {
    var items = document.querySelectorAll('.reveal');
    if (!items.length) return;
    if (!('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('is-visible');
          obs.unobserve(en.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    items.forEach(function (el) { obs.observe(el); });
  }

  // Карточки на главной — лёгкий 3D-наклон при наведении (аналогичен заголовку)
  function initCardsTilt() {
    var cards = document.querySelectorAll('.grid > .card');
    if (!cards.length) return;
    var isFine = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!isFine) return;

    cards.forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
        var dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
        card.style.transition = 'transform .07s ease-out';
        card.style.transform = 'perspective(700px) rotateX(' + (dy * -4).toFixed(2) + 'deg) rotateY(' + (dx * 6).toFixed(2) + 'deg)';
      });
      card.addEventListener('mouseleave', function () {
        card.style.transition = 'transform .3s cubic-bezier(.22,1.6,.36,1)';
        card.style.transform = '';
        setTimeout(function () { card.style.transition = ''; }, 310);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      ensureReadingProgressBar();
      addParallaxParticles();
      addStars(); initParallax(); initToc(); initAccordions(); initHeroTilt(); initCardsTilt();
      setupRevealCards();
    });
  } else {
    ensureReadingProgressBar();
    addParallaxParticles();
    addStars(); initParallax(); initToc(); initAccordions(); initHeroTilt(); initCardsTilt();
    setupRevealCards();
  }

  // добавляем класс reveal карточкам главной страницы после монтирования, затем запускаем наблюдение
  function setupRevealCards() {
    var cards = document.querySelectorAll('.grid > .card');
    if (!cards.length) return;
    cards.forEach(function (c) { c.classList.add('reveal'); });
    // тень не должна появляться до появления карточки; сбросим transform через мгновение
    initReveal();
  }

})();