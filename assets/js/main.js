/* Sleek Modern on the template kit.
 *
 * The kit fills the page from the contract. This script adds the template's own touches, each one
 * derived from contract fields:
 * - the brand (the initials as a code tag, and the first name) and the name, fitted to its column;
 * - the role badge, which turns from hero.title through the titles of the current roles and back;
 * - the stage: the portrait behind the developer.js window, whose object holds the name,
 *   hero.title and the first skill items, and the skill groups floating as badges;
 * - about: the lede, and an icon for each fact from its label;
 * - skills: an icon for each group from its name;
 * - roles: the current mark, company monograms when others have a logo, and logo mounts by tone;
 * - projects: numbers by order, drawings with a full-size link, a featured project's highlights
 *   in the picture's place when it has none, covers in a grid where others have pictures;
 * - contact: each channel labelled by its kind.
 *
 * Motion (the reveals, the badge drift, the caret and the role badge) runs only when the visitor
 * has not asked for reduced motion. Text goes in only through textContent; every data value placed
 * in a link or an image goes through kit.url or kit.src. */
(() => {
  'use strict';

  const kit = window.kit;
  if (!kit) return;

  const root = document.documentElement;
  const $ = (sel, scope = document) => scope.querySelector(sel);
  const $$ = (sel, scope = document) => [...scope.querySelectorAll(sel)];
  const str = (v) => (typeof v === 'string' ? v.trim() : '');
  const list = (v) => (Array.isArray(v) ? v : []);
  const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
  // a current role: no end date (with a start), or an end that reads "Present"
  const isCurrent = (role) =>
    (!str(role.end) && !!str(role.start)) || /^present$/i.test(str(role.end));
  // at and below this width the bar is always the compact one (styles.css, max-width: 860px)
  const NARROW = '(max-width: 860px)';
  const SVG = 'http://www.w3.org/2000/svg';

  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text) node.textContent = text;
    return node;
  }

  function icon(name) {
    const svg = document.createElementNS(SVG, 'svg');
    svg.setAttribute('class', 'kit-icon');
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS(SVG, 'use');
    use.setAttribute('href', `#kit-${name}`);
    svg.append(use);
    return svg;
  }

  function image(src, alt, width, height) {
    const img = document.createElement('img');
    const attrs = { src, alt, width, height, loading: 'lazy', decoding: 'async' };
    for (const k of Object.keys(attrs)) img.setAttribute(k, attrs[k]);
    return img;
  }

  const onResize = (fn) => {
    let raf = 0;
    addEventListener('resize', () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(fn);
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fn);
  };

  /* ------------------------------------------------------------ icons from words */
  const pick = (rules, text, fallback) => {
    const t = text.toLowerCase();
    for (const [re, name] of rules) if (re.test(t)) return name;
    return fallback;
  };
  const SKILL_ICONS = [
    [/machine|learning|\bml\b|\bai\b|deep|nlp|vision/, 'cpu'],
    [/data|sql|messag|storage|warehouse|pipeline/, 'database'],
    [/mlops|devops|cloud|platform|infra|\bops\b|kubernetes|deploy/, 'cloud'],
    [/model|forecast|analy/, 'chart'],
    [/statist|math|experiment|research|access|usab/, 'target'],
    [/prototyp|motion|illustrat|animation/, 'pen-tool'],
    [/design|\bui\b|\bux\b|visual|interface|brand/, 'palette'],
    [/language|programming|code|front|web|engineer/, 'code'],
    [/backend|system|api|server|architect/, 'server'],
    [/test|quality/, 'check'],
    [/lead|manage|mentor|team|communicat/, 'user'],
    [/tool|stack|framework|librar/, 'layers'],
  ];
  const ROTATE = ['layers', 'zap', 'sparkles', 'rocket'];
  const skillIcon = (name, i) => pick(SKILL_ICONS, name, ROTATE[i % ROTATE.length]);
  const FACT_ICONS = [
    [/focus|speciali|interest/, 'target'],
    [/based|location|city|where|home/, 'map-pin'],
    [/language|speak/, 'globe'],
    [/time ?zone|hours/, 'clock'],
    [/tool|stack|tech|software/, 'layers'],
    [/industr|sector|domain|client/, 'building'],
    [/educat|degree|study/, 'graduation-cap'],
    [/award|certif/, 'award'],
    [/role|work|experience|career/, 'briefcase'],
    [/mail|contact|reach/, 'mail'],
  ];

  /* ------------------------------------------------------- the brand and the name */
  function brand(name) {
    const mark = $('.js-initials');
    const first = $('.js-first');
    if (mark) mark.textContent = kit.util.initials(name);
    if (first) first.textContent = kit.util.firstName(name);
  }

  function heroName(name) {
    const h1 = $('.js-name');
    if (!h1 || !name) return;
    h1.textContent = '';
    h1.append(el('span', 'name-text', name));
    if (name.length > 26) root.dataset.nameLong = '1';
    // the longest unbreakable piece (a word, or a hyphenated word up to its hyphen) sets the size
    const pieces = name.split(/\s+/).flatMap((w) => w.split(/(?<=-)/));
    const fit = () => {
      h1.style.fontSize = '';
      const probe = el('span', 'name-text');
      probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;left:0;top:0';
      h1.append(probe);
      let widest = 0;
      for (const p of pieces) {
        probe.textContent = p;
        widest = Math.max(widest, probe.getBoundingClientRect().width);
      }
      probe.remove();
      const room = h1.clientWidth;
      if (!room || widest <= room) return;
      const base = parseFloat(getComputedStyle(h1).fontSize);
      h1.style.fontSize = `${Math.max(26, Math.floor((base * room * 0.97) / widest))}px`;
    };
    fit();
    onResize(fit);
  }

  /* ------------- the role badge: hero.title, then each current role's title, then back */
  function rotor(data) {
    const node = $('.js-rotor');
    if (!node) return;
    const title = str(obj(data.hero).title);
    // only what the person does now: a past title ("Analytics Intern") never shows here
    const now = list(obj(data.experience).roles)
      .map(obj)
      .filter(isCurrent)
      .map((r) => str(r.title));
    const seen = new Set();
    const seq = [title, ...now].filter((t) => {
      const key = t.toLowerCase();
      if (!t || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    // one title, or reduced motion (and so every screenshot): the badge simply reads hero.title
    if (kit.reducedMotion || seq.length < 2) return;
    const badge = $('.js-badge');
    // the badge keeps the size of its largest title, so nothing around it moves
    const hold = () => {
      badge.style.minHeight = '';
      badge.style.minWidth = '';
      const was = node.textContent;
      let tall = badge.getBoundingClientRect().height;
      let wide = badge.getBoundingClientRect().width;
      for (const t of seq) {
        node.textContent = t;
        const r = badge.getBoundingClientRect();
        tall = Math.max(tall, r.height);
        wide = Math.max(wide, r.width);
      }
      node.textContent = was;
      badge.style.minHeight = `${Math.ceil(tall)}px`;
      badge.style.minWidth = `${Math.min(Math.ceil(wide), badge.parentElement.clientWidth)}px`;
    };
    hold();
    onResize(hold);
    const wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
    let done = false;
    const swap = async (t) => {
      node.classList.add('is-out');
      await wait(230);
      if (!done || t === title) node.textContent = t;
      node.classList.remove('is-out');
    };
    // printing mid-turn prints the headline title
    addEventListener('beforeprint', () => {
      node.textContent = title;
      node.classList.remove('is-out');
    });
    (async () => {
      await wait(2600);
      // one pass through the current titles, then back to the headline title, where it stays
      for (const next of [...seq.slice(1), title]) {
        await swap(next);
        if (next !== title) await wait(2400);
      }
      done = true;
    })();
  }

  /* --------------------------------------------------------------------- the hero */
  // the first skill items: the first item of every group, then the second, and so on
  function firstSkills(groups, max) {
    const lists = groups.map((g) => list(g.items).map(str).filter(Boolean));
    const out = [];
    const seen = new Set();
    for (let round = 0; out.length < max && lists.some((l) => l.length > round); round++) {
      for (const l of lists) {
        const v = l[round];
        if (!v || seen.has(v.toLowerCase())) continue;
        seen.add(v.toLowerCase());
        out.push(v);
        if (out.length === max) break;
      }
    }
    return out;
  }

  const quote = (s) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

  function codeWindow(data, photo) {
    const body = $('.js-code-body');
    if (!body) return;
    const hero = obj(data.hero);
    const name = str(hero.name);
    const title = str(hero.title);
    const groups = list(obj(data.skills).groups).map(obj);
    const stack = firstSkills(groups, photo ? 4 : 5);
    const lines = [];
    const line = (indent, ...tokens) => lines.push({ indent, tokens });
    const S = (v) => ['t-s', quote(v)];
    line(0, ['t-k', 'const'], ['', ' '], ['t-v', 'developer'], ['t-o', ' = {']);
    line(1, ['t-p', 'name'], ['t-o', ': '], S(name), ['t-o', ',']);
    if (title) line(1, ['t-p', 'role'], ['t-o', ': '], S(title), ['t-o', ',']);
    if (stack.length) {
      line(1, ['t-p', 'stack'], ['t-o', ': [']);
      // beside a portrait the items go two to a line, so the window stays short
      const per = photo ? 2 : 1;
      for (let i = 0; i < stack.length; i += per) {
        const tokens = [];
        stack.slice(i, i + per).forEach((v, j) => {
          if (j) tokens.push(['t-o', ' ']);
          tokens.push(S(v), ['t-o', ',']);
        });
        line(2, ...tokens);
      }
      line(1, ['t-o', '],']);
    }
    line(0, ['t-o', '};']);
    line(0);
    line(
      0,
      ['t-k', 'export default'],
      ['', ' '],
      ['t-v', 'developer'],
      ['t-o', ';'],
      ['caret', '']
    );
    for (const { indent, tokens } of lines) {
      const li = el('li');
      const code = el('span', 'code-line');
      code.style.setProperty('--i', String(indent));
      for (const [cls, text] of tokens) {
        const t = el('span', cls);
        t.textContent = text;
        code.append(t);
      }
      li.append(code);
      body.append(li);
    }
  }

  function badges(data) {
    const ul = $('.js-badges');
    if (!ul) return;
    const names = list(obj(data.skills).groups)
      .map((g) => str(obj(g).name))
      .filter(Boolean)
      .slice(0, 3);
    if (!names.length) return ul.remove();
    names.forEach((n, i) => {
      const li = el('li', 'badge');
      const ic = el('span', 'badge-icon');
      ic.append(icon(skillIcon(n, i)));
      li.append(ic, el('span', 'badge-text', n));
      ul.append(li);
    });
  }

  // the badges keep clear of the window's own labels: without a portrait the first badge leaves
  // the title bar when it would reach the "developer.js" chip; beside a portrait a name longer
  // than two lines sends the badges under the window. Measured after the fonts load and on resize
  function placeBadges(photo) {
    const stage = $('.js-stage');
    const ul = $('.js-badges');
    if (!stage || !ul || !ul.children.length) return;
    const file = $('.code-file');
    const fit = () => {
      stage.classList.remove('is-flow');
      const items = [...ul.children];
      if (photo) {
        const beside = getComputedStyle(ul).flexDirection === 'column';
        if (beside && items.some((b) => b.getBoundingClientRect().height > 60)) {
          stage.classList.add('is-flow');
        }
        return;
      }
      const first = items[0];
      if (!file || getComputedStyle(first).position !== 'absolute') return;
      const room = first.getBoundingClientRect().left - file.getBoundingClientRect().right;
      if (room < 16) stage.classList.add('is-flow');
    };
    fit();
    onResize(fit);
  }

  function hero(data) {
    const status = $('.js-status');
    if (status && !status.querySelector('[data-kit-text]')) status.remove();
    const where = $('.js-where');
    if (where && !where.querySelector('[data-kit-text]')) where.remove();
    const meta = $('.js-meta');
    if (meta && !meta.children.length) meta.remove();
    const badge = $('.js-badge');
    if (badge && !badge.querySelector('.js-rotor')) badge.remove();
    const readouts = $('.js-readouts');
    if (readouts && !readouts.querySelector('[data-kit="readouts"]')) readouts.remove();

    const portrait = $('.js-portrait');
    const photo = !!(portrait && portrait.querySelector('img'));
    if (!photo) portrait?.remove();
    $('#hero')?.classList.add(photo ? 'has-photo' : 'no-photo');
    codeWindow(data, photo);
    badges(data);
    placeBadges(photo);
  }

  /* ------------------------------------------------------------------------ about */
  function about() {
    const grid = $('.js-about');
    if (!grid) return;
    const story = $('.js-story');
    const facts = $('.js-facts');
    const paras = story ? $$('.story-p', story).length : 0;
    const factCount = facts ? $$('.fact', facts).length : 0;
    if (!paras) story?.remove();
    if (!factCount) facts?.remove();
    if (!paras || !factCount) grid.classList.add('is-solo');
    if (paras === 1 && !factCount) story.classList.add('is-single');
    for (const fact of facts ? $$('.fact', facts) : []) {
      const label = $('[data-kit-field="label"]', fact)?.textContent || '';
      const slot = $('.js-fact-icon', fact);
      if (slot) slot.append(icon(pick(FACT_ICONS, label, 'sparkles')));
    }
  }

  /* ----------------------------------------------------------------------- skills */
  function skills() {
    $$('[data-kit-list="groups"] > .group').forEach((g, i) => {
      const name = $('.group-name', g)?.textContent || '';
      $('.js-group-icon', g)?.append(icon(skillIcon(name, i)));
    });
  }

  /* --------------------------------------------- roles: current, monograms, logos */
  function logoMount(img, wrap) {
    const read = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      if (w && h && w / h > 1.6) wrap.classList.add('is-wide');
      try {
        const size = 40;
        const c = document.createElement('canvas');
        c.width = size;
        c.height = size;
        const g = c.getContext('2d', { willReadFrequently: true });
        g.drawImage(img, 0, 0, size, size);
        const px = g.getImageData(0, 0, size, size).data;
        let opaque = 0;
        let weight = 0;
        let light = 0;
        for (let i = 0; i < px.length; i += 4) {
          const a = px[i + 3] / 255;
          if (a < 0.1) continue;
          opaque++;
          weight += a;
          light += ((0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255) * a;
        }
        if (!weight) return;
        // a logo on its own plate shows edge to edge; a dark mark on a transparent ground gets a
        // light mount, so it never vanishes into the midnight tile
        if (opaque / (size * size) >= 0.82) wrap.classList.add('is-plate');
        else if (light / weight < 0.3) wrap.classList.add('is-light');
      } catch {
        /* an unreadable image keeps the plain midnight mount */
      }
    };
    if (img.complete && img.naturalWidth) read();
    else img.addEventListener('load', read, { once: true });
  }

  function roles(data) {
    const all = list(obj(data.experience).roles).map(obj);
    const items = $$('[data-kit-list="roles"] > .role');
    const anyLogo = items.some((item) => item.dataset.kitLogo === '1');
    items.forEach((item, i) => {
      const role = all[i] || {};
      if (isCurrent(role)) item.classList.add('is-current');
      else $('.js-now', item)?.remove();
      const mono = $('.js-mono', item);
      // a monogram keeps a role without a logo in step with the ones that have one
      if (mono && item.dataset.kitLogo === '0' && anyLogo && str(role.company)) {
        mono.textContent = kit.util.initials(str(role.company));
      } else mono?.remove();
      const mark = $('.role-mark', item);
      if (mark && !mark.children.length) mark.remove();
      const when = $('.role-when', item);
      if (when && !when.children.length) when.remove();
      const where = $('.js-role-where', item);
      if (where && !where.querySelector('[data-kit-field]')) where.remove();
      const earlier = $('.js-earlier', item);
      if (earlier && !earlier.querySelector('.kit-earlier')) earlier.remove();
      const stack = $('.js-role-stack', item);
      if (stack && !stack.querySelector('.chips')) {
        stack.remove();
        item.classList.add('no-stack');
      }
      const img = $('.role-logo img', item);
      if (img) logoMount(img, img.parentElement);
    });
  }

  /* ------------------------------- projects: numbers, drawings, highlights, covers */
  function drawingCaption(fig, href, name) {
    if (!fig || fig.querySelector('.kit-caption')) return;
    const cap = el('figcaption', 'kit-caption');
    cap.append(el('span', '', 'Architecture diagram'));
    if (href) {
      const a = el('a', 'fig-open', 'Open full size');
      a.setAttribute('href', href);
      a.target = '_blank';
      a.rel = 'noopener';
      a.setAttribute('aria-label', `Open full size: ${name} architecture diagram`);
      cap.append(a);
    }
    fig.append(cap);
  }

  function dotsBar() {
    const dots = el('span', 'dots');
    dots.setAttribute('aria-hidden', 'true');
    dots.append(el('i'), el('i'), el('i'));
    return dots;
  }

  function projects(data) {
    const all = list(obj(data.projects).projects).map(obj);
    const layoutOn = /^(split|stack)$/.test(root.dataset.kitFeaturedLayout || '');
    const hasFeatured = !!$('[data-kit-list="featured"]');
    const isFeatured = (p) => layoutOn && hasFeatured && p.featured === true;
    const groups = [
      ['[data-kit-list="featured"] > .feature', all.filter(isFeatured)],
      ['[data-kit-list="projects"] > .card', all.filter((p) => !isFeatured(p))],
    ];
    for (const [sel, items] of groups) {
      $$(sel).forEach((card, i) => {
        const p = items[i] || {};
        const name = str(p.name);
        for (const n of $$('.js-num', card)) n.textContent = kit.util.pad(all.indexOf(p) + 1);
        const drawingSrc = kit.src(p.image);
        const drawingHref = kit.url(p.image);
        const render = $('.kit-media--render', card);
        // the kit shows the render when there is one; the drawing follows it in its own window
        if (render && drawingSrc) {
          const fig = el('figure', 'window kit-media--schematic');
          fig.append(dotsBar(), image(drawingSrc, `${name} architecture diagram`, 640, 360));
          render.after(fig);
          drawingCaption(fig, drawingHref, name);
        } else drawingCaption($('.kit-media--schematic', card), drawingHref, name);
        if (!card.classList.contains('feature') || card.dataset.kitMedia === '1') return;
        // a featured project without a picture: its highlights fill a window in the picture's place
        const checks = $('.js-checks', card);
        const media = $('.js-media', card);
        if (checks && checks.children.length && media) {
          const win = el('div', 'window window--results');
          const title = el('p', 'results-title', 'Highlights');
          checks.className = 'results';
          win.append(dotsBar(), title, checks);
          media.append(win);
          card.classList.add('is-results');
        } else card.classList.add('is-plain');
      });
    }
    const cards = $$('[data-kit-list="projects"] > .card');
    // in a grid where some cards have a picture, the others get a numbered cover in its place
    if (cards.some((c) => c.dataset.kitMedia === '1')) {
      for (const c of cards.filter((x) => x.dataset.kitMedia === '0')) {
        const cover = el('div', 'window window--cover');
        cover.setAttribute('aria-hidden', 'true');
        const art = el('div', 'cover');
        art.append(el('span', 'cover-num', $('.js-num', c)?.textContent || ''));
        cover.append(dotsBar(), art);
        c.prepend(cover);
      }
    }
    // "More projects" heads the grid only when featured cards stand above it
    const features = $$('[data-kit-list="featured"] > .feature').length;
    if (!features || !cards.length) $('.js-more')?.remove();
  }

  /* ------------------------------------------------------------------ credentials */
  function creds() {
    const band = $('.js-creds');
    if (!band) return;
    const n = $$('section', band).length;
    if (!n) return band.remove();
    band.classList.toggle('is-single', n === 1);
    for (const edu of $$('.edu')) {
      const h = $('.edu-title', edu);
      const parts = h ? h.querySelectorAll('[data-kit-field]') : [];
      if (h && !parts.length) h.remove();
      else if (h && parts.length < 2) h.querySelector('.edu-sep')?.remove();
    }
  }

  /* ---------------------------------------------------------------------- contact */
  function breakHints(node) {
    // a long address breaks after a slash, before an @, or after a dot that leaves a long part,
    // before it breaks inside a word
    const text = node.textContent;
    const parts = text.split(/(?<=\/)|(?=@)|(?<=\.)(?=[^./@]{6,})/);
    if (parts.length < 2) return;
    node.textContent = '';
    for (const part of parts) {
      if (node.childNodes.length) node.append(document.createElement('wbr'));
      node.append(part);
    }
  }

  function kindOf(href) {
    if (/^mailto:/.test(href)) return 'Email';
    if (/^tel:/.test(href)) return 'Phone';
    if (/^https?:\/\/([\w-]+\.)*github\.com\b/i.test(href)) return 'GitHub';
    if (/^https?:\/\/([\w-]+\.)*linkedin\.com\b/i.test(href)) return 'LinkedIn';
    return 'Website';
  }

  function contact() {
    const section = $('#contact');
    if (!section) return;
    const channels = $('.channels', section);
    if (!channels) section.classList.add('is-solo');
    for (const a of channels ? $$('.kit-contact', channels) : []) {
      const href = a.getAttribute('href') || '';
      const svg = $('svg', a);
      const value = $(':scope > span', a);
      if (!svg || !value) continue;
      const tile = el('span', 'ch-icon');
      svg.replaceWith(tile);
      tile.append(svg);
      // a web link keeps its full address; its label drops a leading "www." to stay short
      if (/^https?:/.test(href)) value.textContent = value.textContent.replace(/^www\./, '');
      value.className = 'ch-value';
      breakHints(value);
      const text = el('span', 'ch-text');
      value.replaceWith(text);
      text.append(el('span', 'ch-label', kindOf(href)), value);
      const arrow = icon('arrow-up-right');
      arrow.classList.add('ch-arrow');
      a.append(arrow);
    }
  }

  /* -------------------------------------------------------------------------- bar */
  function bar() {
    const shell = $('#bar');
    if (!shell) return;
    const toggle = $('.menu-btn', shell);
    const menu = $('#menu');
    if (!menu) {
      toggle?.remove();
      return;
    }
    const set = (open) => {
      shell.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.querySelector('use')?.setAttribute('href', open ? '#kit-close' : '#kit-menu');
    };
    toggle.addEventListener('click', () => set(!shell.classList.contains('is-open')));
    menu.addEventListener('click', (e) => {
      if (e.target.closest('a')) set(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && shell.classList.contains('is-open')) {
        set(false);
        toggle.focus();
      }
    });
    document.addEventListener('click', (e) => {
      if (!shell.contains(e.target)) set(false);
    });
    // the sections share the bar only while they fit on its one row; else the menu button
    const inner = $('.bar-in', shell);
    const brandLink = $('.brand', shell);
    const narrow = matchMedia(NARROW);
    const fit = () => {
      shell.classList.remove('is-compact');
      const cs = getComputedStyle(inner);
      const room = inner.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const gap = parseFloat(cs.columnGap) || 24;
      const brandNeed = Math.min(brandLink.scrollWidth, 260);
      const need = brandNeed + gap + menu.scrollWidth + 8;
      if (narrow.matches || need > room) shell.classList.add('is-compact');
      else set(false);
    };
    fit();
    onResize(fit);
  }

  /* --------------------------------------------------------- the CTA arrow, reveals */
  function ctaArrow() {
    const primary = $('.ctas .kit-cta--primary');
    if (primary && /^#/.test(primary.getAttribute('href') || '')) {
      const arrow = icon('arrow-right');
      arrow.classList.add('cta-arrow');
      primary.append(arrow);
    }
  }

  function reveals() {
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    );
    const sel =
      '.sec .head, .about-grid, .group, .role, .feature, .more, .card, .cred, .contact-panel';
    for (const node of $$(sel)) {
      node.classList.add('reveal');
      io.observe(node);
    }
  }

  kit.on('ready', (data) => {
    const name = str(obj(data.hero).name);
    brand(name);
    heroName(name);
    hero(data);
    about();
    skills();
    roles(data);
    projects(data);
    creds();
    contact();
    ctaArrow();
    for (const a of $$('a[href^="http"]')) {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }
    bar();
    rotor(data);
    // a printed page has every picture, also the ones not yet scrolled to
    addEventListener('beforeprint', () => {
      for (const img of $$('img[loading="lazy"]')) img.loading = 'eager';
    });
    if (!kit.reducedMotion) {
      root.classList.add('motion-ok');
      reveals();
    }
  });
})();
