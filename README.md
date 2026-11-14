# daksonc.github.io

Personal professional page of Dakson Chaves Cruz: a DOS-terminal-style, bilingual (EN/PT) static site.

Architecture follows **ADR-001 — Arquitetura do site pessoal profissional**: plain HTML, CSS and JavaScript, no framework, no build step, no third-party resources.

```
index.html               English page (main audience)
pt/index.html            Portuguese page
assets/css/site.css      Terminal look, WCAG 2.2 AA, CRT effects (only with [FX: ON])
assets/js/site.js        Progressive enhancement: boot screen, ASCII developer scene, FX and light/dark switches, optional command line
assets/js/theme.js       Applies the saved light theme before first paint (no dark flash)
assets/fonts/            VT323 (SIL Open Font License, see OFL.txt)
assets/img/              favicon.svg, og.png (LinkedIn preview, 1200x630)
assets/resume/           Résumé PDFs generated from the pages (no phone, no metadata)
scripts/build_resume.py  Regenerates the PDFs from <main> of each page
```

## Run locally

```sh
python3 -m http.server 8000   # open http://localhost:8000
```

## Update checklist

Content is duplicated in two HTML files on purpose (ADR-001 §5). For every content change:

- [ ] Edit `index.html` **and** `pt/index.html` with the same structure.
- [ ] If the hero ASCII art (`renderScene` in site.js) changes, update the static `<pre id="hero-art">` in both pages.
- [ ] Rebuild the résumés: `pip install reportlab && python3 scripts/build_resume.py`.
- [ ] Never publish phone number, address, tokens or private files.
- [ ] Keep the homepage under 100 KB (font not included).
- [ ] Run the checks below.

Open items from ADR-001 §6 are marked in the HTML with `<!-- TODO(ADR-001 §6) -->` (impact metrics and teamwork stories).

## Checks before publishing

- axe DevTools and Lighthouse (target: > 95 in every category) on `/` and `/pt/`.
- Keyboard only: skip link, menu, `[EN] [PT]`, `[FX]`, command line; focus always visible, no traps.
- Screen readers: NVDA (Windows) and VoiceOver (macOS/iOS).
- Browser zoom at 200% and a 320 px wide window: no clipped text, no horizontal scrolling.
- `prefers-reduced-motion: reduce` and `[FX: OFF]`: nothing moves.
- Both themes (`[LIGHT]` / `[DARK]`): contrast and focus visible; on phones (iPhone SE, Pixel, iPad) content starts on the first screen.
- Below 640 px, `[MENU]` folds the header: opens/closes by click, Esc closes and returns focus, a section link closes it.
- With JavaScript disabled: all content is readable.
- DevTools console: no CSP violations.

## Security rules (ADR-001 §4.6)

- CSP is set in a `<meta>` tag in each page. No inline `<script>`, `<style>` or `style=""`, no `eval`, no external URLs for scripts, styles, fonts or images.
- Visitor input (command line) is handled with `textContent` only and matched against a fixed list.
- External links use `rel="noopener noreferrer"`; Referrer-Policy is `strict-origin-when-cross-origin`.

## GitHub settings

- Pages: **Deploy from a branch** → `main` / `(root)`, and **Enforce HTTPS** on.
- Account: two-factor authentication.
- Repository: protect `main`; enable **secret scanning** and **push protection**.
- If a custom domain is adopted later: verify it in GitHub and remove the DNS record if the site is ever taken down.
