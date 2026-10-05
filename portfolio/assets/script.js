(function () {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)');

  // Звёзды: один пиксель, всё поле — список box-shadow.
  function stars(id, n, blur, a0, a1) {
    var el = document.getElementById(id), s = [];
    if (!el) return;
    for (var i = 0; i < n; i++) {
      s.push((Math.random() * 100).toFixed(2) + 'vw ' + (Math.random() * 100).toFixed(2) + 'vh ' + blur + 'px 0 rgba(255,255,255,' + (a0 + Math.random() * (a1 - a0)).toFixed(2) + ')');
    }
    el.style.boxShadow = s.join(',');
  }
  stars('stA', 150, 0, .05, .30);
  stars('stB', 18, 1.2, .35, .70);

  // Кольцо: камера в центре цилиндра радиуса R, перспектива = R, поэтому каждая карточка смотрит в камеру.
  // Задняя половина отсекается по углу CULL.
  var ring = document.getElementById('ring');
  if (ring) {
    var shots = ring.dataset.shots.split(','), cards = [], N = 0, step = 0, R = 900, phase = -2, last = 0, running = true;
    var CULL = 42, SPEED = 2.2;

    function build() {
      var w = innerWidth, cw, ch;
      if (w <= 640) { R = 560; cw = 150; ch = 100; }
      else if (w <= 980) { R = 720; cw = 190; ch = 128; }
      else { R = 980; cw = 230; ch = 154; }
      // столько карточек, чтобы между ними оставался зазор ~22 % ширины
      N = Math.round(2 * Math.PI * R / (cw * 1.22));
      step = 360 / N;
      // крайние карточки ближе к камере и выше центральной — сверху нужен запас, иначе их срежет край
      var sh = Math.round(ch * 2.6), cy = Math.round(ch * 1.1);
      ring.parentNode.style.setProperty('--sh', sh + 'px');
      document.querySelector('.hero').style.setProperty('--sh', sh + 'px');
      ring.style.setProperty('--R', R + 'px');
      ring.style.setProperty('--cw', cw + 'px');
      ring.style.setProperty('--ch', ch + 'px');
      ring.style.setProperty('--cy', cy + 'px');
      ring.style.setProperty('--horizon', (cy + ch * 2) + 'px');
      if (cards.length !== N) {
        ring.innerHTML = '';
        cards = [];
        for (var i = 0; i < N; i++) {
          var c = document.createElement('div'), img = new Image();
          c.className = 'card';
          img.alt = '';
          img.decoding = 'async';
          img.onerror = function () { this.parentNode.classList.add('broken'); };
          img.src = 'assets/img/' + shots[i % shots.length] + '.webp';
          c.appendChild(img);
          ring.appendChild(c);
          cards.push(c);
        }
      }
      place();
    }

    function place() {
      for (var i = 0; i < N; i++) {
        var a = ((i * step + phase) % 360 + 540) % 360 - 180, el = cards[i];
        if (Math.abs(a) > CULL) { el.style.visibility = 'hidden'; continue; }
        var r = a * Math.PI / 180, c = Math.cos(r);
        el.style.visibility = 'visible';
        el.style.transform = 'translate3d(' + (R * Math.sin(r)).toFixed(2) + 'px,0,' + (R * (1 - c)).toFixed(2) + 'px) rotateY(' + (-a).toFixed(3) + 'deg)';
        el.style.filter = 'brightness(' + (0.7 + 0.3 * Math.pow(c, 6)).toFixed(3) + ')';
      }
    }

    function tick(t) {
      var dt = last ? Math.min((t - last) / 1000, .1) : 0;
      last = t;
      if (running && !reduce.matches) { phase -= SPEED * dt; place(); }
      requestAnimationFrame(tick);
    }

    // крутится только на экране; после фоновой вкладки не прыгает
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) { running = e[0].isIntersecting; last = 0; }).observe(ring.parentNode);
    }
    document.addEventListener('visibilitychange', function () { last = 0; });
    var rt;
    addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(build, 120); });
    build();
    requestAnimationFrame(tick);
  }

  // Меню на узких экранах: те же ссылки, панель под капсулой.
  var nav = document.getElementById('nav'), burger = nav && nav.querySelector('.burger');
  if (burger) {
    function setOpen(v) {
      nav.classList.toggle('open', v);
      burger.setAttribute('aria-expanded', v ? 'true' : 'false');
      burger.setAttribute('aria-label', v ? 'Закрыть меню' : 'Открыть меню');
    }
    burger.addEventListener('click', function (e) { e.stopPropagation(); setOpen(!nav.classList.contains('open')); });
    document.addEventListener('click', function (e) { if (!nav.contains(e.target)) setOpen(false); });
    nav.querySelectorAll('.navmenu a').forEach(function (a) { a.addEventListener('click', function () { setOpen(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && nav.classList.contains('open')) { setOpen(false); burger.focus(); } });
    addEventListener('resize', function () { if (innerWidth > 980) setOpen(false); });
  }

  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // Ленты: текст дважды по два раза, тогда сдвиг на -50 % зацикливается без шва.
  $$('.ribbon p').forEach(function (p) { var t = p.innerHTML; p.innerHTML = t + t + t + t; });

  // Счётчики: каждое число внутри текста растёт от нуля, формат (пробелы, запятая) сохраняется,
  // в конце возвращается исходный текст один в один.
  var NUM = /\d{1,3}(?:[  ]\d{3})+(?:,\d+)?|\d+(?:,\d+)?/g;
  function countUp(el) {
    if (el.dataset.counted) return;
    el.dataset.counted = 1;
    var nodes = [], w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), n;
    while ((n = w.nextNode())) if (/\d/.test(n.nodeValue)) nodes.push({ n: n, src: n.nodeValue });
    if (!nodes.length || reduce.matches) return;
    var t0 = performance.now(), dur = 1400;
    function fmt(m, k) {
      var sep = (m.match(/[  ]/) || [''])[0], dec = (m.split(',')[1] || '').length;
      var v = parseFloat(m.replace(/[  ]/g, '').replace(',', '.')) * k;
      var s = v.toFixed(dec).split('.'), i = s[0];
      if (sep) i = i.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
      return i + (dec ? ',' + s[1] : '');
    }
    (function frame(t) {
      var p = Math.min(1, (t - t0) / dur), k = 1 - Math.pow(1 - p, 4);
      nodes.forEach(function (o) { o.n.nodeValue = p < 1 ? o.src.replace(NUM, function (m) { return fmt(m, k); }) : o.src; });
      if (p < 1) requestAnimationFrame(frame);
    })(t0);
  }

  // Появление при прокрутке: элементы одного ряда идут лесенкой через --d.
  var rv = $$('main h2, .foot h2, .note, .sub, .group, .case, .m, .m__cap, .year__big, .year__list li, .auto li, .foot__links, .mock');
  rv.forEach(function (el) {
    if (el.classList.contains('mock')) return;
    el.classList.add('rv');
    var sib = el.parentNode.children, i = Array.prototype.indexOf.call(sib, el);
    if (el.matches('.year__list li, .auto li, .m')) el.style.setProperty('--d', (i % 4) * 0.09 + 's');
  });
  var counters = $$('.fact__n, .nums b, .year__n, .year__list b');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        $$('.fact__n, .nums b, .year__n, .year__list b', e.target).forEach(countUp);
        if (e.target.matches('.fact__n, .nums b, .year__n, .year__list b')) countUp(e.target);
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });
    rv.concat(counters).forEach(function (el) { io.observe(el); });
  } else {
    rv.forEach(function (el) { el.classList.add('in'); });
  }

  // Наклон за курсором и блик для скриншотов и креативов.
  var tilts = $$('.frame, .m picture, .m__pad');
  tilts.forEach(function (el) { el.classList.add('tilt'); });
  if (fine && !reduce.matches) {
    tilts.forEach(function (el) {
      var max = el.closest('.m') ? 5 : 4;
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        el.classList.add('moving');
        el.style.setProperty('--ry', ((x - .5) * max * 2).toFixed(2) + 'deg');
        el.style.setProperty('--rx', ((.5 - y) * max * 2).toFixed(2) + 'deg');
        el.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
        el.style.setProperty('--my', (y * 100).toFixed(1) + '%');
      });
      el.addEventListener('pointerleave', function () {
        el.classList.remove('moving');
        el.style.setProperty('--rx', '0deg');
        el.style.setProperty('--ry', '0deg');
      });
    });
    // тёмные кнопки слегка тянутся к курсору
    $$('.glow').forEach(function (b) {
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        b.style.setProperty('--gx', ((e.clientX - r.left - r.width / 2) * .12).toFixed(1) + 'px');
        b.style.setProperty('--gy', ((e.clientY - r.top - r.height / 2) * .2).toFixed(1) + 'px');
      });
      b.addEventListener('pointerleave', function () { b.style.setProperty('--gx', '0px'); b.style.setProperty('--gy', '0px'); });
    });
    // прожектор в тёмных разделах и свет в карточке найма
    $$('.dark, .year__big').forEach(function (s) {
      var big = s.classList.contains('year__big');
      s.addEventListener('pointermove', function (e) {
        var r = s.getBoundingClientRect();
        s.style.setProperty(big ? '--mx' : '--sx', (e.clientX - r.left) + 'px');
        s.style.setProperty(big ? '--my' : '--sy', (e.clientY - r.top) + 'px');
        if (!big) s.style.setProperty('--so', 1);
      });
      if (!big) s.addEventListener('pointerleave', function () { s.style.setProperty('--so', 0); });
    });
  }

  // Увеличение по клику: картинки кейсов и креативов (кроме той, что ведёт на лендинг).
  if (window.HTMLDialogElement) {
    var dlg = document.createElement('dialog');
    dlg.className = 'lb';
    dlg.innerHTML = '<button type="button" aria-label="Закрыть">×</button><img alt=""><p></p>';
    document.body.appendChild(dlg);
    var dImg = dlg.querySelector('img'), dCap = dlg.querySelector('p');
    dlg.querySelector('button').addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    $$('.frame img, .m img').forEach(function (img) {
      if (img.closest('a')) return;
      img.classList.add('zoomable');
      img.tabIndex = 0;
      function open() {
        dImg.src = img.currentSrc || img.src;
        dImg.alt = img.alt;
        var cap = img.closest('figure') && img.closest('figure').querySelector('figcaption');
        dCap.textContent = cap ? cap.textContent : img.alt;
        dlg.showModal();
      }
      img.addEventListener('click', open);
      img.addEventListener('keydown', function (e) { if (e.key === 'Enter') open(); });
    });
  }

  // Прокрутка: контурные слова едут, нить прогресса растёт, активный раздел подсвечен в меню.
  var words = $$('.bigword'), links = $$('.links a'), secs = links.map(function (a) { return document.querySelector(a.getAttribute('href')); });
  var ticking = false;
  var stack = $$('.cases .case, .cases .group'), stackOn = false;
  // Липкий верх карточки: высокая карточка прилипает, только когда её низ дошёл до низа экрана,
  // иначе следующая наехала бы на непрочитанный текст.
  function stackSetup() {
    stackOn = innerWidth > 980 && !reduce.matches;
    stack.forEach(function (el) {
      if (!stackOn) { el.style.removeProperty('--top'); el.style.removeProperty('--sc'); el.style.removeProperty('--br'); return; }
      el.style.setProperty('--top', Math.min(96, innerHeight - el.offsetHeight - 24) + 'px');
    });
  }
  stackSetup();
  addEventListener('resize', function () { stackSetup(); onScroll(); });
  addEventListener('load', function () { stackSetup(); onScroll(); });
  $$('.cases img').forEach(function (im) { im.addEventListener('load', stackSetup); });
  function onScroll() {
    ticking = false;
    var y = scrollY, vh = innerHeight, h = document.documentElement.scrollHeight - vh;
    if (nav) nav.style.setProperty('--prog', h > 0 ? (y / h).toFixed(4) : 0);
    if (!reduce.matches) words.forEach(function (w, i) {
      var r = w.parentNode.getBoundingClientRect(), p = (vh - r.top) / (vh + r.height);
      w.style.setProperty('--bx', ((p - .5) * (i % 2 ? 260 : -260)).toFixed(1) + 'px');
    });
    // стопка кейсов: та карточка, на которую наезжает следующая, отъезжает вглубь и темнеет
    if (stackOn) stack.forEach(function (el, i) {
      var nx = stack[i + 1];
      if (!nx || !el.classList.contains('case')) return;
      var h = el.offsetHeight, top = el.getBoundingClientRect().top, p = (top + h - nx.getBoundingClientRect().top) / h;
      p = Math.max(0, Math.min(1, p));
      el.style.setProperty('--sc', (1 - .06 * p).toFixed(4));
      el.style.setProperty('--br', (1 - .45 * p).toFixed(4));
    });
    var cur = -1;
    secs.forEach(function (s, i) { if (s && s.getBoundingClientRect().top < vh * .4) cur = i; });
    links.forEach(function (a, i) { a.classList.toggle('on', i === cur); });
  }
  addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();
})();
