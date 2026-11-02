// Duelo de Runas: datos del juego (runas, monstruos, jefes, héroes, arenas y cofres).
const APP_VERSION = '1.0.0';
const APP_NOTES = [
  ['1.0.0', [
    'Primera versión.',
    'Duelo contra un rival con dos tableros, envíos de monstruos y muralla.',
    'Supervivencia en solitario con récord de ronda.',
    '15 runas, 4 héroes, 5 jefes, 6 arenas, cofres y colección con niveles.'
  ]]
];

const RAREZAS = {
  comun: { nombre: 'Común', color: '#a9b4c4' },
  rara: { nombre: 'Rara', color: '#4aa3ff' },
  epica: { nombre: 'Épica', color: '#b46bff' },
  legendaria: { nombre: 'Legendaria', color: '#ffb534' }
};

// dmg: daño base por golpe. vel: segundos entre ataques. arena: desde qué arena sale en cofres.
const RUNAS = {
  ascua: { nombre: 'Ascua', rareza: 'comun', arena: 0, color: '#ff6a3d', dmg: 20, vel: 0.9,
    desc: 'Lanza bolas de fuego que salpican la mitad del daño a los monstruos de alrededor.' },
  escarcha: { nombre: 'Escarcha', rareza: 'comun', arena: 0, color: '#5fd0ff', dmg: 12, vel: 1.0,
    desc: 'Ralentiza al monstruo que golpea. Cuanto más rango, más frena. A los jefes, la mitad.' },
  saeta: { nombre: 'Saeta', rareza: 'comun', arena: 0, color: '#e8d27a', dmg: 30, vel: 1.2,
    desc: 'Dispara siempre al monstruo con más vida del tablero.' },
  chispa: { nombre: 'Chispa', rareza: 'comun', arena: 0, color: '#ffe14d', dmg: 14, vel: 0.8,
    desc: 'El rayo salta a tantos monstruos extra como su rango, perdiendo fuerza en cada salto.' },
  ponzona: { nombre: 'Ponzoña', rareza: 'rara', arena: 0, color: '#7be36b', dmg: 8, vel: 1.0,
    desc: 'Envenena: cada Ponzoña suma su propio veneno, que hace daño durante 4 segundos.' },
  yunque: { nombre: 'Yunque', rareza: 'rara', arena: 0, color: '#c08a5a', dmg: 0, vel: 0,
    desc: 'No ataca. Las runas que tiene arriba, abajo y a los lados atacan más rápido.' },
  caliz: { nombre: 'Cáliz', rareza: 'rara', arena: 0, color: '#ff7bc6', dmg: 10, vel: 1.1,
    desc: 'Cada 6 segundos te da maná según su rango y su mejora.' },
  espina: { nombre: 'Espina', rareza: 'rara', arena: 1, color: '#3fbf8f', dmg: 18, vel: 1.0,
    desc: 'Hace el doble de daño a monstruos frenados, envenenados o aturdidos.' },
  campana: { nombre: 'Campana', rareza: 'epica', arena: 1, color: '#f2a93b', dmg: 14, vel: 5.0,
    desc: 'Repica y golpea a todos los monstruos del tablero a la vez, aturdiéndolos un instante.' },
  lanza: { nombre: 'Lanza', rareza: 'epica', arena: 1, color: '#d9dde8', dmg: 42, vel: 1.5,
    desc: 'Atraviesa: golpea al primero y a todos los que van justo detrás.' },
  semilla: { nombre: 'Semilla', rareza: 'epica', arena: 2, color: '#9bd44a', dmg: 16, vel: 0.9,
    desc: 'Crece mientras sigue en su casilla: hasta el triple de daño. Moverla o fusionarla la reinicia.' },
  verdugo: { nombre: 'Verdugo', rareza: 'epica', arena: 2, color: '#d6455a', dmg: 28, vel: 1.3,
    desc: 'Remata al instante a los monstruos con poca vida. A los jefes heridos les pega el doble.' },
  golem: { nombre: 'Gólem', rareza: 'legendaria', arena: 3, color: '#8f9bb3', dmg: 8, vel: 1.6,
    desc: 'Su daño crece con la suma de rangos de todas tus runas en el tablero.' },
  dragon: { nombre: 'Dragón', rareza: 'legendaria', arena: 3, color: '#ff4f7b', dmg: 55, vel: 2.0,
    desc: 'Aliento de fuego que quema a todo lo que hay alrededor del objetivo.' },
  reloj: { nombre: 'Reloj', rareza: 'legendaria', arena: 4, color: '#c9a6ff', dmg: 0, vel: 0,
    desc: 'No ataca. Frena a todos los monstruos de tu tablero. A los jefes, la mitad.' }
};
const RUNA_IDS = Object.keys(RUNAS);

const MONSTRUOS = {
  rata: { nombre: 'Rata', hp: 1, spd: 40, r: 9, color: '#c7b8a1', mana: 8, muro: 1 },
  lobo: { nombre: 'Lobo', hp: 0.6, spd: 70, r: 8, color: '#8fa3b8', mana: 8, muro: 1 },
  ogro: { nombre: 'Ogro', hp: 4, spd: 27, r: 13, color: '#8a6a4a', mana: 25, muro: 2 },
  emisario: { nombre: 'Emisario', hp: 2, spd: 36, r: 10, color: '#b46bff', mana: 20, muro: 1 },
  enviado: { nombre: 'Enviado', hp: 3, spd: 42, r: 11, color: '#6b2fbf', mana: 15, muro: 2 }
};

const JEFES = {
  coloso: { nombre: 'Coloso', color: '#a0784a', cada: 6, desc: 'Pisotea y aturde dos runas durante 3 segundos.' },
  nigromante: { nombre: 'Nigromante', color: '#5e8f6a', cada: 5, desc: 'Levanta dos ratas a su lado.' },
  sombra: { nombre: 'Sombra', color: '#3a3550', cada: 4, desc: 'Salta hacia delante y se vuelve intocable un segundo.' },
  devorador: { nombre: 'Devorador', color: '#a33a3a', cada: 8, desc: 'Muerde una runa y le baja un rango.' },
  hechicera: { nombre: 'Hechicera', color: '#4a6adf', cada: 5, desc: 'Cambia de sitio dos runas y deja una muda 2 segundos.' }
};
const JEFE_IDS = Object.keys(JEFES);

const HEROES = {
  ignia: { nombre: 'Ignia', copas: 0, color: '#ff6a3d', hab: 'Lluvia de meteoros',
    desc: 'Quita la mitad de la vida a todos los monstruos y un 8 % a los jefes.' },
  tempo: { nombre: 'Tempo', copas: 200, color: '#5fd0ff', hab: 'Alto el tiempo',
    desc: 'Congela a todos los monstruos 3,5 segundos. A los jefes, 1,5.' },
  forja: { nombre: 'Forja', copas: 500, color: '#c08a5a', hab: 'Temple',
    desc: 'Sube un rango a tus dos runas de rango más bajo.' },
  dora: { nombre: 'Dora', copas: 900, color: '#ffd23f', hab: 'Bolsa de oro',
    desc: 'Te da maná al momento. Más cuanto más avanzada la partida.' }
};
const HEROE_IDS = Object.keys(HEROES);

const ARENAS = [
  { nombre: 'Prado', copas: 0, color: '#3f8f4f' },
  { nombre: 'Cripta', copas: 300, color: '#6a5a8f' },
  { nombre: 'Volcán', copas: 700, color: '#c4502f' },
  { nombre: 'Glaciar', copas: 1200, color: '#4fa0c8' },
  { nombre: 'Ciudadela', copas: 1800, color: '#c8a24f' },
  { nombre: 'Abismo', copas: 2600, color: '#2a1f4f' }
];

// Copias y oro para pasar de nivel n a n+1 (nivel máximo 10).
const NIVEL_COPIAS = [2, 4, 10, 20, 40, 80, 150, 300, 500];
const NIVEL_ORO = [20, 50, 150, 400, 800, 1600, 3200, 6000, 10000];
const NIVEL_MAX = 10;

// Coste de mejorar una runa durante la partida (de nivel 1 a 2, 2 a 3...).
const MEJORA_COSTE = [100, 250, 500, 900];

const COFRES = {
  madera: { nombre: 'Cofre de madera', color: '#a8743f', oro: [15, 30], cartas: 6 },
  plata: { nombre: 'Cofre de plata', color: '#b9c4d4', oro: [30, 60], cartas: 12 },
  oro: { nombre: 'Cofre de oro', color: '#ffc83d', oro: [80, 140], cartas: 30 },
  rey: { nombre: 'Cofre del rey', color: '#d65bff', oro: [200, 320], cartas: 70 }
};

const NOMBRES_BOT = ['Mirla', 'Torcuato', 'Nube', 'Bruma', 'Ramiro', 'Tesla', 'Gaspar', 'Lirio', 'Brasa', 'Quima',
  'Olmo', 'Nerea', 'Kiko', 'Vega', 'Celsa', 'Tadeo', 'Runa', 'Pimpi', 'Abril', 'Sauce', 'Zarza', 'Mateo'];

const MAZO_INICIAL = ['ascua', 'escarcha', 'saeta', 'chispa', 'ponzona'];
const CARTAS_INICIALES = ['ascua', 'escarcha', 'saeta', 'chispa', 'ponzona', 'yunque', 'caliz'];
