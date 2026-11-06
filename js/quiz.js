/* ==========================================================================
   quiz.js — движок тестов самопроверки
   Модальное окно: фокус-трап, Esc, клик вне, мгновенная обратная связь,
   результат, сохранение прогресса в localStorage.
   ========================================================================== */
(function () {
  'use strict';

  var STORAGE = 'mp-answers';
  var current = null;          // { id, title, questions, index }
  var overlay = null;
  var lastFocused = null;
  var liveFeedback = false;    // показывать ли пояснение сразу при выборе

  // Примечание: прогресс тестов НЕ сохраняется и нигде не отображается —
  // ученик проходит тест для самопроверки. Запись в localStorage и события
  // прогресса оставлены для обратной совместимости, но не используются.

  // ---- локальное хранилище прогресса ----
  function getAnswers() {
    try { return JSON.parse(localStorage.getItem(STORAGE)) || {}; } catch (e) { return {}; }
  }
  function saveAnswers(map) {
    try { localStorage.setItem(STORAGE, JSON.stringify(map)); } catch (e) {}
  }

  window.MagicQuiz = {
    isDone: function (id) {
      var a = getAnswers()[id];
      return !!(a && typeof a.correct === 'number');
    },
    getProgress: function (id) {
      var a = getAnswers()[id];
      return a && typeof a.correct === 'number' ? { correct: a.correct, total: a.total } : null;
    },
    markDone: function (id, correct, total) {
      var m = getAnswers();
      m[id] = { correct: correct, total: total, ts: Date.now() };
      saveAnswers(m);
      window.dispatchEvent(new CustomEvent('mp:quizdone', { detail: { id: id } }));
    }
  };

  // ---- построение модалки ----
  function build() {
    overlay = document.createElement('div');
    overlay.className = 'quiz-overlay';
    overlay.innerHTML =
      '<div class="quiz-modal" role="dialog" aria-modal="true" aria-label="Тест самопроверки">' +
        '<div class="quiz-modal__head">' +
          '<div class="quiz-modal__title"></div>' +
          '<button class="quiz-modal__close" aria-label="Закрыть" data-close>&times;</button>' +
        '</div>' +
        '<div class="quiz-modal__body"></div>' +
        '<div class="quiz-modal__foot">' +
          '<button type="button" class="btn btn--ghost btn--sm" data-prev>Назад</button>' +
          '<span style="flex:1"></span>' +
          '<button type="button" class="btn btn--sm" data-next>Далее</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);

    overlay.querySelector('[data-close]').addEventListener('click', function (e) { e.stopPropagation(); close(); });
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    document.addEventListener('keydown', onKey);
  }

  function onKey(e) {
    if (!overlay || !overlay.classList.contains('is-open')) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    if (e.key === 'Tab') trapFocus(e);
  }

  function trapFocus(e) {
    var f = overlay.querySelectorAll('button, input, textarea, a[href]');
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  // ---- API открытия ----
  function open(quiz) {
    if (!overlay) build();
    current = {
      id: quiz.id,
      title: quiz.title,
      questions: quiz.questions,
      index: 0,
      answers: {}
    };
    lastFocused = document.activeElement;
    overlay.querySelector('.quiz-modal__title').textContent = quiz.title;
    overlay.classList.add('is-open');
    renderQuestion();
    var f = overlay.querySelector('button, input');
    if (f) setTimeout(function () { f.focus(); }, 60);
  }

  function close() {
    // прогресс не сохраняется — тест предназначен только для самопроверки
    overlay.classList.remove('is-open');
    current = null;
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  // ---- рендер вопроса ----
  function renderQuestion() {
    var body = overlay.querySelector('.quiz-modal__body');
    var foot = overlay.querySelector('.quiz-modal__foot');
    var q = current.questions[current.index];
    var num = current.index + 1, total = current.questions.length;
    var prevBtn = foot.querySelector('[data-prev]');
    var nextBtn = foot.querySelector('[data-next]');

    prevBtn.style.visibility = current.index === 0 ? 'hidden' : 'visible';
    nextBtn.textContent = (current.index === total - 1) ? 'Результат' : 'Далее';
    nextBtn.style.display = 'inline-flex';
    // кнопка Далее активна только если отвечено
    var hasPrev = !!(current.answers && current.answers[current.index]);
    nextBtn.disabled = !hasPrev;

    var html = '<div class="quiz-question">' +
      '<div class="quiz-question__num">Вопрос ' + num + ' из ' + total + '</div>' +
      '<div class="quiz-question__text">' + q.text + '</div>';

    if (q.type === 'single' || q.type === 'multi') {
      html += '<div class="quiz-options">';
      q.options.forEach(function (opt, i) {
        var t = q.type === 'multi' ? 'checkbox' : 'radio';
        html += '<label class="quiz-option" data-i="' + i + '">' +
          '<input type="' + t + '" name="q' + current.index + '" value="' + i + '">' +
          '<span>' + opt.text + '</span></label>';
      });
      html += '</div>';
    } else if (q.type === 'open') {
      html += '<div class="quiz-open"><textarea rows="3" placeholder="Введите ваш ответ..."></textarea></div>';
    }

    html += '<div class="quiz-feedback"></div></div>';
    body.innerHTML = html;

    wireQuestion(q, body, foot, nextBtn);

    // восстановить сохранённый ответ
    var prev = current.answers[current.index];
    if (prev) restoreAnswer(prev, q, body, foot, nextBtn);
  }

  function wireQuestion(q, body, foot, nextBtn) {
    var inputs = body.querySelectorAll('.quiz-option input');
    inputs.forEach(function (inp) {
      inp.addEventListener('change', function () {
        var selection = collectSelection(q.type, body);
        showFeedback(q, body, selection, foot, nextBtn);
      });
    });
    var ta = body.querySelector('.quiz-open textarea, .quiz-open input');
    if (ta) {
      ta.addEventListener('blur', function () {
        var txt = (ta.value || '').trim();
        showOpenFeedback(q, body, txt, foot, nextBtn);
      });
    }
  }

  function collectSelection(type, body) {
    var checks = body.querySelectorAll('.quiz-option input:checked');
    return Array.prototype.map.call(checks, function (inp) { return Number(inp.value); });
  }

  function isCorrect(q, selection) {
    var ans = q.answer;
    if (q.type === 'multi') {
      var want = Array.isArray(ans) ? ans.slice().sort() : [ans];
      var got = selection.slice().sort();
      return want.length === got.length && want.every(function (v, i) { return v === got[i]; });
    }
    return selection.length === 1 && selection[0] === q.answer;
  }

  function openIsCorrect(q, text) {
    var low = text.toLowerCase();
    var keys = Array.isArray(q.keywords) ? q.keywords : [q.keywords];
    var matched = keys.filter(function (k) { return low.indexOf(k) !== -1; }).length;
    return matched >= (q.minMatch || 1);
  }

  function showFeedback(q, body, selection, foot, nextBtn) {
    var ok = isCorrect(q, selection);
    var fb = body.querySelector('.quiz-feedback');

    // подсветить выбранные
    body.querySelectorAll('.quiz-option').forEach(function (opt) {
      opt.classList.remove('is-correct', 'is-wrong');
    });
    selection.forEach(function (i) {
      var opt = body.querySelector('.quiz-option[data-i="' + i + '"]');
      if (opt) opt.classList.add(ok ? 'is-correct' : 'is-wrong');
    });

    var msg = ok ? (q.explanationCorrect || 'Верно.') : (q.explanationWrong || q.explanationCorrect || 'Ответ неверный.');
    fb.textContent = msg;
    fb.className = 'quiz-feedback show ' + (ok ? 'ok' : 'no');

    current.answers[current.index] = { ok: ok, apply: selection, correctAnswer: q.answer, explanation: msg };
    nextBtn.disabled = false;
  }

  function showOpenFeedback(q, body, text, foot, nextBtn) {
    var ok = text.length > 0 && openIsCorrect(q, text);
    var fb = body.querySelector('.quiz-feedback');
    var msg = ok
      ? (q.explanationCorrect || 'Верно.')
      : ((q.explanationWrong || 'Ответ не полный.') + (q.hint ? ' Подсказка: ' + q.hint : ''));
    fb.textContent = msg;
    fb.className = 'quiz-feedback show ' + (ok ? 'ok' : 'no');
    current.answers[current.index] = { ok: ok, apply: [text], explanation: msg, open: true };
    nextBtn.disabled = false;
  }

  function restoreAnswer(prev, q, body, foot, nextBtn) {
    if (prev.open || !Array.isArray(prev.apply)) {
      var ta = body.querySelector('.quiz-open textarea');
      if (ta && typeof prev.apply[0] === 'string') ta.value = prev.apply[0];
    } else {
      prev.apply.forEach(function (i) {
        var opt = body.querySelector('.quiz-option[data-i="' + i + '"]');
        if (opt) {
          var inp = opt.querySelector('input');
          if (inp) inp.checked = true;
          opt.classList.add(prev.ok ? 'is-correct' : 'is-wrong');
        }
      });
    }
    var fb = body.querySelector('.quiz-feedback');
    if (prev.explanation) {
      fb.textContent = prev.explanation;
      fb.className = 'quiz-feedback show ' + (prev.ok ? 'ok' : 'no');
    }
    nextBtn.disabled = false;
  }

  // ---- навигация ----
  function next() {
    if (current.index < current.questions.length - 1) {
      current.index++;
      renderQuestion();
    } else {
      showResult();
    }
  }
  function prev() {
    if (current.index > 0) { current.index--; renderQuestion(); }
  }

  function showResult() {
    var correct = 0, total = current.questions.length;
    current.questions.forEach(function (_, i) {
      if (current.answers[i] && current.answers[i].ok) correct++;
    });
    var body = overlay.querySelector('.quiz-modal__body');
    var foot = overlay.querySelector('.quiz-modal__foot');

    body.innerHTML =
      '<div class="quiz-result">' +
        '<div class="quiz-result__score">' + correct + ' из ' + total + '</div>' +
        '<div class="quiz-result__label">' + resultPhrase(correct, total) + '</div>' +
        '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">' +
          '<button type="button" class="btn" data-retry>Пройти заново</button>' +
          '<button type="button" class="btn btn--ghost" data-done>Закрыть</button>' +
        '</div>' +
      '</div>';
    foot.querySelector('[data-next]').style.display = 'none';
    foot.querySelector('[data-prev]').style.visibility = 'hidden';

    var retry = body.querySelector('[data-retry]');
    if (retry) retry.addEventListener('click', function () {
      current.index = 0;
      current.answers = {};
      var foot = overlay.querySelector('.quiz-modal__foot');
      foot.querySelector('[data-next]').style.display = 'inline-flex';
      foot.querySelector('[data-next]').textContent = 'Далее';
      renderQuestion();
    });
    var done = body.querySelector('[data-done]');
    if (done) done.addEventListener('click', close);
  }

  function resultPhrase(correct, total) {
    var pct = correct / total;
    if (pct === 1) return 'Отлично! Всё верно.';
    if (pct >= 0.75) return 'Хорошо, но есть пробелы — стоит повторить.';
    if (pct >= 0.5) return 'Удовлетворительно. Вернитесь к лекции.';
    return 'Пока слабовато. Перечитайте лекцию и попробуйте снова.';
  }

  // ---- кнопки «Проверить себя» ----
  function initButtons() {
    // Ищем только кнопки <button>, а не карточки-ссылки <a>
    document.querySelectorAll('[data-quiz-id].btn--quiz').forEach(function (btn) {
      // не вешать обработчик дважды
      if (btn.getAttribute('data-quiz-bound') === '1') return;
      btn.setAttribute('data-quiz-bound', '1');
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var id = btn.getAttribute('data-quiz-id');
        var quiz = (window.MagicQuizData || {})[id];
        if (quiz) open(quiz);
      });
    });
  }

  // ---- shine ----
  function init() {
    build();
    var foot = overlay.querySelector('.quiz-modal__foot');
    foot.querySelector('[data-next]').addEventListener('click', function () { if (!this.disabled) next(); });
    foot.querySelector('[data-prev]').addEventListener('click', prev);
    initButtons();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ключевые моменты: перерегистрация кнопок, если они появились позже
  if ('MutationObserver' in window) {
    var mo = new MutationObserver(function () { initButtons(); });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  }
  document.addEventListener('DOMContentLoaded', initButtons);
})();