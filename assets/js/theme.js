/*
 * Applies the saved light/dark theme before the first paint, so a light-theme
 * visitor never sees a dark flash. Loaded in <head> without defer; the CSP
 * forbids inline scripts, hence this tiny separate file. The toggle lives in site.js.
 */
try {
  if (window.localStorage.getItem('theme') === 'light') document.documentElement.dataset.theme = 'light';
} catch { /* storage blocked: keep the default dark theme */ }
