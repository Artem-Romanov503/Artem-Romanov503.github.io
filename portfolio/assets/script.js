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
})();
