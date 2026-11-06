/* ==========================================================================
   cursor.js — кастомный «магический» курсор.
   Точка следует за мышью без отставания (без lerp), с шлейфом частиц
   и всполохом на клик. Отключается на мобильных и при prefers-reduced-motion.
   ========================================================================== */
(function () {
  'use strict';

  var canMagic =
    window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!canMagic) {
    document.body.classList.remove('has-magic');
    return;
  }

  document.body.classList.add('has-magic');

  // Кастомная точка курсора
  var dot = document.createElement('div');
  dot.className = 'magic-dot';
  document.body.appendChild(dot);

  // точка всегда в позиции мыши — без сглаживания, курсор не отстаёт
  var lastX = null, lastY = null;
  document.addEventListener('mousemove', function (e) {
    if (dot) {
      dot.style.left = e.clientX + 'px';
      dot.style.top = e.clientY + 'px';
    }
    lastX = e.clientX;
    lastY = e.clientY;
  }, { passive: true });

  // Шлейф частиц — по таймеру, а не в каждом кадре, чтобы не тормозить
  setInterval(function () {
    if (lastX == null) return;
    spawnParticle(lastX, lastY);
  }, 55);

  function spawnParticle(x, y) {
    var p = document.createElement('div');
    p.className = 'magic-particle';
    p.style.left = x + 'px';
    p.style.top = y + 'px';
    var dx = (Math.random() - 0.5) * 36;
    var dy = -14 - Math.random() * 22;
    p.style.setProperty('--dx', dx + 'px');
    p.style.setProperty('--dy', dy + 'px');
    document.body.appendChild(p);
    setTimeout(function () { if (p) p.remove(); }, 1200);
  }

  // Всполох на клик
  document.addEventListener('click', function (e) {
    var burst = document.createElement('div');
    burst.className = 'magic-burst';
    var size = 30 + Math.random() * 40;
    burst.style.width = size + 'px';
    burst.style.height = size + 'px';
    burst.style.left = e.clientX + 'px';
    burst.style.top = e.clientY + 'px';
    document.body.appendChild(burst);
    setTimeout(function () { if (burst) burst.remove(); }, 450);
  }, { passive: true });

  // Подсветка точки на интерактивных элементах — только размер, без смены цвета
  function paintHot(e) {
    var target = e.target;
    var interactive = target.closest('a, button, .card, .quiz-option, .task-card, input, summary');
    if (interactive) {
      dot.classList.add('is-hot');
    } else {
      dot.classList.remove('is-hot');
    }
  }
  document.addEventListener('mouseover', paintHot, { passive: true });
  document.addEventListener('mouseout', paintHot, { passive: true });

  window.MagicCursor = { enable: function(){}, disable: function(){} };
})();