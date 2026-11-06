/* ==========================================================================
   theme.js — переключение тёмной/светлой темы
   localStorage + prefers-color-scheme. Плавные переходы в CSS.
   ========================================================================== */
(function () {
  'use strict';

  var STORAGE_KEY = 'mp-theme';
  var root = document.documentElement;

  function getSystemTheme() {
    return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
      ? 'dark' : 'light';
  }

  function getSaved() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }

  function setTheme(theme, persist) {
    root.setAttribute('data-theme', theme);
    if (persist !== false) {
      try { localStorage.setItem(STORAGE_KEY, theme); } catch (e) { /* ignore */ }
    }
    // обновить иконку на переключателе, если есть
    var btn = document.querySelector('[data-theme-toggle]');
    if (btn) {
      var iconDark = btn.querySelector('[data-icon="dark"]');
      var iconLight = btn.querySelector('[data-icon="light"]');
      if (iconDark) iconDark.style.display = theme === 'dark' ? 'none' : 'inline-block';
      if (iconLight) iconLight.style.display = theme === 'dark' ? 'inline-block' : 'none';
    }
  }

  function init() {
    var saved = getSaved();
    if (saved === 'dark' || saved === 'light') {
      setTheme(saved);
    } else {
      setTheme(getSystemTheme(), false);
    }

    var btn = document.querySelector('[data-theme-toggle]');
    if (btn) {
      btn.addEventListener('click', function () {
        var cur = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        setTheme(cur, true);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.MagicTheme = { setTheme: setTheme, getTheme: function(){ return root.getAttribute('data-theme'); } };
})();