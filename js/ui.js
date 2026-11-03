// Duelo de Runas: pantallas, guardado, cofres y marcador de la partida.
const SAVE_KEY = 'duelo-runas-v1';
const $ = (s) => document.querySelector(s);
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

function nuevoSave() {
  const cartas = {};
  CARTAS_INICIALES.forEach((id) => { cartas[id] = { lv: 1, n: 0 }; });
  return { v: 1, copas: 0, maxCopas: 0, oro: 100, cartas, mazo: MAZO_INICIAL.slice(), heroe: 'ignia', cofreDia: '', sonido: true,
    record: 0, jugadas: 0, ganadas: 0, racha: 0, visto: '' };
}
function cargar() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (s && s.v === 1) return Object.assign(nuevoSave(), s);
  } catch (_) {}
  return nuevoSave();
}
function guardar() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (_) {} }
let S = cargar();
sonidoOn = S.sonido;

function arenaIdx(copas) {
  copas = copas == null ? S.copas : copas;
  let i = 0;
  ARENAS.forEach((a, k) => { if (copas >= a.copas) i = k; });
  return i;
}
function hoy() { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
function lvMapa() { const o = {}; for (const id in S.cartas) o[id] = S.cartas[id].lv; return o; }
function heroeLibre(id) { return S.maxCopas >= HEROES[id].copas; }

// ---------- Modal ----------
function modal(html, cerrable) {
  const m = $('#modal');
  m.innerHTML = `<div class="caja">${html}</div>`;
  m.hidden = false;
  m.onclick = cerrable ? (e) => { if (e.target === m) cerrarModal(); } : null;
  return m;
}
function cerrarModal() { $('#modal').hidden = true; $('#modal').innerHTML = ''; }

function heroeAvatar(id, size) {
  const H = HEROES[id];
  return `<span class="avatar" style="--c:${H.color};width:${size}px;height:${size}px"><img src="assets/commanders/${H.img}.webp" alt="${H.nombre}"></span>`;
}
const ICO_ORO = '<img class="ico" src="assets/icons/moneda.webp" alt="oro">';
const ICO_COPA = '<img class="ico" src="assets/icons/corona.webp" alt="copas">';

// ---------- Inicio ----------
function pantallaInicio() {
  $('#juego').hidden = true;
  const menu = $('#menu');
  menu.hidden = false;
  const ai = arenaIdx(), A = ARENAS[ai], sig = ARENAS[ai + 1];
  const prog = sig ? (S.copas - A.copas) / (sig.copas - A.copas) : 1;
  const cofreLibre = S.cofreDia !== hoy();
  menu.innerHTML = `
    <header class="top">
      <h1 class="logo">Duelo<br><span>de Runas</span></h1>
      <div class="recursos"><span>${ICO_COPA} ${S.copas}</span><span>${ICO_ORO} ${S.oro}</span></div>
    </header>
    <section class="arena" style="--c:${A.color}">
      <small>Arena ${ai + 1}</small>
      <b>${A.nombre}</b>
      <div class="barra"><i style="width:${Math.round(prog * 100)}%"></i></div>
      <small>${sig ? `${S.copas} de ${sig.copas} para ${sig.nombre}` : 'Arena máxima'}</small>
    </section>
    <section class="mazo-mini" id="m-mazo">
      ${heroeAvatar(S.heroe, 46)}
      ${S.mazo.map((t) => `<img src="${iconoURL(t)}" alt="${RUNAS[t].nombre}">`).join('')}
    </section>
    <button class="btn grande" id="m-duelo">Duelo</button>
    <div class="dos">
      <button class="btn" id="m-super">Supervivencia<small>Récord ronda ${S.record}</small></button>
      <button class="btn ${cofreLibre ? 'oro' : ''}" id="m-cofre" ${cofreLibre ? '' : 'disabled'}>${cofreLibre ? 'Cofre gratis' : 'Cofre mañana'}<small>${S.ganadas} victorias</small></button>
    </div>
    <nav class="nav">
      <button id="m-col">Mazo</button>
      <button id="m-guia">Guía</button>
      <button id="m-notas">Novedades</button>
      <button id="m-son">${S.sonido ? 'Sonido sí' : 'Sonido no'}</button>
    </nav>
    <p class="pie">v${APP_VERSION} · gratis, sin anuncios ni compras</p>`;
  $('#m-duelo').onclick = () => { sonar('boton'); buscarRival(); };
  $('#m-super').onclick = () => { sonar('boton'); empezarSuper(); };
  $('#m-cofre').onclick = () => { if (S.cofreDia === hoy()) return; S.cofreDia = hoy(); abrirCofre('madera', pantallaInicio); };
  $('#m-col').onclick = $('#m-mazo').onclick = () => { sonar('boton'); pantallaMazo(); };
  $('#m-guia').onclick = guia;
  $('#m-notas').onclick = novedades;
  $('#m-son').onclick = () => { S.sonido = sonidoOn = !S.sonido; guardar(); pantallaInicio(); };
  if (S.visto !== APP_VERSION) { S.visto = APP_VERSION; guardar(); if (S.jugadas === 0) guia(); }
}

function guia() {
  modal(`<h2>Cómo se juega</h2>
    <ul class="guia">
      <li><b>Invocar</b> pone una tropa al azar de tu mazo en una casilla libre. Cada invocación cuesta 10 de maná más que la anterior.</li>
      <li><b>Fusionar</b>: arrastra una tropa sobre otra igual del mismo rango. Sale una tropa al azar de tu mazo con un rango más. Máximo 7.</li>
      <li>Arrastrar a una casilla vacía o sobre otra tropa las cambia de sitio. También puedes tocar una y luego otra.</li>
      <li><b>Cartas de abajo</b>: mejoran esa tropa para toda la partida, hasta nivel 5.</li>
      <li>Los monstruos dan maná al caer. Cada 40 segundos llega un <b>jefe</b> a los dos tableros.</li>
      <li>Si matas un <b>Emisario</b> morado, le llega un Enviado a tu rival. Y al revés.</li>
      <li>Cada monstruo que cruza resta a tu <b>muralla</b>. Gana quien aguante más.</li>
      <li>El <b>héroe</b> se carga solo y al gastar maná. Tócalo cuando el anillo esté lleno.</li>
      <li>Ganar da copas, oro y un cofre. Con copias y oro subes el nivel de tus cartas para siempre.</li>
      <li>Teclado: espacio invoca, 1 a 5 mejoran, H héroe, P pausa.</li>
    </ul>
    <button class="btn" onclick="cerrarModal()">Entendido</button>`, true);
}
function novedades() {
  modal(`<h2>Novedades</h2>${APP_NOTES.map(([v, l]) => `<h3>v${v}</h3><ul>${l.map((x) => `<li>${x}</li>`).join('')}</ul>`).join('')}
    <button class="btn" onclick="cerrarModal()">Cerrar</button>`, true);
}

// ---------- Mazo y colección ----------
function pantallaMazo() {
  const menu = $('#menu');
  const ai = arenaIdx();
  const orden = RUNA_IDS.slice().sort((a, b) => {
    const ra = Object.keys(RAREZAS).indexOf(RUNAS[a].rareza), rb = Object.keys(RAREZAS).indexOf(RUNAS[b].rareza);
    return (!!S.cartas[b] - !!S.cartas[a]) || ra - rb;
  });
  menu.innerHTML = `
    <header class="top"><button class="volver" id="v-volver">Volver</button><div class="recursos"><span>${ICO_COPA} ${S.copas}</span><span>${ICO_ORO} ${S.oro}</span></div></header>
    <h2 class="titulo">Tu mazo</h2>
    <section class="mazo-slots">${S.mazo.map((t) => `<button class="carta" data-id="${t}">${cartaHTML(t)}</button>`).join('')}</section>
    <h2 class="titulo">Héroe</h2>
    <section class="heroes">${HEROE_IDS.map((id) => {
      const H = HEROES[id], libre = heroeLibre(id);
      return `<button class="heroe ${S.heroe === id ? 'activo' : ''}" data-h="${id}" ${libre ? '' : 'disabled'}>${heroeAvatar(id, 40)}<b>${H.nombre}</b><small>${libre ? H.hab : ICO_COPA + ' ' + H.copas}</small></button>`;
    }).join('')}</section>
    <h2 class="titulo">Colección</h2>
    <section class="coleccion">${orden.map((t) => S.cartas[t]
      ? `<button class="carta" data-id="${t}">${cartaHTML(t)}</button>`
      : `<button class="carta bloqueada" data-id="${t}"><img src="${iconoURL(t)}" alt=""><b>${RUNAS[t].nombre}</b><small>${RUNAS[t].arena > ai ? 'Arena ' + (RUNAS[t].arena + 1) : 'En cofres'}</small></button>`).join('')}</section>`;
  $('#v-volver').onclick = pantallaInicio;
  menu.querySelectorAll('.carta').forEach((el) => { el.onclick = () => detalleCarta(el.dataset.id); });
  menu.querySelectorAll('.heroe').forEach((el) => {
    el.onclick = () => {
      const id = el.dataset.h;
      modal(`${heroeAvatar(id, 72)}<h2>${HEROES[id].nombre}</h2><p class="hab">${HEROES[id].hab}</p><p>${HEROES[id].desc}</p>
        <div class="fila-btn"><button class="btn" id="h-usar">Elegir</button><button class="btn gris" onclick="cerrarModal()">Cerrar</button></div>`, true);
      $('#h-usar').onclick = () => { S.heroe = id; guardar(); cerrarModal(); pantallaMazo(); };
    };
  });
}

function cartaHTML(t) {
  const c = S.cartas[t], i = c.lv - 1, max = c.lv >= NIVEL_MAX;
  const need = max ? 1 : NIVEL_COPIAS[i], k = max ? 1 : Math.min(1, c.n / need);
  const lista = !max && c.n >= need;
  return `<img src="${iconoURL(t)}" alt=""><b style="color:${RAREZAS[RUNAS[t].rareza].color}">${RUNAS[t].nombre}</b><small class="nv">Nv ${c.lv}</small>
    <span class="copias ${lista ? 'lista' : ''}"><i style="width:${k * 100}%"></i><em>${max ? 'Máx' : c.n + '/' + need}</em></span>`;
}

function detalleCarta(t) {
  const R = RUNAS[t], c = S.cartas[t], Rz = RAREZAS[R.rareza];
  if (!c) {
    modal(`<img class="grande" src="${iconoURL(t)}" alt=""><h2>${R.nombre}</h2><p class="rareza" style="color:${Rz.color}">${Rz.nombre}</p><p>${R.desc}</p>
      <p class="nota">Aún no la tienes. Sale en cofres desde la arena ${R.arena + 1}.</p><button class="btn gris" onclick="cerrarModal()">Cerrar</button>`, true);
    return;
  }
  const max = c.lv >= NIVEL_MAX, need = max ? 0 : NIVEL_COPIAS[c.lv - 1], oro = max ? 0 : NIVEL_ORO[c.lv - 1];
  const puede = !max && c.n >= need && S.oro >= oro;
  const enMazo = S.mazo.includes(t);
  const base = R.dmg ? `<p class="stats">Daño base ${Math.round(R.dmg * (1 + 0.1 * (c.lv - 1)))} · cada ${R.vel.toString().replace('.', ',')} s</p>` : '';
  modal(`<img class="grande" src="${iconoURL(t)}" alt=""><h2>${R.nombre}</h2><p class="rareza" style="color:${Rz.color}">${Rz.nombre} · Nivel ${c.lv}</p>
    <p>${R.desc}</p>${base}
    <p class="nota">${max ? 'Nivel máximo.' : `Siguiente nivel: ${c.n}/${need} copias y ${oro} ${ICO_ORO}. Cada nivel suma un 10 % de daño.`}</p>
    <div class="fila-btn">
      ${max ? '' : `<button class="btn ${puede ? 'oro' : ''}" id="c-subir" ${puede ? '' : 'disabled'}>Subir ${oro} ${ICO_ORO}</button>`}
      ${enMazo ? '' : '<button class="btn" id="c-mazo">Al mazo</button>'}
      <button class="btn gris" onclick="cerrarModal()">Cerrar</button>
    </div>
    <div id="c-slots"></div>`, true);
  const sb = $('#c-subir');
  if (sb) sb.onclick = () => { if (!puede) return; S.oro -= oro; c.n -= need; c.lv++; guardar(); sonar('mejora'); detalleCarta(t); pantallaMazo(); };
  const mb = $('#c-mazo');
  if (mb) mb.onclick = () => {
    $('#c-slots').innerHTML = `<p class="nota">¿Por cuál la cambias?</p><div class="slots">${S.mazo.map((x, i) => `<button data-i="${i}"><img src="${iconoURL(x)}" alt="${RUNAS[x].nombre}"></button>`).join('')}</div>`;
    $('#c-slots').querySelectorAll('button').forEach((b) => {
      b.onclick = () => { S.mazo[+b.dataset.i] = t; guardar(); cerrarModal(); pantallaMazo(); };
    });
  };
}

// ---------- Cofres ----------
function generarCofre(tipo) {
  const C = COFRES[tipo], ai = arenaIdx();
  const pool = RUNA_IDS.filter((id) => RUNAS[id].arena <= ai);
  const peso = { comun: 15, rara: 7, epica: 2.5, legendaria: 0.7 };
  const total = pool.reduce((n, id) => n + peso[RUNAS[id].rareza], 0);
  const n = Math.round(C.cartas * (1 + 0.25 * ai));
  const cartas = {};
  for (let k = 0; k < n; k++) {
    let x = Math.random() * total, elegido = pool[0];
    for (const id of pool) { x -= peso[RUNAS[id].rareza]; if (x <= 0) { elegido = id; break; } }
    cartas[elegido] = (cartas[elegido] || 0) + 1;
  }
  return { tipo, oro: Math.round(rnd(C.oro[0], C.oro[1]) * (1 + 0.3 * ai)), cartas };
}
function abrirCofre(tipo, despues) {
  const r = generarCofre(tipo), C = COFRES[tipo];
  S.oro += r.oro;
  const nuevas = [];
  for (const id in r.cartas) {
    if (!S.cartas[id]) { S.cartas[id] = { lv: 1, n: r.cartas[id] - 1 }; nuevas.push(id); } else S.cartas[id].n += r.cartas[id];
  }
  guardar();
  sonar('cofre');
  const lista = Object.keys(r.cartas).sort((a, b) => r.cartas[b] - r.cartas[a]);
  modal(`<div class="cofre" style="--c:${C.color}"></div><h2>${C.nombre}</h2>
    <p class="oro-gana">+${r.oro} ${ICO_ORO}</p>
    <div class="premios">${lista.map((id) => `<div class="premio">${nuevas.includes(id) ? '<em>Nueva</em>' : ''}<img src="${iconoURL(id)}" alt=""><b>×${r.cartas[id]}</b><small>${RUNAS[id].nombre}</small></div>`).join('')}</div>
    <button class="btn" id="cf-ok">Seguir</button>`);
  $('#cf-ok').onclick = () => { cerrarModal(); despues && despues(); };
}

// ---------- Partidas ----------
function mezclar(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }

function crearRival() {
  const ai = arenaIdx();
  const pool = RUNA_IDS.filter((id) => RUNAS[id].arena <= ai);
  let deck;
  do { deck = mezclar(pool).slice(0, 5); } while (deck.filter((t) => !RUNAS[t].vel).length > 1);
  const lvs = S.mazo.map((t) => S.cartas[t].lv), media = lvs.reduce((a, b) => a + b, 0) / lvs.length;
  const lv = {};
  deck.forEach((t) => { lv[t] = Math.max(1, Math.min(NIVEL_MAX, Math.round(media + (ai >= 2 ? rnd(-1, 1) : rnd(-1, 0))))); });
  const heroes = HEROE_IDS.filter((id) => HEROES[id].copas <= S.copas + 200);
  const facil = S.copas < 100;
  return {
    side: 'ai', nombre: NOMBRES_BOT[(Math.random() * NOMBRES_BOT.length) | 0], copas: Math.max(0, S.copas + rnd(-40, 40)),
    deck, lv, hero: heroes[(Math.random() * heroes.length) | 0],
    ai: { t: 1.5, ritmo: facil ? 1.15 : Math.max(0.35, 0.95 - 0.1 * ai), torpe: facil ? 0.25 : Math.max(0.03, 0.18 - 0.03 * ai) }
  };
}

function buscarRival() {
  const rival = crearRival();
  modal(`<p class="nota">Buscando rival…</p><div class="vs">
      <div>${heroeAvatar(S.heroe, 54)}<b>Tú</b><small>${ICO_COPA} ${S.copas}</small><div class="mini">${S.mazo.map((t) => `<img src="${iconoURL(t)}" alt="">`).join('')}</div></div>
      <span>VS</span>
      <div>${heroeAvatar(rival.hero, 54)}<b>${rival.nombre}</b><small>${ICO_COPA} ${rival.copas}</small><div class="mini">${rival.deck.map((t) => `<img src="${iconoURL(t)}" alt="">`).join('')}</div></div>
    </div>`);
  setTimeout(() => {
    cerrarModal();
    empezarPartida({ modo: 'duelo', tablero: ARENAS[arenaIdx()].tablero, yo: { side: 'me', nombre: 'Tú', copas: S.copas, deck: S.mazo, lv: lvMapa(), hero: S.heroe }, rival, onFin: finDuelo });
    abrirJuego();
  }, 1800);
}

function empezarSuper() {
  empezarPartida({ modo: 'super', tablero: ARENAS[arenaIdx()].tablero, yo: { side: 'me', nombre: 'Tú', deck: S.mazo, lv: lvMapa(), hero: S.heroe }, rival: null, onFin: finSuper });
  M.record = S.record;
  abrirJuego();
}

function finDuelo(res) {
  const antes = arenaIdx(), heroesAntes = HEROE_IDS.filter(heroeLibre);
  let dc = 0, oro = 0, cofre = null;
  S.jugadas++;
  if (res === 'victoria') {
    dc = rnd(27, 32); oro = 20 + 5 * antes; S.ganadas++; S.racha++;
    const x = Math.random();
    cofre = x < 0.03 ? 'rey' : x < 0.18 ? 'oro' : 'plata';
  } else if (res === 'derrota') { dc = -Math.min(S.copas, rnd(18, 22)); oro = 5; S.racha = 0; }
  S.copas += dc; S.oro += oro;
  S.maxCopas = Math.max(S.maxCopas, S.copas);
  guardar();
  const despues = arenaIdx(), heroesNuevos = HEROE_IDS.filter((id) => heroeLibre(id) && !heroesAntes.includes(id));
  const titulo = { victoria: '¡Victoria!', derrota: 'Derrota', empate: 'Empate' }[res];
  modal(`<h2 class="res ${res}">${titulo}</h2>
    <p>Ronda ${M.ronda} · muralla ${M.yo.muro} contra ${M.rival.muro}</p>
    <p class="cambio">${dc >= 0 ? '+' : ''}${dc} ${ICO_COPA} · +${oro} ${ICO_ORO}</p>
    ${despues > antes ? `<p class="nota">Nueva arena: <b>${ARENAS[despues].nombre}</b>. Salen cartas nuevas en los cofres.</p>` : ''}
    ${heroesNuevos.map((id) => `<p class="nota">Héroe desbloqueado: <b>${HEROES[id].nombre}</b></p>`).join('')}
    <div class="stats-fin"><span>Invocadas ${M.yo.invocadas}</span><span>Fusiones ${M.yo.fusiones}</span><span>Caídos ${M.yo.kills}</span></div>
    <button class="btn" id="f-ok">${cofre ? 'Abrir cofre' : 'Seguir'}</button>`);
  $('#f-ok').onclick = () => { cerrarModal(); salirJuego(); if (cofre) abrirCofre(cofre, pantallaInicio); };
}

function finSuper() {
  const ronda = M.ronda, nuevo = ronda > S.record;
  const oro = 8 * ronda;
  S.oro += oro; S.jugadas++;
  if (nuevo) S.record = ronda;
  guardar();
  modal(`<h2 class="res fin">Fin</h2><p>Has llegado a la ronda ${ronda}${nuevo ? ', ¡nuevo récord!' : '.'}</p>
    <p class="cambio">+${oro} ${ICO_ORO}</p>
    <div class="stats-fin"><span>Invocadas ${M.yo.invocadas}</span><span>Fusiones ${M.yo.fusiones}</span><span>Caídos ${M.yo.kills}</span></div>
    <button class="btn ${ronda >= 5 ? 'oro' : ''}" id="f-ok">${ronda >= 5 ? 'Abrir cofre' : 'Seguir'}</button>`);
  $('#f-ok').onclick = () => {
    cerrarModal(); salirJuego();
    if (ronda >= 5) abrirCofre(ronda >= 9 ? 'oro' : 'plata', pantallaInicio); else pantallaInicio();
  };
}

// ---------- Juego ----------
let ctx = null, cv = null, ultimo = 0, enJuego = false;
const hudCache = {};
function poner(sel, prop, val) {
  const k = sel + prop;
  if (hudCache[k] === val) return;
  hudCache[k] = val;
  const el = $(sel);
  if (!el) return;
  if (prop === 'text') el.textContent = val;
  else if (prop === 'html') el.innerHTML = val;
  else if (prop === 'w') el.style.width = val;
  else if (prop === 'bg') el.style.background = val;
  else if (prop === 'dis') el.classList.toggle('no', val);
  else if (prop === 'hid') el.hidden = val;
}

function abrirJuego() {
  for (const k in hudCache) delete hudCache[k];
  $('#menu').hidden = true;
  $('#juego').hidden = false;
  const r = M.rival;
  poner('#g-rival', 'hid', !r);
  if (r) {
    poner('#r-nombre', 'text', r.nombre);
    poner('#r-copas', 'html', ICO_COPA + ' ' + r.copas);
    $('#r-heroe').innerHTML = heroeAvatar(r.hero.id, 30);
  }
  $('#b-heroe').innerHTML = `${heroeAvatar(M.yo.hero.id, 44)}<small>${HEROES[M.yo.hero.id].hab}</small>`;
  $('#g-mazo').innerHTML = M.yo.deck.map((t, i) => `<button class="m-carta" data-i="${i}"><img src="${iconoURL(t)}" alt="${RUNAS[t].nombre}"><b id="mc-n${i}"></b><small id="mc-c${i}"></small></button>`).join('');
  $('#g-mazo').querySelectorAll('.m-carta').forEach((b) => { b.onclick = () => { if (M && !M.over && !M.pausa) mejorar(M.yo, +b.dataset.i); }; });
  ajustarLienzo();
  enJuego = true;
  ultimo = performance.now();
  requestAnimationFrame(bucle);
}
function salirJuego() { enJuego = false; M = null; $('#juego').hidden = true; }

function ajustarLienzo() {
  const wrap = $('#g-lienzo');
  const s = Math.min(wrap.clientWidth / W, wrap.clientHeight / H);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.style.width = W * s + 'px';
  cv.style.height = H * s + 'px';
  cv.width = Math.round(W * s * dpr);
  cv.height = Math.round(H * s * dpr);
  ctx.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0);
}

function bucle(ts) {
  if (!enJuego || !M) return;
  const dt = Math.min(0.05, (ts - ultimo) / 1000);
  ultimo = ts;
  // pasos cortos para que nada atraviese a nadie
  paso(dt / 2); paso(dt / 2);
  dibujar(ctx);
  hud();
  requestAnimationFrame(bucle);
}

function hud() {
  const b = M.yo, r = M.rival;
  poner('#mana', 'text', Math.floor(b.mana));
  poner('#coste', 'text', b.cost);
  poner('#b-invocar', 'dis', b.mana < b.cost || !libres(b).length);
  poner('#y-muro', 'w', (b.muro / MURO_MAX * 100) + '%');
  poner('#y-muro-t', 'text', 'Muralla ' + b.muro);
  if (r) {
    poner('#r-muro', 'w', (r.muro / MURO_MAX * 100) + '%');
    poner('#r-muro-t', 'text', r.muro);
    poner('#r-carga', 'w', Math.floor(r.hero.carga) + '%');
  }
  const carga = Math.floor(b.hero.carga);
  poner('#b-heroe', 'bg', `conic-gradient(${HEROES[b.hero.id].color} ${carga}%, rgba(255,255,255,.08) 0)`);
  poner('#b-heroe', 'dis', carga < 100);
  b.deck.forEach((t, i) => {
    const lvl = b.up[i];
    poner('#mc-n' + i, 'text', 'Nv ' + lvl);
    poner('#mc-c' + i, 'text', lvl >= 5 ? 'Máx' : MEJORA_COSTE[lvl - 1]);
    poner(`.m-carta[data-i="${i}"]`, 'dis', lvl >= 5 || b.mana < MEJORA_COSTE[lvl - 1]);
  });
  let info = 'Arrastra una tropa sobre otra igual para fusionarlas';
  if (b.sel >= 0 && b.cells[b.sel]) {
    const u = b.cells[b.sel];
    info = `<b>${RUNAS[u.t].nombre}</b> · rango ${u.r} · ${infoRuna(b, u, b.sel)}`;
  } else if (b.invocadas > 3) info = '';
  poner('#g-info', 'html', info);
}

function pausar() {
  if (!M || M.over) return;
  M.pausa = true;
  const duelo = M.modo === 'duelo';
  modal(`<h2>Pausa</h2>
    <div class="col-btn">
      <button class="btn" id="p-seguir">Seguir</button>
      <button class="btn gris" id="p-son">${S.sonido ? 'Sonido sí' : 'Sonido no'}</button>
      <button class="btn rojo" id="p-salir">${duelo ? 'Rendirse' : 'Terminar'}</button>
    </div>`);
  $('#p-seguir').onclick = () => { cerrarModal(); M.pausa = false; ultimo = performance.now(); };
  $('#p-son').onclick = () => { S.sonido = sonidoOn = !S.sonido; guardar(); $('#p-son').textContent = S.sonido ? 'Sonido sí' : 'Sonido no'; };
  $('#p-salir').onclick = () => {
    cerrarModal();
    M.pausa = false; M.over = true;
    if (duelo) finDuelo('derrota'); else finSuper();
  };
}

window.addEventListener('DOMContentLoaded', () => {
  cv = $('#cv');
  ctx = cv.getContext('2d');
  engancharEntrada(cv);
  $('#b-invocar').onclick = () => { if (M && !M.over && !M.pausa) invocar(M.yo); };
  $('#b-heroe').onclick = () => { if (M && !M.pausa) usarHeroe(M.yo); };
  $('#b-pausa').onclick = pausar;
  window.addEventListener('resize', () => { if (enJuego) ajustarLienzo(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && enJuego && M && !M.pausa && !M.over) pausar(); });
  document.addEventListener('keydown', (e) => {
    if (!enJuego || !M || M.over) return;
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') { if (!M.pausa) pausar(); return; }
    if (M.pausa) return;
    if (e.key === ' ') { e.preventDefault(); invocar(M.yo); }
    else if (e.key >= '1' && e.key <= '5') mejorar(M.yo, +e.key - 1);
    else if (e.key === 'h' || e.key === 'H') usarHeroe(M.yo);
  });
  pantallaInicio();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
});
