/* Hall of Fame · Sistema 1% — render del ranking (sin dependencias). */
(function () {
  'use strict';

  var RANKS = [
    { key: 'atleta', name: 'Atleta 1%', min: 1, req: '1–2', glyph: 'I' },
    { key: 'elite', name: 'Atleta de Élite', min: 3, req: '3–4', glyph: 'II' },
    { key: 'leyenda', name: 'Leyenda 1%', min: 5, req: '5–6', glyph: 'III' },
    { key: 'fundador', name: 'Fundador 1%', min: 7, req: '7+', glyph: 'IV' },
  ];
  var CAT_GLYPH = {
    Resistencia: 'RS',
    Fuerza: 'FZ',
    Retos: 'RT',
    'Composición física': 'CF',
    Hábitos: 'HB',
    Fidelidad: 'FD',
  };
  var MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  var assets = { hero: {}, ranks: {}, categories: {} };

  // ---------- utilidades ----------
  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        if (attrs[k] == null || attrs[k] === false) continue;
        if (k === 'class') el.className = attrs[k];
        else if (k === 'text') el.textContent = attrs[k];
        else if (k === 'style') el.style.cssText = attrs[k];
        else el.setAttribute(k, attrs[k]);
      }
    }
    (children || []).forEach(function (c) {
      if (c == null) return;
      el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return el;
  }
  function rankByKey(key) {
    for (var i = 0; i < RANKS.length; i++) if (RANKS[i].key === key) return RANKS[i];
    return null;
  }
  function pad(n) {
    return n < 10 ? '0' + n : String(n);
  }
  function fmtDate(iso) {
    if (!iso) return '';
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
    if (!m) return iso;
    return Number(m[3]) + ' ' + MONTHS[Number(m[2]) - 1] + ' ' + m[1];
  }
  function ago(iso) {
    var mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
    if (mins < 1) return 'AHORA';
    if (mins < 60) return 'HACE ' + mins + ' MIN';
    var hrs = Math.round(mins / 60);
    if (hrs < 48) return 'HACE ' + hrs + ' H';
    return 'HACE ' + Math.round(hrs / 24) + ' D';
  }
  function plural(n, one, many) {
    return n === 1 ? one : many;
  }

  // ---------- insignias (imagen de assets.json o placeholder CSS) ----------
  function medal(kind, key, label) {
    var src = kind === 'rank' ? assets.ranks[label] : assets.categories[label];
    var attrs = { class: 'medal' + (src ? ' has-img' : ''), 'aria-hidden': 'true' };
    if (kind === 'rank') attrs['data-rank'] = key || 'none';
    else attrs['data-cat'] = label;
    var el = h('span', attrs);
    if (src) {
      el.appendChild(h('img', { src: src, alt: '', loading: 'lazy', decoding: 'async' }));
    } else {
      var glyph = kind === 'rank' ? (rankByKey(key) || {}).glyph || '·' : CAT_GLYPH[label] || '★';
      el.appendChild(h('span', { text: glyph }));
    }
    return el;
  }

  function progressRing(client) {
    var R = 29;
    var C = 2 * Math.PI * R;
    var p = client.next ? client.next.progress : client.rank ? 1 : 0;
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 64 64');
    svg.setAttribute('aria-hidden', 'true');
    [['track', 0], ['bar', 1]].forEach(function (d) {
      var c = document.createElementNS(ns, 'circle');
      c.setAttribute('cx', '32');
      c.setAttribute('cy', '32');
      c.setAttribute('r', String(R));
      c.setAttribute('fill', 'none');
      c.setAttribute('stroke-width', '2.5');
      c.setAttribute('class', d[0]);
      if (d[1]) {
        c.setAttribute('stroke-dasharray', String(C));
        c.setAttribute('stroke-dashoffset', String(C));
        c.dataset.target = String(C * (1 - p));
      }
      svg.appendChild(c);
    });
    var wrap = h('span', { class: 'ring' });
    wrap.appendChild(svg);
    wrap.appendChild(medal('rank', client.rank && client.rank.key, client.rank && client.rank.name));
    return wrap;
  }

  // ---------- tarjeta de cliente ----------
  function card(client, i) {
    var rankKey = client.rank ? client.rank.key : 'none';
    var id = 'd-' + client.id.replace(/[^a-z0-9]/gi, '');

    var passed = client.passed.length
      ? h(
          'span',
          { class: 'passed', role: 'img', 'aria-label': 'También superó: ' + client.passed.map(function (r) { return r.name; }).join(', ') },
          client.passed.map(function (r) {
            var m = medal('rank', r.key, r.name);
            m.setAttribute('title', r.name);
            return m;
          }),
        )
      : null;

    var btn = h(
      'button',
      { class: 'card__btn', type: 'button', 'aria-expanded': 'false', 'aria-controls': id },
      [
        h('span', { class: 'pos', text: '#' + pad(client.position) }),
        progressRing(client),
        h('span', { class: 'who' }, [
          h('p', { class: 'who__name', text: client.name }),
          h('span', { class: 'who__rank', text: client.rank ? client.rank.name : 'En camino' }),
          passed,
        ]),
        h('span', { class: 'score' }, [
          h('span', { class: 'score__n', text: String(client.total) }),
          h('span', { class: 'score__l', text: plural(client.total, 'MEDALLA', 'MEDALLAS') }),
        ]),
      ],
    );

    var nextLine;
    if (client.next) {
      var nr = rankByKey(client.next.key);
      nextLine = h('span', null, [
        h('strong', { text: String(client.next.remaining) }),
        ' ' + plural(client.next.remaining, 'medalla más', 'medallas más') + ' para ',
        h('span', { class: 'to', 'data-rank': nr ? nr.key : null, style: 'color:var(--accent)', text: client.next.name }),
      ]);
    } else {
      nextLine = h('span', { class: 'to', text: 'Rango máximo alcanzado' });
    }
    var chev = h('span', { class: 'chev', 'aria-hidden': 'true' });
    chev.innerHTML = '<svg width="10" height="10" viewBox="0 0 10 10"><path d="M1.5 3.5 5 7l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    var next = h('div', { class: 'next' + (client.next ? '' : ' max') }, [nextLine, chev]);

    // Detalle: logros + medallas de fidelidad (no son filas en Notion).
    var items = client.achievements.map(function (a, j) {
      var cat = a.category || 'Retos';
      return h('li', { class: 'ach', 'data-cat': cat, style: '--j:' + j }, [
        medal('cat', null, cat),
        h('div', null, [
          h('p', { class: 'ach__title', text: a.title }),
          h('div', { class: 'ach__meta' }, [
            a.category ? h('span', { class: 'ach__cat', text: a.category }) : null,
            a.date ? h('time', { class: 'ach__date', datetime: a.date, text: fmtDate(a.date) }) : null,
          ]),
        ]),
      ]);
    });
    if (client.loyalty > 0) {
      items.push(
        h('li', { class: 'ach', 'data-cat': 'Fidelidad', style: '--j:' + items.length }, [
          medal('cat', null, 'Fidelidad'),
          h('div', null, [
            h('p', { class: 'ach__title', text: 'Fidelidad al Club 1%' }),
            h('div', { class: 'ach__meta' }, [
              h('span', { class: 'ach__cat', text: '× ' + client.loyalty + ' ' + plural(client.loyalty, 'medalla', 'medallas') }),
            ]),
          ]),
        ]),
      );
    }
    var detail = h('div', { class: 'detail', id: id, role: 'region', 'aria-label': 'Logros de ' + client.name }, [
      h('div', { class: 'detail__inner' }, [
        items.length ? h('ul', { class: 'detail__list' }, items) : h('p', { class: 'detail__empty', text: 'Sin logros registrados todavía.' }),
      ]),
    ]);

    var li = h('li', { class: 'card' + (client.position <= 3 ? ' is-top' : ''), 'data-rank': rankKey, style: '--i:' + Math.min(i, 12) }, [
      btn,
      next,
      detail,
    ]);

    li.addEventListener('animationend', function (e) {
      if (e.animationName === 'rise') li.classList.add('in');
      if (e.animationName === 'tap') li.classList.remove('tap');
    });
    function toggle() {
      var open = li.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', String(open));
      li.classList.remove('tap');
      void li.offsetWidth; // reinicia la animación
      li.classList.add('tap');
    }
    btn.addEventListener('click', toggle);
    next.addEventListener('click', toggle);
    return li;
  }

  // ---------- secciones ----------
  function renderHero(data) {
    var top = data && data.stats.topRank;
    var hero = document.getElementById('hero');
    var key = top ? top.key : 'fundador';
    var accent = { atleta: '#D9661D', elite: '#E39A4A', leyenda: '#BA9447', fundador: '#E7C873' }[key];
    hero.style.setProperty('--accent', accent);
    hero.setAttribute('data-rank', key);
    var slot = document.getElementById('hero-medal');
    slot.innerHTML = '';
    if (assets.hero && assets.hero.video) {
      // Vídeo del trofeo integrado: sin controles, en bucle y silenciado (obligatorio para
      // que el móvil lo reproduzca solo). Si no puede reproducirse, queda el póster.
      hero.classList.add('has-video');
      var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      var v = h('video', {
        class: 'hero__video',
        poster: assets.hero.poster || null,
        playsinline: '',
        'webkit-playsinline': '',
        loop: '',
        muted: '',
        preload: still ? 'none' : 'auto',
        'aria-hidden': 'true',
        disablepictureinpicture: '',
      });
      v.muted = true;
      v.defaultMuted = true;
      if (assets.hero.videoWebm) v.appendChild(h('source', { src: assets.hero.videoWebm, type: 'video/webm' }));
      v.appendChild(h('source', { src: assets.hero.video, type: 'video/mp4' }));
      slot.appendChild(v);
      if (!still) {
        v.autoplay = true;
        var p = v.play();
        if (p && p.catch) p.catch(function () {});
      }
    } else {
      slot.appendChild(medal('rank', key, top ? top.name : 'Fundador 1%'));
    }
    if (assets.hero && assets.hero.image) {
      hero.style.setProperty('--hero-image', 'url("' + String(assets.hero.image).replace(/"/g, '%22') + '")');
    }
    if (data) {
      document.getElementById('stat-athletes').textContent = String(data.stats.athletes);
      document.getElementById('stat-medals').textContent = String(data.stats.medals);
      document.getElementById('stat-top').textContent = top ? top.name.toUpperCase() : '—';
    }
  }

  function renderLadder(data) {
    var counts = {};
    ((data && data.clients) || []).forEach(function (c) {
      if (c.rank) counts[c.rank.key] = (counts[c.rank.key] || 0) + 1;
    });
    var ol = document.getElementById('ladder');
    ol.innerHTML = '';
    RANKS.forEach(function (r) {
      var n = counts[r.key] || 0;
      ol.appendChild(
        h('li', { class: 'ladder__item', 'data-rank': r.key }, [
          medal('rank', r.key, r.name),
          h('span', { class: 'ladder__name', text: r.name }),
          h('span', { class: 'ladder__req mono', text: r.req + ' · ' + n + ' ' + plural(n, 'atleta', 'atletas') }),
        ]),
      );
    });
  }

  // Miembros sin medallas: aparecen igualmente, con un mensaje para ir a por la primera.
  var ASPIRANT_MSGS = [
    'Tu primera medalla te espera',
    'El 1% empieza con un logro',
    'Primer logro = Atleta 1%',
    'Tu nombre, a un logro del ranking',
    'Lo difícil es empezar. Ya estás dentro',
    'La constancia también se premia',
  ];
  function renderAspirants(list) {
    var section = document.getElementById('aspirants');
    var ul = document.getElementById('aspirants-list');
    ul.innerHTML = '';
    if (!list.length) {
      section.hidden = true;
      return;
    }
    section.hidden = false;
    document.getElementById('aspirants-count').textContent = list.length + ' ' + plural(list.length, 'ASPIRANTE', 'ASPIRANTES');
    var goal = RANKS[0];
    list.forEach(function (c, i) {
      var target = medal('rank', goal.key, goal.name);
      target.classList.add('medal--goal');
      ul.appendChild(
        h('li', { class: 'aspirant', 'data-rank': goal.key, style: '--i:' + Math.min(i, 16) }, [
          target,
          h('div', { class: 'aspirant__txt' }, [
            h('p', { class: 'aspirant__name', text: c.name }),
            h('p', { class: 'aspirant__msg', text: ASPIRANT_MSGS[i % ASPIRANT_MSGS.length] }),
          ]),
        ]),
      );
    });
  }

  function renderRanking(data) {
    var ol = document.getElementById('ranking');
    ol.innerHTML = '';
    var status = document.getElementById('sync-status');
    if (!data) {
      status.textContent = 'SINCRONIZANDO…';
      ol.appendChild(
        h('li', { class: 'empty' }, [
          h('span', { class: 'mono', text: 'SYNC EN CURSO' }),
          'Cargando el Hall of Fame desde el sistema. Vuelve a cargar en unos segundos.',
        ]),
      );
      return;
    }
    status.textContent = 'SYNC ' + ago(data.updatedAt);
    var ranked = data.clients.filter(function (c) {
      return c.total > 0;
    });
    renderAspirants(
      data.clients.filter(function (c) {
        return c.total === 0;
      }),
    );
    if (!ranked.length) {
      ol.appendChild(h('li', { class: 'empty' }, [h('span', { class: 'mono', text: 'SIN DATOS' }), 'Todavía no hay medallas en el Hall of Fame.']));
      return;
    }
    ranked.forEach(function (c, i) {
      ol.appendChild(card(c, i));
    });

    // Anillos: se animan al entrar en pantalla.
    var bars = ol.querySelectorAll('.ring .bar');
    function fill(bar) {
      bar.setAttribute('stroke-dashoffset', bar.dataset.target);
    }
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (e) {
            if (e.isIntersecting) {
              setTimeout(fill, 250, e.target);
              io.unobserve(e.target);
            }
          });
        },
        { threshold: 0.4 },
      );
      bars.forEach(function (b) {
        io.observe(b);
      });
    } else {
      bars.forEach(fill);
    }
  }

  function render(data) {
    renderHero(data);
    renderLadder(data);
    renderRanking(data);
  }

  // ---------- arranque ----------
  function merge(cfg) {
    cfg = cfg || {};
    assets = { hero: cfg.hero || {}, ranks: cfg.ranks || {}, categories: cfg.categories || {} };
  }

  var injected = window.__HOF__;
  if (injected) {
    merge(injected.assets);
    render(injected.data);
    if (!injected.data) setTimeout(function () { location.reload(); }, 15000);
  } else {
    // Sin inyección (p. ej. HTML abierto directamente): se piden los datos.
    Promise.all([
      fetch('/config/assets.json').then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; }),
      fetch('/api/hall-of-fame').then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
    ]).then(function (res) {
      merge(res[0]);
      render(res[1]);
    });
  }
})();
