/*
 * daksonc.github.io: progressive enhancement only.
 * All content already lives in the HTML; this file adds the visual effects
 * (boot screen, animated ASCII developer, CRT look, light/dark switch) and the optional command prompt.
 * Rules (ADR-001): no third-party code, no innerHTML, no eval.
 */
(() => {
  'use strict';

  const root = document.documentElement;
  const lang = root.lang.startsWith('pt') ? 'pt' : 'en';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const SECTIONS = ['whoami', 'skills', 'experience', 'teamwork', 'education', 'contact'];

  const STRINGS = {
    en: {
      boot: [
        'DAKSON-BIOS v1.0  (C) 2026',
        'Memory test ......... 640K OK',
        'Loading PROFILE.SYS ...... OK',
        'C:\\> whoami',
      ],
      help: `Commands: ${SECTIONS.join(', ')}, fx on|off, theme light|dark, lang en|pt, clear, help`,
      goto: (id) => `Going to ${id}.`,
      fx: (state) => `Visual effects ${state}.`,
      theme: (t) => `${t === 'light' ? 'Light' : 'Dark'} theme on.`,
      themeHint: (next) => ` switch to ${next} theme`,
      usage: (syntax) => `Usage: ${syntax}`,
      unknown: (cmd) => `Bad command or file name: ${cmd}. Type help.`,
      sudo: 'Permission denied. Nice try, though.',
    },
    pt: {
      boot: [
        'DAKSON-BIOS v1.0  (C) 2026',
        'Teste de memória .... 640K OK',
        'Carregando PERFIL.SYS .... OK',
        'C:\\> whoami',
      ],
      help: `Comandos: ${SECTIONS.join(', ')}, fx on|off, theme light|dark, lang en|pt, clear, help`,
      goto: (id) => `Indo para ${id}.`,
      fx: (state) => `Efeitos visuais ${state === 'on' ? 'ligados' : 'desligados'}.`,
      theme: (t) => `Tema ${t === 'light' ? 'claro' : 'escuro'} ativado.`,
      themeHint: (next) => ` mudar para o tema ${next === 'light' ? 'claro' : 'escuro'}`,
      usage: (syntax) => `Uso: ${syntax}`,
      unknown: (cmd) => `Comando ou nome de arquivo inválido: ${cmd}. Digite help.`,
      sudo: 'Permissão negada. Boa tentativa.',
    },
  }[lang];

  /* localStorage can throw (private mode, blocked storage): never let it break the page. */
  const store = {
    get(key) {
      try { return window.localStorage.getItem(key); } catch { return null; }
    },
    set(key, value) {
      try { window.localStorage.setItem(key, value); } catch { /* ignore */ }
    },
  };

  /* ---------- Visual effects switch: [FX: ON/OFF] ---------- */

  // Glow and scanlines are not motion, so FX defaults to on; reduced motion only stops the animations.
  let fx = store.get('fx') === 'off' ? 'off' : 'on';
  const motionAllowed = () => fx === 'on' && !reducedMotion.matches;

  /** MediaQueryList change listener, with the pre-Safari-14 fallback. */
  function onMediaChange(query, listener) {
    if (query.addEventListener) query.addEventListener('change', listener);
    else query.addListener(listener);
  }

  function setFx(value, remember) {
    fx = value;
    if (remember) store.set('fx', value);
    root.classList.toggle('fx', fx === 'on');
    root.classList.toggle('motion', motionAllowed());
    document.getElementById('fx-state').textContent = fx.toUpperCase();
    art.sync();
  }

  /* ---------- Theme switch: [LIGHT] / [DARK] (the saved choice is applied early by theme.js) ---------- */

  const THEME_COLOR = { dark: '#000000', light: '#f4f1e6' };
  let theme = root.dataset.theme === 'light' ? 'light' : 'dark';

  function setTheme(value, remember) {
    theme = value;
    if (theme === 'light') root.dataset.theme = 'light';
    else delete root.dataset.theme;
    if (remember) store.set('theme', theme);
    const next = theme === 'light' ? 'dark' : 'light';
    document.getElementById('theme-state').textContent = next.toUpperCase(); // the button names the other theme
    document.getElementById('theme-hint').textContent = STRINGS.themeHint(next);
    document.querySelector('meta[name="theme-color"]').setAttribute('content', THEME_COLOR[theme]);
  }

  /** Short message for screen readers, through the role="status" region in the header. */
  const announce = (text) => { document.getElementById('status').textContent = text; };

  /* ---------- Hero ASCII art: young developer typing at an old computer ---------- */

  const COLS = 43;
  const ROWS = 15;

  /** Draws one frame: a young developer, seen from behind, at an old CRT computer with a coffee cup. */
  function renderScene({ screen, hands, steam }) {
    const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(' '));
    const put = (r, c, s) => { for (let i = 0; i < s.length; i++) grid[r][c + i] = s[i]; };
    // old CRT computer
    put(0, 4, '.' + '-'.repeat(28) + '.');
    put(1, 4, '|'); put(1, 6, '.' + '-'.repeat(24) + '.'); put(1, 33, '|');
    for (let i = 0; i < 4; i++) {
      put(2 + i, 4, '| |'); put(2 + i, 8, (screen[i] || '').padEnd(22).slice(0, 22)); put(2 + i, 31, '| |');
    }
    put(6, 4, '|'); put(6, 6, "'" + '-'.repeat(24) + "'"); put(6, 33, '|');
    put(7, 4, '|'); put(7, 27, '[] o'); put(7, 33, '|');
    put(8, 4, "'" + '-'.repeat(28) + "'");
    put(9, 0, '='.repeat(COLS));
    // coffee cup next to the computer
    put(4, 37, steam ? ' ( ' : '  )');
    put(5, 37, steam ? '  )' : ' ( ');
    put(6, 36, '.---.');
    put(7, 36, '|   |]');
    put(8, 36, "'---'");
    // young developer, seen from behind
    put(7, 15, '.######.');
    put(8, 14, '/########\\');
    put(9, 13, '(|########|)');
    put(10, 14, '\\########/');
    put(11, 15, "'-.__.-'");
    put(12, 13, "---'    '---");
    put(13, 12, '|'); put(13, 25, '|');
    put(14, 12, '|' + '_'.repeat(12) + '|');
    // arms with elbows out, drawn for the left side and mirrored to the right
    const MIRROR = { '/': '\\', '\\': '/', '(': ')', ')': '(' };
    const arm = (r, c, s, side) => (side === 1
      ? put(r, c, s)
      : put(r, 37 - c - s.length + 1, [...s].reverse().map((ch) => MIRROR[ch] || ch).join('')));
    for (const side of [1, 2]) {
      arm(10, 9, '/  /', side);
      arm(11, 8, '(  (', side);
      arm(12, 9, '\\  \\', side);
      arm(13, 10, '\\_', side);
      // hand on the keyboard; while typing, one hand is lifted at a time
      if (hands === side) {
        arm(8, 10, '.m.', side);
        arm(9, 10, '=|=', side);
      } else {
        arm(9, 10, '_m_', side);
      }
    }
    return grid.map((row) => row.join('').replace(/\s+$/, '')).join('\n');
  }

  const art = (() => {
    const el = document.getElementById('hero-art');
    const SESSION = [
      ['npm test', 'all tests passed'],
      ['git push', 'done.'],
      ['docker compose up', 'api ready'],
      ['python train.py', 'model saved'],
    ];
    const STILL = el.textContent; // the static frame from the HTML
    const KEY_MS = 120; // one keystroke per tick
    const PAUSE_TICKS = 10; // pause after each command, hands resting
    let timer = 0;
    let visible = true;
    let frame = 0;
    let step = 0;
    let typed = 0;
    let pause = 0;
    let history = [];

    function tick() {
      frame++;
      const [cmd, out] = SESSION[step];
      if (typed < cmd.length) {
        typed++;
        if (typed === cmd.length) pause = PAUSE_TICKS;
      } else if (--pause <= 0) {
        history = [...history, `C:\\> ${cmd}`, out].slice(-3);
        step = (step + 1) % SESSION.length;
        typed = 0;
      }
      const cursor = Math.floor(frame / 4) % 2 ? ' ' : '_'; // ~1 blink per second
      const typing = typed > 0 && typed < SESSION[step][0].length;
      el.textContent = renderScene({
        screen: [...history, `C:\\> ${SESSION[step][0].slice(0, typed)}${cursor}`],
        hands: typing ? 1 + (typed % 2) : 0,
        steam: Math.floor((frame + 2) / 4) % 2,
      });
      timer = window.setTimeout(tick, KEY_MS);
    }

    function stop() {
      window.clearTimeout(timer);
      timer = 0;
    }

    const art = {
      sync() {
        if (motionAllowed() && visible) {
          if (!timer) timer = window.setTimeout(tick, KEY_MS);
          return;
        }
        stop();
        if (!motionAllowed()) {
          // Back to the resting frame instead of freezing mid-keystroke.
          el.textContent = STILL;
          frame = step = typed = pause = 0;
          history = [];
        }
      },
    };

    // Pause while the drawing is off screen.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        art.sync();
      }).observe(el);
    }
    return art;
  })();

  /* ---------- Boot screen: first visit only, <= ~2 s, skipped by any key or click ---------- */

  function boot() {
    if (!motionAllowed() || store.get('booted')) return;
    store.set('booted', '1');

    const overlay = document.createElement('div');
    overlay.className = 'boot';
    overlay.setAttribute('aria-hidden', 'true');
    const pre = document.createElement('pre');
    overlay.append(pre);
    document.body.append(overlay);

    const text = STRINGS.boot.join('\n');
    const TYPE_MS = 1500;
    const HOLD_MS = 400;
    let start = 0;
    let raf = 0;

    function finish() {
      window.cancelAnimationFrame(raf);
      overlay.remove();
      window.removeEventListener('keydown', finish, true);
      window.removeEventListener('pointerdown', finish, true);
    }

    function type(now) {
      start = start || now;
      const elapsed = now - start;
      pre.textContent = text.slice(0, Math.ceil((elapsed / TYPE_MS) * text.length));
      if (elapsed < TYPE_MS + HOLD_MS) raf = window.requestAnimationFrame(type);
      else finish();
    }

    window.addEventListener('keydown', finish, true);
    window.addEventListener('pointerdown', finish, true);
    raf = window.requestAnimationFrame(type);
  }

  /* ---------- Optional command prompt (an extra; the menu is the main navigation) ---------- */

  function cli() {
    const form = document.getElementById('cli');
    const input = document.getElementById('cli-input');
    const output = document.getElementById('cli-output');
    const MAX_LINES = 12;

    /** Visitor input is only ever treated as text. Echoes are hidden from screen readers. */
    function print(text, echo = false) {
      const p = document.createElement('p');
      p.textContent = text;
      if (echo) p.setAttribute('aria-hidden', 'true');
      output.append(p);
      while (output.childElementCount > MAX_LINES) output.firstElementChild.remove();
    }

    function goTo(id) {
      const section = document.getElementById(id);
      section.scrollIntoView({ behavior: motionAllowed() ? 'smooth' : 'auto' });
      // Move focus to the section so the next Tab continues from there (WCAG 2.4.3).
      (section.querySelector('h1, h2') || section).focus({ preventScroll: true });
      window.history.replaceState(null, '', `#${id}`);
      print(STRINGS.goto(id));
    }

    function switchLang(target) {
      const link = document.querySelector(`.lang a[hreflang="${target}"]`);
      window.location.href = link.href;
    }

    function run(raw) {
      const [cmd, arg] = raw.trim().toLowerCase().split(/\s+/);
      if (!cmd) return;
      print(`C:\\> ${raw.trim()}`, true);

      if (SECTIONS.includes(cmd)) goTo(cmd);
      else if (cmd === 'help') print(STRINGS.help);
      else if (cmd === 'clear' || cmd === 'cls') output.replaceChildren(); // cls: the DOS original
      else if (cmd === 'fx') {
        if (arg === 'on' || arg === 'off') { setFx(arg, true); print(STRINGS.fx(arg)); }
        else print(STRINGS.usage('fx on|off'));
      } else if (cmd === 'theme') {
        if (arg === 'light' || arg === 'dark') { setTheme(arg, true); print(STRINGS.theme(arg)); }
        else print(STRINGS.usage('theme light|dark'));
      } else if (cmd === 'lang') {
        if (arg === 'en' || arg === 'pt') switchLang(arg);
        else print(STRINGS.usage('lang en|pt'));
      }
      else if (cmd === 'sudo') print(STRINGS.sudo);
      else print(STRINGS.unknown(cmd));
    }

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      run(input.value);
      input.value = '';
    });
    document.getElementById('cli-wrap').hidden = false;
  }

  /* ---------- Header [MENU]: on small screens the controls, menu and command line fold into a panel ---------- */

  function headerMenu() {
    const button = document.getElementById('menu-toggle');
    const panel = document.getElementById('header-panel');
    const isOpen = () => button.getAttribute('aria-expanded') === 'true';
    const setOpen = (open) => {
      button.setAttribute('aria-expanded', String(open));
      panel.classList.toggle('open', open);
    };

    button.addEventListener('click', () => setOpen(!isOpen()));
    // Picking a section closes the panel (the link then moves focus to that section).
    panel.addEventListener('click', (event) => {
      if (event.target.closest('.menu a')) setOpen(false);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && isOpen()) {
        setOpen(false);
        button.focus();
      }
    });
    // Leaving the small-screen layout (rotation, resize) resets the panel.
    onMediaChange(window.matchMedia('(max-width: 40rem)'), () => setOpen(false));
    root.classList.add('has-menu'); // CSS shows [MENU] only when this script runs
  }

  /* ---------- Back to top: shown only once the header has scrolled out of view ---------- */

  function backToTop() {
    const link = document.getElementById('to-top');
    if (!('IntersectionObserver' in window)) return; // stays always visible
    link.classList.add('is-off'); // page loads at the top: no flash before the first callback
    new IntersectionObserver(([entry]) => {
      link.classList.toggle('is-off', entry.isIntersecting);
      window.requestAnimationFrame(() => link.classList.add('ready')); // fade only after that
    }).observe(document.querySelector('header'));
  }

  /* ---------- Init ---------- */

  const fxButton = document.getElementById('fx-toggle');
  fxButton.addEventListener('click', () => {
    setFx(fx === 'on' ? 'off' : 'on', true);
    announce(STRINGS.fx(fx));
  });
  fxButton.hidden = false;

  const themeButton = document.getElementById('theme-toggle');
  themeButton.addEventListener('click', () => {
    setTheme(theme === 'light' ? 'dark' : 'light', true);
    announce(STRINGS.theme(theme));
  });
  themeButton.hidden = false;
  setTheme(theme, false);
  onMediaChange(reducedMotion, () => setFx(fx, false));
  setFx(fx, false);
  boot();
  cli();
  headerMenu();
  backToTop();
})();
