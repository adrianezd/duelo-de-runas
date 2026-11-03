// Duelo de Runas: motor de la partida, rival y dibujo en canvas.
const W = 360, H = 574, OX = 4;
const MID_TOP = 262, ME_Y = 318; // el rival se dibuja hacia arriba desde MID_TOP; tú, hacia abajo desde ME_Y
const RONDA_DUR = 40, MURO_MAX = 20, RANGO_MAX = 7, LARGO_BASE = 752;
let GX = 36, GY = 36, CW = 56, CH = 56, PATH = [], SEG = [], PATH_LEN = 0, GEO = null;

// Encaja el tablero de Reino: su cuadrícula ocupa 280 px de ancho y el camino sale de su `way`.
function ponerTablero(id) {
  const T = TABLEROS[id] || null;
  let pts;
  if (T) {
    // la escala sale de lo que quepa: la cuadrícula hasta 260 px y el camino (sin entrada ni salida) hasta 320
    const dentro = T.way.slice(1, -1), wx1 = Math.min(...dentro.map((p) => p[0])), wx2 = Math.max(...dentro.map((p) => p[0]));
    const s = Math.min(260 / (T.g[2] - T.g[0]), 320 / (wx2 - wx1));
    GX = 176 - ((wx1 + wx2) / 2 - T.g[0]) * s;
    CW = (T.g[2] - T.g[0]) * s / 5;
    const minY = Math.min(...T.way.map((p) => p[1]));
    GY = 16 - (minY - T.g[1]) * s;
    CH = (T.g[3] - T.g[1]) * s / 3;
    pts = T.way.map(([x, y]) => [Math.max(8, Math.min(344, GX + (x - T.g[0]) * s)), Math.max(8, Math.min(240, GY + (y - T.g[1]) * s))]);
    GEO = { id, T, s };
  } else {
    GX = 36; GY = 36; CW = 56; CH = 56;
    pts = [[18, 236], [18, 18], [334, 18], [334, 236]];
    GEO = null;
  }
  PATH = pts; SEG = []; PATH_LEN = 0;
  for (let i = 0; i < PATH.length - 1; i++) {
    const [x1, y1] = PATH[i], [x2, y2] = PATH[i + 1], l = Math.hypot(x2 - x1, y2 - y1);
    if (!l) continue;
    SEG.push({ x1, y1, x2, y2, l, s: PATH_LEN });
    PATH_LEN += l;
  }
}
ponerTablero(null);

function pathPos(s) {
  s = Math.max(0, Math.min(PATH_LEN, s));
  for (const g of SEG) if (s <= g.s + g.l) {
    const k = (s - g.s) / g.l;
    return { x: g.x1 + (g.x2 - g.x1) * k, y: g.y1 + (g.y2 - g.y1) * k, dx: g.x2 - g.x1 };
  }
  const p = PATH[PATH.length - 1];
  return { x: p[0], y: p[1], dx: 0 };
}
function scr(b, x, y) { return b.flip ? [OX + x, MID_TOP - y] : [OX + x, ME_Y + y]; }
function cellXY(i) { const c = i % 5, r = (i / 5) | 0; return { x: GX + c * CW + CW / 2, y: GY + r * CH + CH / 2 }; }

// Dibujos
const IMG = {};
function img(p) {
  let im = IMG[p];
  if (!im) { im = IMG[p] = new Image(); im.src = 'assets/' + p + '.webp'; }
  return im;
}
const listo = (im) => im && im.complete && im.naturalWidth > 0;
function precargar() {
  if (GEO) img('boards/' + GEO.id);
  for (const b of M.boards) {
    for (const t of b.deck) { const R = RUNAS[t]; img('units/board/' + R.img + '-idle'); img('units/board/' + R.img + '-attack'); if (R.tiro) img('fx/' + R.tiro); if (R.imp) img('fx/' + R.imp); }
    img('fx/' + HEROES[b.hero.id].fx);
  }
  for (const k in MONSTRUOS) img('enemies/' + MONSTRUOS[k].img);
  for (const k in JEFES) img('enemies/' + JEFES[k].img);
  ['muerte-puf', 'fusion', 'invocar', 'estado-aturdido', 'estado-helado', 'estado-veneno', 'marea'].forEach((f) => img('fx/' + f));
}
function mulberry32(a) {
  return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const azar = (arr) => arr[(Math.random() * arr.length) | 0];
const rankMul = (r) => Math.pow(1.75, r - 1);

let M = null;

// ---------- Creación ----------
function crearTablero(cfg) {
  return {
    side: cfg.side, flip: cfg.side === 'ai', nombre: cfg.nombre, copas: cfg.copas || 0,
    cells: new Array(15).fill(null), mana: 100, cost: 10, up: [1, 1, 1, 1, 1],
    deck: cfg.deck.slice(), lv: cfg.lv, hero: { id: cfg.hero, carga: 0 },
    muro: MURO_MAX, mons: [], shots: [], fx: [], jefeVivo: false, ai: cfg.ai || null,
    kills: 0, invocadas: 0, fusiones: 0, sel: -1, temblor: 0
  };
}

function empezarPartida(opts) {
  M = {
    modo: opts.modo, t: 0, ronda: 1, fase: 'olas', faseT: 0, spawnT: 2, rng: mulberry32(opts.seed || (Date.now() & 0xffffff)),
    jefe: null, boards: [], over: false, pausa: false, uid: 1, banner: { txt: 'Ronda 1', t: 1.8 }, onFin: opts.onFin, aviso: null
  };
  ponerTablero(opts.tablero);
  M.yo = crearTablero(opts.yo);
  M.boards.push(M.yo);
  if (opts.rival) { M.rival = crearTablero(opts.rival); M.boards.push(M.rival); }
  precargar();
}

function nuevaRuna(b, t, r) {
  const u = { id: M.uid++, t, r, cd: 0.3 + Math.random() * 0.5, age: 0, stun: 0, flash: 0.35, gen: 0, atk: 0, pop: 0.3, cara: 1 };
  return u;
}

function hpBase() { return 55 * Math.pow(1.42, M.ronda - 1) * (1 + 0.6 * Math.min(1, M.faseT / RONDA_DUR)); }

function crearMonstruo(b, k, mult) {
  const D = MONSTRUOS[k], hp = hpBase() * D.hp * (mult || 1);
  const m = { id: M.uid++, k, hp, max: hp, s: 0, spd: D.spd * PATH_LEN / LARGO_BASE, r: D.r, color: D.color, slow: 0, slowT: 0, stun: 0, psn: [], inv: 0, flash: 0, jefe: null, muro: D.muro, mana: D.mana };
  b.mons.push(m);
  return m;
}

function crearJefe(b, id) {
  const hp = 1300 * Math.pow(1.85, M.ronda - 1);
  const J = JEFES[id];
  b.mons.push({ id: M.uid++, k: 'jefe', hp, max: hp, s: 0, spd: 16 * PATH_LEN / LARGO_BASE, r: 19, color: J.color, slow: 0, slowT: 0, stun: 0, psn: [], inv: 0, flash: 0,
    jefe: id, abT: J.cada, muro: 10, mana: 100 + 20 * M.ronda });
  b.jefeVivo = true;
}

function elegirMonstruo() {
  const e = M.rng();
  if (e < 0.08) return 'emisario';
  if (M.ronda >= 2 && e < 0.18) return 'ogro';
  if (e < 0.4) return 'lobo';
  return 'rata';
}

// ---------- Cálculos ----------
function mejoraDe(b, t) { const i = b.deck.indexOf(t); return i < 0 ? 1 : b.up[i]; }
function dano(b, u) {
  const R = RUNAS[u.t], up = mejoraDe(b, u.t), lv = b.lv[u.t] || 1;
  let d = R.dmg * (1 + 0.3 * (up - 1)) * (1 + 0.1 * (lv - 1));
  if (u.t === 'golem') {
    let suma = 0;
    for (const o of b.cells) if (o) suma += o.r;
    return d * suma * (1 + 0.35 * (u.r - 1));
  }
  d *= rankMul(u.r);
  if (u.t === 'semilla') d *= 1 + Math.min(2, u.age * 0.05);
  return d;
}
function bonusYunque(b, i) {
  const c = i % 5, r = (i / 5) | 0;
  let best = 0;
  for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nc = c + dc, nr = r + dr;
    if (nc < 0 || nc > 4 || nr < 0 || nr > 2) continue;
    const n = b.cells[nr * 5 + nc];
    if (n && n.t === 'yunque' && n.stun <= 0) best = Math.max(best, 0.12 + 0.06 * n.r + 0.05 * (mejoraDe(b, 'yunque') - 1));
  }
  return best;
}
function intervalo(b, u, i) {
  const R = RUNAS[u.t];
  let iv = R.vel * (1 - 0.04 * (u.r - 1));
  if (u.t === 'campana') iv = R.vel - 0.25 * (u.r - 1);
  return iv / (1 + bonusYunque(b, i));
}
function auraReloj(b) {
  let a = 0;
  for (const u of b.cells) if (u && u.t === 'reloj' && u.stun <= 0) a = Math.max(a, 0.08 + 0.03 * u.r + 0.02 * (mejoraDe(b, 'reloj') - 1));
  return Math.min(0.45, a);
}
function infoRuna(b, u, i) {
  const R = RUNAS[u.t];
  if (u.t === 'yunque') return `+${Math.round((0.12 + 0.06 * u.r + 0.05 * (mejoraDe(b, 'yunque') - 1)) * 100)} % velocidad a su lado`;
  if (u.t === 'reloj') return `Frena un ${Math.round(Math.min(0.45, 0.08 + 0.03 * u.r + 0.02 * (mejoraDe(b, 'reloj') - 1)) * 100)} %`;
  let s = `Daño ${fmt(dano(b, u))} cada ${intervalo(b, u, i).toFixed(2).replace('.', ',')} s`;
  if (u.t === 'caliz') s += ` · +${Math.round(4 * u.r * (1 + 0.25 * (mejoraDe(b, 'caliz') - 1)))} maná`;
  return s;
}
function fmt(n) {
  n = Math.round(n);
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace('.', ',') + 'M';
  if (n >= 1e4) return Math.round(n / 1e3) + 'k';
  return String(n);
}

// ---------- Acciones ----------
function gastar(b, n) { b.mana -= n; b.hero.carga = Math.min(100, b.hero.carga + n * 0.28); }
function libres(b) { const l = []; b.cells.forEach((u, i) => { if (!u) l.push(i); }); return l; }

function invocar(b) {
  const l = libres(b);
  if (!l.length || b.mana < b.cost) return false;
  gastar(b, b.cost);
  b.cost += 10;
  const i = azar(l);
  b.cells[i] = nuevaRuna(b, azar(b.deck), 1);
  b.invocadas++;
  const p = cellXY(i);
  fxSprite(b, 'fx/invocar', p.x, p.y, 54, 0.4);
  if (b === M.yo) sonar('invocar');
  return true;
}

function puedeFusionar(u, v) { return u && v && u !== v && u.t === v.t && u.r === v.r && u.r < RANGO_MAX; }
function fusionar(b, a, c) {
  const u = b.cells[a], v = b.cells[c];
  if (a === c || !puedeFusionar(u, v)) return false;
  b.cells[a] = null;
  b.cells[c] = nuevaRuna(b, azar(b.deck), u.r + 1);
  b.fusiones++;
  const p = cellXY(c);
  fxSprite(b, 'fx/fusion', p.x, p.y, 64, 0.45);
  if (b === M.yo) sonar('fusion');
  return true;
}
function mover(b, a, c) {
  if (a === c) return;
  const u = b.cells[a], v = b.cells[c];
  b.cells[a] = v; b.cells[c] = u;
  if (u) u.age = 0;
  if (v) v.age = 0;
}
function mejorar(b, di) {
  const lvl = b.up[di];
  if (lvl >= 5) return false;
  const coste = MEJORA_COSTE[lvl - 1];
  if (b.mana < coste) return false;
  gastar(b, coste);
  b.up[di]++;
  b.cells.forEach((u, i) => { if (u && u.t === b.deck[di]) { u.flash = 0.4; const p = cellXY(i); fxAnillo(b, p.x, p.y, '#ffe14d', 8, 30, 0.35); } });
  if (b === M.yo) sonar('mejora');
  return true;
}

function usarHeroe(b) {
  if (b.hero.carga < 100 || M.over) return false;
  b.hero.carga = 0;
  const id = b.hero.id;
  if (id === 'ignia') {
    for (const m of b.mons) {
      herir(b, m, m.jefe ? m.max * 0.08 : m.max * 0.5, true);
      const p = pathPos(m.s);
      fxSprite(b, 'fx/meteoro', p.x, p.y - 8, 44, 0.6);
    }
  } else if (id === 'tempo') {
    for (const m of b.mons) m.stun = Math.max(m.stun, m.jefe ? 1.5 : 3.5);
    fxSprite(b, 'fx/ventisca', 176, 120, 260, 0.9);
  } else if (id === 'forja') {
    const us = b.cells.map((u, i) => ({ u, i })).filter((o) => o.u && o.u.r < RANGO_MAX).sort((x, y) => x.u.r - y.u.r).slice(0, 2);
    for (const o of us) { o.u.r++; o.u.flash = 0.5; o.u.pop = 0.4; const p = cellXY(o.i); fxSprite(b, 'fx/torvald-forja', p.x, p.y, 60, 0.6); }
  } else if (id === 'dora') {
    const g = 80 + 30 * M.ronda;
    b.mana += g;
    fxSprite(b, 'fx/ganancia-mana', 176, 120, 110, 0.9);
    fxTexto(b, 176, 120, '+' + g + ' maná', '#ffd23f', 1.2, 18);
  }
  if (b === M.yo) sonar('heroe');
  else M.aviso = { txt: `${b.nombre} usa ${HEROES[id].hab}`, t: 2 };
  return true;
}

// ---------- Combate ----------
function objetivo(b, modo) {
  let best = null;
  for (const m of b.mons) {
    if (m.hp <= 0 || m.inv > 0) continue;
    if (!best) { best = m; continue; }
    if (modo === 'vida' ? m.hp > best.hp : m.s > best.s) best = m;
  }
  return best;
}
function cerca(b, m, rad) {
  const p = pathPos(m.s), out = [];
  for (const o of b.mons) {
    if (o === m || o.hp <= 0) continue;
    const q = pathPos(o.s);
    if (Math.hypot(p.x - q.x, p.y - q.y) <= rad) out.push(o);
  }
  return out;
}
function herir(b, m, d, ignoraInv) {
  if (m.hp <= 0 || (m.inv > 0 && !ignoraInv)) return;
  m.hp -= d;
  m.flash = 0.06;
}
function frenar(m, v, dur) {
  v = Math.min(0.6, v * (m.jefe ? 0.5 : 1));
  m.slow = m.slowT > 0 ? Math.max(m.slow, v) : v;
  m.slowT = Math.max(m.slowT, dur);
}
function envenenar(m, uid, dps, dur) {
  const p = m.psn.find((x) => x.uid === uid);
  if (p) { p.dps = Math.max(p.dps, dps); p.t = dur; } else m.psn.push({ uid, dps, t: dur });
}

function disparar(b, u, i, m) {
  const p = cellXY(i);
  let d = dano(b, u);
  if (u.t === 'verdugo' && m.jefe && m.hp / m.max < 0.3) d *= 2;
  b.shots.push({ x: p.x, y: p.y - 10, m, d, t: u.t, r: u.r, uid: u.id, col: RUNAS[u.t].color, giro: 0 });
  u.atk = 0.25;
  u.cara = pathPos(m.s).x < p.x ? -1 : 1;
}

function impactar(b, s, m) {
  const d = s.d, R = RUNAS[s.t];
  if (R.imp) { const p = pathPos(m.s); fxSprite(b, 'fx/' + R.imp, p.x, p.y - 8, s.t === 'dragon' ? 70 : s.t === 'ascua' ? 40 : 26, 0.25); }
  switch (s.t) {
    case 'ascua':
      herir(b, m, d);
      for (const o of cerca(b, m, 45)) herir(b, o, d * 0.5);
      { const p = pathPos(m.s); fxAnillo(b, p.x, p.y, '#ff6a3d', 4, 45, 0.25); }
      break;
    case 'escarcha':
      herir(b, m, d); frenar(m, 0.18 + 0.05 * s.r, 2.5); break;
    case 'chispa': {
      herir(b, m, d);
      const tocados = [m];
      let prev = m;
      for (let k = 0; k < s.r; k++) {
        const pp = pathPos(prev.s);
        let nx = null, nd = 120;
        for (const o of b.mons) {
          if (o.hp <= 0 || tocados.includes(o)) continue;
          const q = pathPos(o.s), dd = Math.hypot(pp.x - q.x, pp.y - q.y);
          if (dd < nd) { nd = dd; nx = o; }
        }
        if (!nx) break;
        herir(b, nx, d * Math.pow(0.7, k + 1));
        const q = pathPos(nx.s);
        b.fx.push({ k: 'line', a: pp, b: q, col: '#ffe14d', t: 0.15, d: 0.15 });
        tocados.push(nx); prev = nx;
      }
      break;
    }
    case 'ponzona':
      herir(b, m, d); envenenar(m, s.uid, d * 1.5, 4); break;
    case 'espina':
      herir(b, m, d * ((m.slowT > 0 || m.psn.length || m.stun > 0) ? 2 : 1)); break;
    case 'lanza':
      herir(b, m, d);
      for (const o of b.mons) if (o !== m && o.s < m.s && o.s > m.s - 80) herir(b, o, d);
      break;
    case 'verdugo':
      herir(b, m, d);
      if (!m.jefe && m.hp > 0 && m.hp / m.max < 0.07 + 0.015 * s.r) {
        m.hp = 0;
        const p = pathPos(m.s);
        fxTexto(b, p.x, p.y - 8, '✕', '#ff4d6a', 0.6, 16);
      }
      break;
    case 'dragon':
      for (const o of [m, ...cerca(b, m, 70)]) { herir(b, o, d); envenenar(o, 'd' + s.uid, d * 0.25, 3); }
      { const p = pathPos(m.s); fxAnillo(b, p.x, p.y, '#ff4f7b', 8, 70, 0.35); }
      break;
    default:
      herir(b, m, d);
  }
}

function habilidadJefe(b, m) {
  const ocupadas = b.cells.map((u, i) => (u ? i : -1)).filter((i) => i >= 0);
  const p = pathPos(m.s);
  switch (m.jefe) {
    case 'coloso':
      for (let k = 0; k < 2 && ocupadas.length; k++) {
        const i = ocupadas.splice((Math.random() * ocupadas.length) | 0, 1)[0];
        b.cells[i].stun = 3;
        const c = cellXY(i);
        fxAnillo(b, c.x, c.y, '#a0784a', 4, 30, 0.4);
      }
      b.temblor = 0.3;
      break;
    case 'nigromante':
      for (let k = 0; k < 2; k++) {
        const r = crearMonstruo(b, 'rata', 0.5);
        r.s = Math.max(0, m.s - 12 - k * 12);
      }
      fxAnillo(b, p.x, p.y, '#5e8f6a', 6, 40, 0.4);
      break;
    case 'sombra':
      m.s = Math.min(PATH_LEN - 30, m.s + 70);
      m.inv = 1;
      break;
    case 'devorador':
      if (ocupadas.length) {
        const i = azar(ocupadas), u = b.cells[i], c = cellXY(i);
        if (u.r > 1) { u.r--; u.flash = 0.4; } else b.cells[i] = null;
        fxAnillo(b, c.x, c.y, '#a33a3a', 4, 32, 0.45);
      }
      break;
    case 'hechicera':
      if (ocupadas.length >= 2) {
        const a = ocupadas.splice((Math.random() * ocupadas.length) | 0, 1)[0];
        const c = azar(ocupadas);
        mover(b, a, c);
        b.cells[c].stun = Math.max(b.cells[c].stun, 2);
        const pa = cellXY(a), pc = cellXY(c);
        b.fx.push({ k: 'line', a: pa, b: pc, col: '#4a6adf', t: 0.4, d: 0.4 });
      }
      break;
  }
}

function enviar(b) {
  const m = crearMonstruo(b, 'enviado');
  if (b === M.yo) M.aviso = { txt: '¡Te mandan un enviado!', t: 1.6 };
  return m;
}

// ---------- Bucle ----------
function paso(dt) {
  if (!M || M.over || M.pausa) return;
  M.t += dt;
  if (M.banner && (M.banner.t -= dt) <= 0) M.banner = null;
  if (M.aviso && (M.aviso.t -= dt) <= 0) M.aviso = null;

  if (M.fase === 'olas') {
    M.faseT += dt;
    M.spawnT -= dt;
    if (M.spawnT <= 0) {
      M.spawnT = Math.max(0.55, 1.3 - 0.06 * (M.ronda - 1));
      const k = elegirMonstruo();
      for (const b of M.boards) crearMonstruo(b, k);
    }
    if (M.faseT >= RONDA_DUR) {
      M.fase = 'jefe';
      M.jefe = JEFE_IDS[(M.rng() * JEFE_IDS.length) | 0];
      for (const b of M.boards) crearJefe(b, M.jefe);
      M.banner = { txt: JEFES[M.jefe].nombre, sub: JEFES[M.jefe].desc, t: 2.4 };
      sonar('jefe');
    }
  } else if (M.boards.every((b) => !b.jefeVivo)) {
    M.ronda++;
    M.fase = 'olas'; M.faseT = 0; M.spawnT = 2.5; M.jefe = null;
    M.banner = { txt: 'Ronda ' + M.ronda, t: 1.6 };
    sonar('ronda');
  }

  for (const b of M.boards) pasoTablero(b, dt);

  const yoMuerto = M.yo.muro <= 0, rivalMuerto = M.rival && M.rival.muro <= 0;
  if (yoMuerto || rivalMuerto) {
    M.over = true;
    let res = 'derrota';
    if (M.modo === 'super') res = 'fin';
    else if (yoMuerto && rivalMuerto) res = 'empate';
    else if (rivalMuerto) res = 'victoria';
    sonar(res === 'victoria' ? 'victoria' : 'derrota');
    setTimeout(() => M.onFin && M.onFin(res, M), 900);
  }
}

function pasoTablero(b, dt) {
  if (b.temblor > 0) b.temblor -= dt;
  b.hero.carga = Math.min(100, b.hero.carga + dt * 0.4);
  const reloj = auraReloj(b);

  // Runas
  b.cells.forEach((u, i) => {
    if (!u) return;
    u.age += dt;
    if (u.flash > 0) u.flash -= dt;
    if (u.atk > 0) u.atk -= dt;
    if (u.pop > 0) u.pop = Math.max(0, u.pop - dt * 1.5);
    if (u.stun > 0) { u.stun -= dt; return; }
    const R = RUNAS[u.t];
    if (u.t === 'caliz') {
      u.gen += dt;
      if (u.gen >= 6) {
        u.gen = 0;
        const g = Math.round(4 * u.r * (1 + 0.25 * (mejoraDe(b, 'caliz') - 1)));
        b.mana += g;
        const p = cellXY(i);
        fxTexto(b, p.x, p.y - 16, '+' + g, '#ff7bc6', 0.9, 12);
      }
    }
    if (!R.vel) return;
    u.cd -= dt;
    if (u.cd > 0) return;
    if (u.t === 'campana') {
      if (!b.mons.length) { u.cd = 0.3; return; }
      const d = dano(b, u);
      for (const m of b.mons) { herir(b, m, d); if (!m.jefe) m.stun = Math.max(m.stun, 0.35); }
      const p = cellXY(i);
      fxSprite(b, 'fx/marea', p.x, p.y - 6, 90, 0.5);
      for (const m of b.mons) { const q = pathPos(m.s); fxSprite(b, 'fx/hielo-impacto', q.x, q.y - 6, 22, 0.3); }
      u.atk = 0.4;
      u.cd = intervalo(b, u, i);
      return;
    }
    const m = objetivo(b, u.t === 'saeta' ? 'vida' : 'primero');
    if (!m) { u.cd = 0.1; return; }
    disparar(b, u, i, m);
    u.cd = intervalo(b, u, i);
  });

  // Proyectiles
  for (const s of b.shots) {
    if (s.m.hp <= 0 || s.m.out) {
      const n = objetivo(b, 'primero');
      if (!n) { s.fin = true; continue; }
      s.m = n;
    }
    const q = pathPos(s.m.s), dx = q.x - s.x, dy = q.y - s.y, dist = Math.hypot(dx, dy), v = 560 * dt;
    s.giro += dt * 12;
    s.ang = Math.atan2(dy, dx);
    if (dist <= v + 6) { impactar(b, s, s.m); s.fin = true; continue; }
    s.x += dx / dist * v; s.y += dy / dist * v;
  }
  b.shots = b.shots.filter((s) => !s.fin);

  // Monstruos
  for (const m of b.mons) {
    if (m.flash > 0) m.flash -= dt;
    if (m.inv > 0) m.inv -= dt;
    if (m.psn.length) {
      let tot = 0;
      m.psn = m.psn.filter((p) => (p.t -= dt) > 0);
      for (const p of m.psn) tot += p.dps;
      if (tot) herir(b, m, tot * dt, true);
    }
    if (m.slowT > 0) m.slowT -= dt; else m.slow = 0;
    if (m.stun > 0) m.stun -= dt;
    else m.s += m.spd * (1 - m.slow) * (1 - (m.jefe ? reloj * 0.5 : reloj)) * dt;
    if (m.jefe && m.hp > 0 && (m.abT -= dt) <= 0) { m.abT = JEFES[m.jefe].cada; habilidadJefe(b, m); }
    if (m.hp > 0 && m.s >= PATH_LEN) {
      m.out = true;
      b.muro = Math.max(0, b.muro - m.muro);
      b.temblor = 0.25;
      if (m.jefe) b.jefeVivo = false;
      if (b === M.yo) sonar('golpe');
    }
  }
  for (const m of b.mons) {
    if (m.out || m.hp > 0) continue;
    m.out = true;
    b.kills++;
    const g = Math.round(m.mana * (1 + 0.1 * (M.ronda - 1)));
    b.mana += g;
    const p = pathPos(m.s);
    fxSprite(b, 'fx/muerte-puf', p.x, p.y - 8, m.jefe ? 70 : 32, 0.35);
    if (m.jefe) {
      b.jefeVivo = false;
      fxTexto(b, p.x, p.y - 20, '+' + g, '#7fe0ff', 1.2, 16);
      if (b === M.yo) sonar('jefeMuere');
    }
    if (m.k === 'emisario') {
      const otro = M.boards.find((o) => o !== b);
      if (otro) { enviar(otro); fxTexto(b, p.x, p.y - 12, 'Enviado', '#d6a6ff', 0.9, 11); }
    }
  }
  b.mons = b.mons.filter((m) => !m.out);

  for (const f of b.fx) f.t -= dt;
  b.fx = b.fx.filter((f) => f.t > 0);

  if (b.ai) pensarIA(b, dt);
}

// ---------- Rival ----------
function paresDe(b) {
  const out = [];
  for (let a = 0; a < 15; a++) for (let c = a + 1; c < 15; c++) if (puedeFusionar(b.cells[a], b.cells[c])) out.push([a, c]);
  return out.sort((x, y) => b.cells[x[0]].r - b.cells[y[0]].r);
}
function pensarIA(b, dt) {
  const ai = b.ai;
  if ((ai.t -= dt) > 0) return;
  ai.t = ai.ritmo * (0.7 + Math.random() * 0.6);
  if (Math.random() < ai.torpe) return;
  if (b.hero.carga >= 100 && (b.mons.length >= 6 || b.jefeVivo)) { usarHeroe(b); return; }
  const l = libres(b).length, pares = paresDe(b);
  if (!l && pares.length) { const [a, c] = pares[0]; fusionar(b, a, c); return; }
  if (l && b.mana >= b.cost) { invocar(b); return; }
  // Mejora la runa que más pesa en el tablero
  const peso = b.deck.map((t) => b.cells.reduce((n, u) => n + (u && u.t === t ? u.r : 0), 0));
  let di = 0;
  peso.forEach((p, i) => { if (p > peso[di]) di = i; });
  const lvl = b.up[di];
  if (lvl < 5) {
    const coste = MEJORA_COSTE[lvl - 1];
    if (b.mana >= coste && (!l || b.mana >= coste + b.cost)) { mejorar(b, di); return; }
  }
  if (pares.length && Math.random() < 0.3) { const [a, c] = pares[0]; fusionar(b, a, c); }
}

// ---------- Efectos ----------
function fxAnillo(b, x, y, col, r0, r1, d) { b.fx.push({ k: 'ring', x, y, col, r0, r1, t: d, d }); }
function fxSprite(b, name, x, y, size, d) { b.fx.push({ k: 'spr', name, x, y, size, t: d, d }); }
function fxTexto(b, x, y, txt, col, d, size) { b.fx.push({ k: 'txt', x, y, txt, col, t: d, d, size: size || 12 }); }

// ---------- Dibujo ----------
const ICONOS = {
  ascua(c) { c.beginPath(); c.moveTo(0, -1); c.bezierCurveTo(0.55, -0.35, 0.85, 0.15, 0.6, 0.6); c.quadraticCurveTo(0, 1.1, -0.6, 0.6); c.bezierCurveTo(-0.85, 0.15, -0.35, -0.1, -0.15, -0.45); c.quadraticCurveTo(0.05, -0.2, 0, -1); c.fill(); },
  escarcha(c) {
    c.lineWidth = 0.17; c.lineCap = 'round';
    for (let k = 0; k < 3; k++) {
      c.save(); c.rotate(k * Math.PI / 3);
      c.beginPath(); c.moveTo(0, -0.95); c.lineTo(0, 0.95);
      c.moveTo(-0.28, -0.75); c.lineTo(0, -0.5); c.lineTo(0.28, -0.75);
      c.moveTo(-0.28, 0.75); c.lineTo(0, 0.5); c.lineTo(0.28, 0.75);
      c.stroke(); c.restore();
    }
  },
  saeta(c) {
    c.lineWidth = 0.16; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-0.75, 0.75); c.lineTo(0.55, -0.55); c.stroke();
    c.beginPath(); c.moveTo(0.95, -0.95); c.lineTo(0.25, -0.7); c.lineTo(0.7, -0.25); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(-0.75, 0.75); c.lineTo(-0.95, 0.35); c.moveTo(-0.75, 0.75); c.lineTo(-0.35, 0.95); c.stroke();
  },
  chispa(c) { c.beginPath(); c.moveTo(0.25, -1); c.lineTo(-0.55, 0.12); c.lineTo(-0.05, 0.12); c.lineTo(-0.3, 1); c.lineTo(0.6, -0.22); c.lineTo(0.08, -0.22); c.lineTo(0.4, -1); c.closePath(); c.fill(); },
  ponzona(c) {
    c.beginPath(); c.moveTo(0, -1); c.bezierCurveTo(0.35, -0.45, 0.7, -0.05, 0.7, 0.3); c.arc(0, 0.3, 0.7, 0, Math.PI); c.bezierCurveTo(-0.7, -0.05, -0.35, -0.45, 0, -1); c.fill();
    c.globalCompositeOperation = 'destination-out';
    c.beginPath(); c.arc(-0.22, 0.38, 0.17, 0, 7); c.arc(0.25, 0.15, 0.12, 0, 7); c.fill();
    c.globalCompositeOperation = 'source-over';
  },
  yunque(c) { c.beginPath(); c.moveTo(-0.95, -0.5); c.lineTo(0.55, -0.5); c.lineTo(0.95, -0.28); c.lineTo(0.55, -0.08); c.lineTo(0.3, -0.08); c.lineTo(0.3, 0.3); c.lineTo(0.65, 0.72); c.lineTo(-0.65, 0.72); c.lineTo(-0.3, 0.3); c.lineTo(-0.3, -0.08); c.lineTo(-0.7, -0.08); c.closePath(); c.fill(); },
  caliz(c) {
    c.beginPath(); c.moveTo(-0.7, -0.85); c.lineTo(0.7, -0.85); c.quadraticCurveTo(0.7, 0.15, 0.12, 0.25); c.lineTo(0.12, 0.6); c.lineTo(0.5, 0.75); c.lineTo(0.5, 0.92); c.lineTo(-0.5, 0.92); c.lineTo(-0.5, 0.75); c.lineTo(-0.12, 0.6); c.lineTo(-0.12, 0.25); c.quadraticCurveTo(-0.7, 0.15, -0.7, -0.85); c.fill();
  },
  espina(c) { c.beginPath(); for (const [x, h] of [[-0.6, 0.9], [0, 1.25], [0.6, 0.9]]) { c.moveTo(x - 0.32, 0.8); c.lineTo(x, 0.8 - h * 1.25); c.lineTo(x + 0.32, 0.8); } c.fill(); c.fillRect(-0.95, 0.72, 1.9, 0.22); },
  campana(c) {
    c.beginPath(); c.moveTo(-0.8, 0.55); c.quadraticCurveTo(-0.6, 0.35, -0.55, -0.2); c.quadraticCurveTo(-0.5, -0.85, 0, -0.85); c.quadraticCurveTo(0.5, -0.85, 0.55, -0.2); c.quadraticCurveTo(0.6, 0.35, 0.8, 0.55); c.closePath(); c.fill();
    c.beginPath(); c.arc(0, 0.72, 0.2, 0, 7); c.fill(); c.fillRect(-0.08, -1, 0.16, 0.2);
  },
  lanza(c) {
    c.lineWidth = 0.15; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-0.85, 0.85); c.lineTo(0.35, -0.35); c.stroke();
    c.beginPath(); c.moveTo(1, -1); c.lineTo(0.2, -0.6); c.lineTo(0.35, -0.35); c.lineTo(0.6, -0.2); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(-0.1, 0.1); c.lineTo(-0.45, -0.05); c.moveTo(-0.1, 0.1); c.lineTo(0.05, 0.45); c.stroke();
  },
  semilla(c) {
    c.lineWidth = 0.14; c.lineCap = 'round';
    c.beginPath(); c.moveTo(0, 0.95); c.quadraticCurveTo(0.05, 0.2, 0, -0.2); c.stroke();
    c.beginPath(); c.ellipse(-0.38, -0.35, 0.42, 0.2, -0.6, 0, 7); c.fill();
    c.beginPath(); c.ellipse(0.4, -0.55, 0.5, 0.24, 0.6, 0, 7); c.fill();
    c.beginPath(); c.ellipse(0, 0.92, 0.5, 0.12, 0, 0, 7); c.fill();
  },
  verdugo(c) {
    c.lineWidth = 0.15; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-0.7, 0.95); c.lineTo(0.35, -0.6); c.stroke();
    c.beginPath(); c.moveTo(0.05, -0.95); c.quadraticCurveTo(0.95, -0.85, 0.95, -0.05); c.quadraticCurveTo(0.6, -0.45, 0.15, -0.35); c.closePath(); c.fill();
  },
  golem(c) {
    c.beginPath(); c.roundRect(-0.75, -0.8, 1.5, 1.6, 0.25); c.fill();
    c.globalCompositeOperation = 'destination-out';
    c.fillRect(-0.45, -0.3, 0.3, 0.2); c.fillRect(0.15, -0.3, 0.3, 0.2); c.fillRect(-0.35, 0.3, 0.7, 0.14);
    c.globalCompositeOperation = 'source-over';
  },
  dragon(c) {
    c.beginPath(); c.moveTo(0, 0.7); c.lineTo(-0.95, -0.55); c.lineTo(-0.55, -0.35); c.lineTo(-0.5, -0.8); c.lineTo(-0.2, -0.3); c.lineTo(0, -0.95); c.lineTo(0.2, -0.3); c.lineTo(0.5, -0.8); c.lineTo(0.55, -0.35); c.lineTo(0.95, -0.55); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(-0.18, 0.55); c.lineTo(0, 1); c.lineTo(0.18, 0.55); c.fill();
  },
  reloj(c) {
    c.fillRect(-0.7, -0.95, 1.4, 0.18); c.fillRect(-0.7, 0.77, 1.4, 0.18);
    c.beginPath(); c.moveTo(-0.55, -0.77); c.lineTo(0.55, -0.77); c.lineTo(0.08, 0); c.lineTo(0.55, 0.77); c.lineTo(-0.55, 0.77); c.lineTo(-0.08, 0); c.closePath(); c.fill();
    c.globalCompositeOperation = 'destination-out';
    c.beginPath(); c.moveTo(-0.32, -0.62); c.lineTo(0.32, -0.62); c.lineTo(0, -0.25); c.closePath(); c.fill();
    c.globalCompositeOperation = 'source-over';
  }
};

function oscuro(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.round(v * k);
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

// Dibuja una ficha de runa centrada en x,y de lado `t`.
function dibujarRuna(c, tipo, r, x, y, t, op) {
  op = op || {};
  const R = RUNAS[tipo];
  c.save();
  c.translate(x, y);
  if (op.escala) c.scale(op.escala, op.escala);
  const h = t / 2;
  const g = c.createLinearGradient(0, -h, 0, h);
  g.addColorStop(0, oscuro(R.color, 0.75));
  g.addColorStop(1, oscuro(R.color, 0.32));
  c.fillStyle = g;
  c.beginPath(); c.roundRect(-h, -h, t, t, t * 0.2); c.fill();
  c.lineWidth = 2;
  c.strokeStyle = RAREZAS[R.rareza].color;
  c.stroke();
  // icono
  c.save();
  c.translate(0, r ? -t * 0.08 : 0);
  const s = t * (r ? 0.26 : 0.32);
  c.scale(s, s);
  c.fillStyle = '#fff'; c.strokeStyle = '#fff';
  ICONOS[tipo](c);
  c.restore();
  // rango en puntos
  if (r) {
    const filas = r > 4 ? [Math.ceil(r / 2), Math.floor(r / 2)] : [r];
    const pr = Math.max(1.6, t * 0.045), sep = pr * 2.8;
    filas.forEach((n, fi) => {
      const yy = h - t * 0.14 - (filas.length - 1 - fi) * sep;
      for (let k = 0; k < n; k++) {
        const xx = (k - (n - 1) / 2) * sep;
        c.beginPath(); c.arc(xx, yy, pr, 0, 7);
        c.fillStyle = r >= 7 ? '#ffd23f' : '#fff'; c.fill();
        c.lineWidth = 1; c.strokeStyle = 'rgba(0,0,0,.55)'; c.stroke();
      }
    });
  }
  if (op.flash > 0) { c.fillStyle = `rgba(255,255,255,${Math.min(0.6, op.flash * 1.8)})`; c.beginPath(); c.roundRect(-h, -h, t, t, t * 0.2); c.fill(); }
  if (op.stun > 0) {
    c.fillStyle = 'rgba(20,20,30,.6)'; c.beginPath(); c.roundRect(-h, -h, t, t, t * 0.2); c.fill();
    c.fillStyle = '#ffe14d'; c.font = `bold ${t * 0.3}px Nunito, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('Zz', 0, 0);
  }
  c.restore();
}

const iconoCache = {};
function iconoURL(tipo) { return 'assets/units/' + RUNAS[tipo].img + '.webp'; }
function iconoVectorURL(tipo, r) {
  const key = tipo + (r || 0);
  if (iconoCache[key]) return iconoCache[key];
  const cv = document.createElement('canvas');
  cv.width = cv.height = 96;
  const c = cv.getContext('2d');
  dibujarRuna(c, tipo, r || 0, 48, 48, 88);
  return (iconoCache[key] = cv.toDataURL());
}

function dibujar(c) {
  c.fillStyle = '#120f1f';
  c.fillRect(0, 0, W, H);
  if (!M) return;
  for (const b of M.boards) dibujarTablero(c, b);
  if (!M.rival) dibujarPanelSolo(c);
  dibujarFranja(c);
  if (drag && drag.moved) {
    const u = M.yo.cells[drag.from];
    if (u) { c.globalAlpha = 0.85; dibujarTropa(c, u, drag.x, drag.y); c.globalAlpha = 1; }
  }
  if (M.banner) {
    const a = Math.min(1, M.banner.t * 2);
    c.save();
    c.globalAlpha = a;
    c.fillStyle = 'rgba(10,8,20,.75)';
    c.fillRect(0, MID_TOP - 6, W, M.banner.sub ? 74 : 62);
    c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = '26px Bungee, sans-serif';
    c.fillText(M.banner.txt, W / 2, MID_TOP + 22);
    if (M.banner.sub) { c.font = '700 12px Nunito, sans-serif'; c.fillStyle = '#d8ccff'; c.fillText(M.banner.sub, W / 2, MID_TOP + 50); }
    c.restore();
  }
}

function dibujarPanelSolo(c) {
  c.save();
  c.fillStyle = '#1a1530';
  c.beginPath(); c.roundRect(20, 40, W - 40, 200, 16); c.fill();
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = '#fff'; c.font = '28px Bungee, sans-serif';
  c.fillText('Supervivencia', W / 2, 95);
  c.font = '800 16px Nunito, sans-serif'; c.fillStyle = '#d8ccff';
  c.fillText('Ronda ' + M.ronda, W / 2, 135);
  c.fillText('Monstruos caídos: ' + M.yo.kills, W / 2, 162);
  c.fillStyle = '#ffd23f';
  c.fillText('Récord: ronda ' + Math.max(M.record || 0, 0), W / 2, 196);
  c.restore();
}

function dibujarFranja(c) {
  const y = MID_TOP + 6, h = ME_Y - MID_TOP - 12;
  c.save();
  c.textAlign = 'center'; c.textBaseline = 'middle';
  if (M.fase === 'olas') {
    const k = M.faseT / RONDA_DUR, rest = Math.max(0, Math.ceil(RONDA_DUR - M.faseT));
    c.fillStyle = '#fff'; c.font = '15px Bungee, sans-serif';
    c.fillText('Ronda ' + M.ronda, W / 2, y + 12);
    c.fillStyle = 'rgba(255,255,255,.12)'; c.beginPath(); c.roundRect(60, y + 26, W - 120, 8, 4); c.fill();
    c.fillStyle = '#b46bff'; c.beginPath(); c.roundRect(60, y + 26, (W - 120) * k, 8, 4); c.fill();
    c.font = '700 10px Nunito, sans-serif'; c.fillStyle = '#bdb3dd';
    c.fillText('Jefe en ' + rest + ' s', W / 2, y + 41);
  } else {
    c.fillStyle = '#ffb3c1'; c.font = '14px Bungee, sans-serif';
    c.fillText(JEFES[M.jefe].nombre + ' · Ronda ' + M.ronda, W / 2, y + 10);
    M.boards.forEach((b, i) => {
      const jm = b.mons.find((m) => m.jefe);
      const bx = M.boards.length > 1 ? (i === 0 ? 24 : W / 2 + 6) : 60, bw = M.boards.length > 1 ? W / 2 - 30 : W - 120;
      c.fillStyle = 'rgba(255,255,255,.12)'; c.beginPath(); c.roundRect(bx, y + 24, bw, 9, 4); c.fill();
      if (jm) { c.fillStyle = b === M.yo ? '#ff4d6a' : '#ff9d4d'; c.beginPath(); c.roundRect(bx, y + 24, bw * Math.max(0, jm.hp / jm.max), 9, 4); c.fill(); }
      c.font = '700 9px Nunito, sans-serif'; c.fillStyle = '#bdb3dd';
      c.fillText(jm ? (b === M.yo ? 'Tu jefe ' : 'Su jefe ') + fmt(jm.hp) : (b === M.yo ? 'Tu jefe: fuera' : 'Su jefe: fuera'), bx + bw / 2, y + 41);
    });
  }
  if (M.aviso) {
    c.globalAlpha = Math.min(1, M.aviso.t * 2);
    c.fillStyle = '#d6a6ff'; c.font = '800 11px Nunito, sans-serif';
    c.fillText(M.aviso.txt, W / 2, y - 2 + h + 2);
  }
  c.restore();
}

function dibujarSprite(c, name, x, y, size, alpha, rot) {
  const im = img(name);
  if (!listo(im)) return false;
  const k = size / Math.max(im.naturalWidth, im.naturalHeight), w = im.naturalWidth * k, h = im.naturalHeight * k;
  c.save();
  c.globalAlpha *= alpha == null ? 1 : alpha;
  c.translate(x, y);
  if (rot) c.rotate(rot);
  c.drawImage(im, -w / 2, -h / 2, w, h);
  c.restore();
  return true;
}

// Tropa de pie sobre su casilla: x,y es el centro de la casilla en pantalla.
function dibujarTropa(c, u, x, y, celda) {
  const R = RUNAS[u.t];
  const pose = u.atk > 0 && R.vel ? 'attack' : 'idle';
  let im = img('units/board/' + R.img + '-' + pose);
  if (!listo(im)) im = img('units/board/' + R.img + '-idle');
  const ch = Math.min(CH, 56), pies = y + ch * 0.36;
  c.save();
  c.fillStyle = COLOR_RANGO[u.r];
  c.globalAlpha *= 0.35;
  c.beginPath(); c.ellipse(x, pies - 2, 20, 6, 0, 0, 7); c.fill();
  c.restore();
  if (!listo(im)) { dibujarRuna(c, u.t, u.r, x, y, 44, { flash: u.flash, stun: u.stun }); return; }
  const h = 66 * Math.min(1, 0.55 + CH / 100) * (1 + u.pop * 0.5), k = h / 512, w = im.naturalWidth * k, hh = im.naturalHeight * k;
  c.save();
  c.translate(x, pies);
  if (pose === 'attack' && u.cara < 0) c.scale(-1, 1);
  const f = [];
  if (u.stun > 0) f.push('saturate(0.3) brightness(1.2) hue-rotate(160deg)');
  if (u.flash > 0) f.push('brightness(1.6)');
  if (f.length) c.filter = f.join(' ');
  c.drawImage(im, -w / 2, -hh + 4, w, hh);
  c.restore();
  if (u.stun > 0) dibujarSprite(c, 'fx/estado-aturdido', x, pies - h * 0.75, 22, 0.95);
  // rango
  const bx = x - 21, by = y - (celda ? ch * 0.36 : 20), r = 8;
  c.fillStyle = 'rgba(10,12,30,0.88)'; c.beginPath(); c.arc(bx, by, r, 0, 7); c.fill();
  c.lineWidth = 2; c.strokeStyle = COLOR_RANGO[u.r]; c.stroke();
  c.fillStyle = COLOR_RANGO[u.r]; c.font = '900 11px Nunito, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(u.r, bx, by + 0.5);
  if (u.t === 'caliz') {
    c.strokeStyle = '#7fd6ff'; c.lineWidth = 2.5; c.beginPath();
    c.arc(x + 21, by, 6, -Math.PI / 2, -Math.PI / 2 + (u.gen / 6) * Math.PI * 2); c.stroke();
  }
  if (u.t === 'semilla') { const k2 = Math.min(1, u.age * 0.025); c.fillStyle = '#9bd44a'; c.fillRect(x - 18, pies + 2, 36 * k2, 3); }
}

function dibujarTablero(c, b) {
  c.save();
  if (b.temblor > 0) c.translate((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4);
  const esYo = b === M.yo;
  // fondo: el tablero de Reino, volteado para el rival
  const bim = GEO ? img('boards/' + GEO.id) : null;
  if (listo(bim)) {
    c.save();
    c.translate(OX, b.flip ? MID_TOP : ME_Y);
    if (b.flip) c.scale(1, -1);
    c.beginPath(); c.rect(-OX, 0, W, 252); c.clip();
    const T = GEO.T, s = GEO.s;
    c.drawImage(bim, GX - T.g[0] * s, GY - T.g[1] * s, T.iw * s, T.ih * s);
    if (b.flip) { c.fillStyle = 'rgba(10,6,20,.22)'; c.fillRect(-OX, 0, W, 252); }
    c.restore();
  } else {
    c.lineJoin = 'round'; c.lineCap = 'round';
    c.strokeStyle = '#2b2442'; c.lineWidth = 30;
    c.beginPath();
    PATH.forEach(([x, y], k) => { const [sx, sy] = scr(b, x, y); k ? c.lineTo(sx, sy) : c.moveTo(sx, sy); });
    c.stroke();
    for (let i = 0; i < 15; i++) {
      const p = cellXY(i), [sx, sy] = scr(b, p.x, p.y);
      c.fillStyle = '#1f1a33'; c.beginPath(); c.roundRect(sx - CW / 2, sy - CH / 2 + 2, CW, CH - 4, 10); c.fill();
    }
  }
  // muralla al final del camino
  {
    const e = PATH[PATH.length - 1], [sx, sy] = scr(b, e[0], e[1]), k = b.muro / MURO_MAX;
    c.fillStyle = k > 0.5 ? 'rgba(60,70,95,.9)' : k > 0.25 ? 'rgba(150,110,50,.9)' : 'rgba(170,60,70,.95)';
    c.beginPath(); c.roundRect(sx - 15, sy - 9, 30, 18, 6); c.fill();
    c.fillStyle = '#fff'; c.font = '900 11px Nunito, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(b.muro, sx, sy + 1);
  }
  // casillas resaltadas
  const selI = esYo ? (drag ? drag.from : b.sel) : -1, selU = selI >= 0 ? b.cells[selI] : null;
  if (selU) for (let i = 0; i < 15; i++) {
    const p = cellXY(i), [sx, sy] = scr(b, p.x, p.y), u = b.cells[i];
    let col = null;
    if (i === selI) col = 'rgba(255,255,255,.3)';
    else if (u && puedeFusionar(selU, u)) col = 'rgba(255,214,74,.45)';
    else if (!u) col = 'rgba(120,200,255,.12)';
    if (col) { c.fillStyle = col; c.beginPath(); c.roundRect(sx - CW / 2 + 1, sy - CH / 2 + 3, CW - 2, CH - 6, 9); c.fill(); }
  }
  // auras de apoyo
  b.cells.forEach((u, i) => {
    if (!u || (u.t !== 'yunque' && u.t !== 'reloj')) return;
    const p = cellXY(i), [sx, sy] = scr(b, p.x, p.y);
    c.fillStyle = u.t === 'yunque' ? 'rgba(255,190,110,.13)' : 'rgba(201,166,255,.12)';
    c.beginPath(); c.ellipse(sx, sy, u.t === 'yunque' ? 70 : 40, u.t === 'yunque' ? CH * 1.25 : 30, 0, 0, 7); c.fill();
  });
  // monstruos
  for (const m of b.mons) {
    const p = pathPos(m.s), [sx, sy] = scr(b, p.x, p.y);
    const D = m.jefe ? null : MONSTRUOS[m.k];
    const im = img('enemies/' + (m.jefe ? JEFES[m.jefe].img : D.img));
    const tam = m.jefe ? 58 : D.tam;
    c.save();
    c.globalAlpha = m.inv > 0 ? 0.4 : 1;
    c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(sx, sy + 5, tam * 0.35, tam * 0.1, 0, 0, 7); c.fill();
    if (D && D.aura) { c.fillStyle = D.aura + '55'; c.beginPath(); c.arc(sx, sy - tam * 0.4, tam * 0.62, 0, 7); c.fill(); }
    if (listo(im)) {
      const k = tam / Math.max(im.naturalWidth, im.naturalHeight), w = im.naturalWidth * k, h = im.naturalHeight * k;
      const bob = Math.sin(M.t * 8 + m.id) * tam * 0.03;
      c.translate(sx, sy + 6 + bob);
      if (p.dx < -0.01) c.scale(-1, 1);
      const f = [];
      if (m.flash > 0) f.push('brightness(1.8)');
      if (m.slowT > 0 || m.stun > 0) f.push('hue-rotate(170deg) saturate(0.7)');
      if (m.psn.length) f.push('sepia(0.3) hue-rotate(60deg)');
      if (m.jefe === 'sombra') f.push('brightness(0.55) saturate(1.4)');
      if (f.length) c.filter = f.join(' ');
      c.drawImage(im, -w / 2, -h, w, h);
    } else {
      c.fillStyle = m.color; c.beginPath(); c.arc(sx, sy, m.r, 0, 7); c.fill();
    }
    c.restore();
    const top = sy + 6 - tam;
    const st = [];
    if (m.stun > 0) st.push('estado-aturdido');
    if (m.slowT > 0 && m.slow > 0.25) st.push('estado-helado');
    if (m.psn.length) st.push('estado-veneno');
    st.forEach((n, k) => dibujarSprite(c, 'fx/' + n, sx + (k - (st.length - 1) / 2) * 12, top - 10, 12, 0.95));
    if (!m.jefe && m.hp < m.max) {
      const bw = tam * 0.8;
      c.fillStyle = 'rgba(0,0,0,.65)'; c.fillRect(sx - bw / 2, top - 3, bw, 4);
      c.fillStyle = D.aura ? '#d6a6ff' : '#ff4d6a'; c.fillRect(sx - bw / 2, top - 3, bw * Math.max(0, m.hp / m.max), 4);
    }
  }
  // tropas: de arriba abajo en pantalla para que las de delante tapen a las de detrás
  const orden = [];
  b.cells.forEach((u, i) => { if (u && !(esYo && drag && drag.moved && drag.from === i)) orden.push(i); });
  orden.sort((x, y) => scr(b, 0, cellXY(x).y)[1] - scr(b, 0, cellXY(y).y)[1]);
  for (const i of orden) { const p = cellXY(i), [sx, sy] = scr(b, p.x, p.y); dibujarTropa(c, b.cells[i], sx, sy, true); }
  if (esYo && b.sel >= 0 && b.cells[b.sel]) {
    const p = cellXY(b.sel), [sx, sy] = scr(b, p.x, p.y);
    c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.roundRect(sx - CW / 2, sy - CH / 2 + 2, CW, CH - 4, 10); c.stroke();
  }
  // proyectiles
  for (const s of b.shots) {
    const [sx, sy] = scr(b, s.x, s.y), R = RUNAS[s.t];
    const ang = b.flip ? -(s.ang || 0) : (s.ang || 0);
    if (!R.tiro || !dibujarSprite(c, 'fx/' + R.tiro, sx, sy, s.t === 'dragon' || s.t === 'semilla' ? 26 : 18, 1, R.gira ? s.giro : ang)) {
      c.fillStyle = s.col; c.beginPath(); c.arc(sx, sy, 3.2, 0, 7); c.fill();
    }
  }
  // efectos
  for (const f of b.fx) {
    const k = 1 - f.t / f.d;
    c.globalAlpha = Math.max(0, f.t / f.d);
    if (f.k === 'spr') {
      const [sx, sy] = scr(b, f.x, f.y);
      c.globalAlpha = 1 - k * k;
      dibujarSprite(c, f.name, sx, sy, f.size * (0.8 + 0.3 * k));
    } else if (f.k === 'ring') {
      const [sx, sy] = scr(b, f.x, f.y);
      c.strokeStyle = f.col; c.lineWidth = 2.5;
      c.beginPath(); c.arc(sx, sy, f.r0 + (f.r1 - f.r0) * k, 0, 7); c.stroke();
    } else if (f.k === 'txt') {
      const [sx, sy] = scr(b, f.x, f.y);
      c.font = `900 ${f.size}px Nunito, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,.75)'; c.strokeText(f.txt, sx, sy - k * 14);
      c.fillStyle = f.col; c.fillText(f.txt, sx, sy - k * 14);
    } else if (f.k === 'line') {
      const [ax, ay] = scr(b, f.a.x, f.a.y), [bx, by] = scr(b, f.b.x, f.b.y);
      c.lineCap = 'round';
      for (const [col, lw] of [[f.col, 5], ['#fff', 1.6]]) {
        c.strokeStyle = col; c.lineWidth = lw;
        c.beginPath(); c.moveTo(ax, ay); c.lineTo((ax + bx) / 2 + (Math.random() - 0.5) * 10, (ay + by) / 2 + (Math.random() - 0.5) * 10); c.lineTo(bx, by); c.stroke();
      }
    }
    c.globalAlpha = 1;
  }
  c.restore();
}

// ---------- Entrada ----------
let drag = null;
function puntoLogico(cv, e) {
  const r = cv.getBoundingClientRect();
  return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
}
function celdaEn(p) {
  const lx = p.x - OX, ly = p.y - ME_Y;
  const c = Math.floor((lx - GX) / CW), r = Math.floor((ly - GY) / CH);
  if (c < 0 || c > 4 || r < 0 || r > 2) return -1;
  return r * 5 + c;
}
function soltar(a, c) {
  const b = M.yo;
  if (!fusionar(b, a, c)) { mover(b, a, c); sonar('mover'); }
}
function engancharEntrada(cv) {
  cv.addEventListener('pointerdown', (e) => {
    if (!M || M.over || M.pausa) return;
    const p = puntoLogico(cv, e), i = celdaEn(p), b = M.yo;
    if (i < 0) { b.sel = -1; return; }
    if (b.cells[i]) {
      drag = { from: i, x: p.x, y: p.y, sx: p.x, sy: p.y, moved: false };
      try { cv.setPointerCapture(e.pointerId); } catch (_) {}
    } else if (b.sel >= 0) { soltar(b.sel, i); b.sel = -1; }
  });
  cv.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const p = puntoLogico(cv, e);
    drag.x = p.x; drag.y = p.y;
    if (Math.hypot(p.x - drag.sx, p.y - drag.sy) > 8) drag.moved = true;
  });
  const fin = (e) => {
    if (!drag || !M) { drag = null; return; }
    const b = M.yo, p = puntoLogico(cv, e), i = celdaEn(p);
    if (!drag.moved) {
      if (b.sel >= 0 && b.sel !== drag.from && puedeFusionar(b.cells[b.sel], b.cells[drag.from])) { fusionar(b, b.sel, drag.from); b.sel = -1; }
      else b.sel = b.sel === drag.from ? -1 : drag.from;
    } else if (i >= 0 && i !== drag.from && b.cells[drag.from]) { soltar(drag.from, i); b.sel = -1; }
    drag = null;
  };
  cv.addEventListener('pointerup', fin);
  cv.addEventListener('pointercancel', () => { drag = null; });
}

// ---------- Sonido ----------
let audioCtx = null, sonidoOn = true;
function sonar(k) {
  if (!sonidoOn) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const notas = {
      invocar: [[520, 0.06], [780, 0.07]], fusion: [[440, 0.06], [660, 0.06], [990, 0.1]], mejora: [[600, 0.06], [900, 0.12]],
      mover: [[300, 0.04]], heroe: [[300, 0.1], [600, 0.1], [1200, 0.18]], jefe: [[180, 0.25], [140, 0.35]], ronda: [[660, 0.08], [880, 0.12]],
      golpe: [[120, 0.15]], jefeMuere: [[500, 0.08], [750, 0.08], [1000, 0.2]], victoria: [[523, 0.12], [659, 0.12], [784, 0.12], [1047, 0.3]],
      derrota: [[392, 0.18], [330, 0.18], [262, 0.35]], boton: [[700, 0.04]], cofre: [[400, 0.06], [800, 0.06], [1200, 0.15]]
    }[k];
    if (!notas) return;
    let t = audioCtx.currentTime;
    for (const [f, d] of notas) {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = k === 'golpe' || k === 'jefe' ? 'sawtooth' : 'triangle';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.07, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + d);
      o.connect(g); g.connect(audioCtx.destination);
      o.start(t); o.stop(t + d);
      t += d * 0.8;
    }
  } catch (_) {}
}
