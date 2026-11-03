// Duelo de Runas: datos del juego (tropas, monstruos, jefes, héroes, arenas y cofres).
// Los ids internos (ascua, escarcha...) se mantienen para no romper las partidas guardadas;
// `img` es el dibujo de Reino de Torres que usa cada uno.
const APP_VERSION = '1.1.0';
const APP_NOTES = [
  ['1.1.0', [
    'Ahora con los dibujos de Reino de Torres: tropas con pose de ataque, monstruos, jefes, comandantes y tableros.',
    'Cada arena tiene su tablero: Santuario Mágico, Ruinas de Piedra, Pantano Tóxico, Río de Lava y Cielo Estelar.',
    'Los héroes pasan a ser Brann, Aria, Torvald y Merlo.'
  ]],
  ['1.0.0', [
    'Primera versión.',
    'Duelo contra un rival con dos tableros, envíos de monstruos y muralla.',
    'Supervivencia en solitario con récord de ronda.',
    '15 tropas, 4 héroes, 5 jefes, arenas, cofres y colección con niveles.'
  ]]
];

const RAREZAS = {
  comun: { nombre: 'Común', color: '#a9b4c4' },
  rara: { nombre: 'Rara', color: '#4aa3ff' },
  epica: { nombre: 'Épica', color: '#b46bff' },
  legendaria: { nombre: 'Legendaria', color: '#ffb534' }
};

// dmg: daño base por golpe. vel: segundos entre ataques. arena: desde qué arena sale en cofres.
// tiro: proyectil (assets/fx). imp: impacto. gira: el proyectil da vueltas en vez de apuntar.
const RUNAS = {
  ascua: { nombre: 'Brasa', titulo: 'Piromante', img: 'brasa', rareza: 'comun', arena: 0, color: '#ff6a3d', dmg: 20, vel: 0.9, tiro: 'fuego-bola', imp: 'fuego-impacto',
    desc: 'Lanza bolas de fuego que salpican la mitad del daño a los monstruos de alrededor.' },
  escarcha: { nombre: 'Nívea', titulo: 'Hechicera de Escarcha', img: 'nivea', rareza: 'comun', arena: 0, color: '#5fd0ff', dmg: 12, vel: 1.0, tiro: 'hielo-bola', imp: 'hielo-impacto',
    desc: 'Frena al monstruo que golpea. Cuanto más rango, más frena. A los jefes, la mitad.' },
  saeta: { nombre: 'Halcón', titulo: 'Francotirador', img: 'halcon', rareza: 'comun', arena: 0, color: '#e8d27a', dmg: 30, vel: 1.2, tiro: 'halcon-tiro', imp: 'bala-impacto',
    desc: 'Dispara siempre al monstruo con más vida del tablero.' },
  chispa: { nombre: 'Volta', titulo: 'Ingeniera Tesla', img: 'volta', rareza: 'comun', arena: 0, color: '#ffe14d', dmg: 14, vel: 0.8, tiro: 'rayo-bola', imp: 'rayo-impacto',
    desc: 'El rayo salta a tantos monstruos extra como su rango, perdiendo fuerza en cada salto.' },
  ponzona: { nombre: 'Mirra', titulo: 'Alquimista', img: 'mirra', rareza: 'rara', arena: 0, color: '#7be36b', dmg: 8, vel: 1.0, tiro: 'veneno-bola', imp: 'veneno-impacto', gira: true,
    desc: 'Envenena: cada Mirra suma su propio veneno, que hace daño durante 4 segundos.' },
  yunque: { nombre: 'Melodía', titulo: 'Bardo', img: 'melodia', rareza: 'rara', arena: 0, color: '#c08a5a', dmg: 0, vel: 0,
    desc: 'No ataca. Las tropas que tiene arriba, abajo y a los lados atacan más rápido.' },
  caliz: { nombre: 'Doblón', titulo: 'Mercader', img: 'doblon', rareza: 'rara', arena: 0, color: '#ff7bc6', dmg: 10, vel: 1.1, tiro: 'moneda', imp: 'bala-impacto', gira: true,
    desc: 'Cada 6 segundos te da maná según su rango y su mejora.' },
  espina: { nombre: 'Frida', titulo: 'Druida de Espinas', img: 'frida', rareza: 'rara', arena: 1, color: '#3fbf8f', dmg: 18, vel: 1.0, tiro: 'frida-tiro', imp: 'veneno-impacto',
    desc: 'Hace el doble de daño a monstruos frenados, envenenados o aturdidos.' },
  campana: { nombre: 'Marea', titulo: 'Sacerdotisa del Oleaje', img: 'marea', rareza: 'epica', arena: 1, color: '#f2a93b', dmg: 14, vel: 5.0,
    desc: 'Su ola golpea a todos los monstruos del tablero a la vez y los aturde un instante.' },
  lanza: { nombre: 'Midas', titulo: 'Rey Dorado', img: 'midas', rareza: 'epica', arena: 1, color: '#d9dde8', dmg: 42, vel: 1.5, tiro: 'moneda', imp: 'bala-impacto', gira: true,
    desc: 'Sus monedas atraviesan: golpean al primero y a todos los que van justo detrás.' },
  semilla: { nombre: 'Titán', titulo: 'Gólem del Bosque', img: 'titan', rareza: 'epica', arena: 2, color: '#9bd44a', dmg: 16, vel: 0.9, tiro: 'titan-tiro', imp: 'canon-impacto',
    desc: 'Crece mientras sigue en su casilla: hasta el triple de daño. Moverlo o fusionarlo lo reinicia.' },
  verdugo: { nombre: 'Seren', titulo: 'Guardiana Astral', img: 'seren', rareza: 'epica', arena: 2, color: '#d6455a', dmg: 28, vel: 1.3, tiro: 'seren-tiro', imp: 'luz-impacto',
    desc: 'Remata al instante a los monstruos con poca vida. A los jefes heridos les pega el doble.' },
  golem: { nombre: 'Valka', titulo: 'General de Acero', img: 'valka', rareza: 'legendaria', arena: 3, color: '#8f9bb3', dmg: 8, vel: 1.6, tiro: 'valka-tiro', imp: 'bala-impacto',
    desc: 'Su daño crece con la suma de rangos de todas tus tropas en el tablero.' },
  dragon: { nombre: 'Ígnea', titulo: 'Ave Fénix', img: 'fenix', rareza: 'legendaria', arena: 3, color: '#ff4f7b', dmg: 55, vel: 2.0, tiro: 'fenix-tiro', imp: 'fuego-impacto',
    desc: 'Llamarada que quema a todo lo que hay alrededor del objetivo.' },
  reloj: { nombre: 'Cronos', titulo: 'Relojero', img: 'cronos', rareza: 'legendaria', arena: 4, color: '#c9a6ff', dmg: 0, vel: 0,
    desc: 'No ataca. Frena a todos los monstruos de tu tablero. A los jefes, la mitad.' }
};
const RUNA_IDS = Object.keys(RUNAS);

// tam: tamaño del dibujo en px del tablero. aura: brillo de color alrededor.
const MONSTRUOS = {
  rata: { nombre: 'Gelatina', img: 'blob', hp: 1, spd: 40, r: 9, tam: 26, color: '#9ad46a', mana: 8, muro: 1 },
  lobo: { nombre: 'Espectro', img: 'ghost', hp: 0.6, spd: 70, r: 8, tam: 24, color: '#9b7bff', mana: 8, muro: 1 },
  ogro: { nombre: 'Ogro', img: 'brute', hp: 4, spd: 27, r: 13, tam: 36, color: '#8a6a4a', mana: 25, muro: 2 },
  emisario: { nombre: 'Emisario', img: 'orco', hp: 2, spd: 36, r: 10, tam: 30, color: '#b46bff', mana: 20, muro: 1, aura: '#c58bff' },
  enviado: { nombre: 'Enviado', img: 'rocoso', hp: 3, spd: 42, r: 11, tam: 32, color: '#6b2fbf', mana: 15, muro: 2, aura: '#ff5fd2' }
};

const JEFES = {
  coloso: { nombre: 'Coloso', img: 'coloso', color: '#a0784a', cada: 6, desc: 'Pisotea y aturde dos tropas durante 3 segundos.' },
  nigromante: { nombre: 'Nigromante', img: 'nigro', color: '#5e8f6a', cada: 5, desc: 'Levanta dos gelatinas a su lado.' },
  sombra: { nombre: 'Espectro Rey', img: 'ghost', color: '#3a3550', cada: 4, desc: 'Salta hacia delante y se vuelve intocable un segundo.' },
  devorador: { nombre: 'Dragón Carmesí', img: 'dragon', color: '#a33a3a', cada: 8, desc: 'Quema una tropa y le baja un rango.' },
  hechicera: { nombre: 'Señor Gélido', img: 'gelido', color: '#4a6adf', cada: 5, desc: 'Cambia de sitio dos tropas y congela una 2 segundos.' }
};
const JEFE_IDS = Object.keys(JEFES);

const HEROES = {
  ignia: { nombre: 'Brann', img: 'brann', copas: 0, color: '#ff6a3d', hab: 'Meteoros', fx: 'meteoro',
    desc: 'Quita la mitad de la vida a todos los monstruos y un 8 % a los jefes.' },
  tempo: { nombre: 'Aria', img: 'aria', copas: 200, color: '#5fd0ff', hab: 'Ventisca', fx: 'ventisca',
    desc: 'Congela a todos los monstruos 3,5 segundos. A los jefes, 1,5.' },
  forja: { nombre: 'Torvald', img: 'torvald', copas: 500, color: '#c08a5a', hab: 'Forja', fx: 'torvald-forja',
    desc: 'Sube un rango a tus dos tropas de rango más bajo.' },
  dora: { nombre: 'Merlo', img: 'merlo', copas: 900, color: '#ffd23f', hab: 'Marea de maná', fx: 'ganancia-mana',
    desc: 'Te da maná al momento. Más cuanto más avanzada la partida.' }
};
const HEROE_IDS = Object.keys(HEROES);

/* Tableros de Reino de Torres. Coordenadas en píxeles de la imagen:
   g = cuadrícula de 5 por 3, way = camino de los monstruos. */
const TABLEROS = {
  magico: { iw: 1248, ih: 832, g: [267, 215, 979, 590], way: [[190, 664], [184, 610], [184, 173], [1064, 173], [1064, 610], [1058, 660]] },
  roca2: { iw: 1248, ih: 832, g: [315, 222, 935, 535], way: [[232, 830], [222, 650], [218, 184], [1045, 184], [1050, 650], [965, 830]] },
  veneno2: { iw: 1248, ih: 832, g: [245, 210, 1000, 578], way: [[192, 660], [200, 615], [198, 175], [1058, 175], [1060, 615], [1066, 660]] },
  lava4: { iw: 1248, ih: 832, g: [327, 244, 918, 502], way: [[362, 622], [362, 660], [208, 660], [208, 160], [1022, 160], [1022, 660], [878, 660], [878, 622]] },
  estelar: { iw: 1024, ih: 559, g: [268, 165, 757, 380], way: [[105, 445], [195, 420], [195, 122], [850, 122], [850, 420], [905, 462]] }
};

const ARENAS = [
  { nombre: 'Santuario Mágico', copas: 0, color: '#4a3fbf', tablero: 'magico' },
  { nombre: 'Ruinas de Piedra', copas: 300, color: '#6a6a7f', tablero: 'roca2' },
  { nombre: 'Pantano Tóxico', copas: 700, color: '#3f8f4f', tablero: 'veneno2' },
  { nombre: 'Río de Lava', copas: 1200, color: '#c4502f', tablero: 'lava4' },
  { nombre: 'Cielo Estelar', copas: 1800, color: '#7a4fd1', tablero: 'estelar' }
];

// Copias y oro para pasar de nivel n a n+1 (nivel máximo 10).
const NIVEL_COPIAS = [2, 4, 10, 20, 40, 80, 150, 300, 500];
const NIVEL_ORO = [20, 50, 150, 400, 800, 1600, 3200, 6000, 10000];
const NIVEL_MAX = 10;

// Coste de mejorar una tropa durante la partida (de nivel 1 a 2, 2 a 3...).
const MEJORA_COSTE = [100, 250, 500, 900];

const COFRES = {
  madera: { nombre: 'Cofre de madera', color: '#a8743f', oro: [15, 30], cartas: 6 },
  plata: { nombre: 'Cofre de plata', color: '#b9c4d4', oro: [30, 60], cartas: 12 },
  oro: { nombre: 'Cofre de oro', color: '#ffc83d', oro: [80, 140], cartas: 30 },
  rey: { nombre: 'Cofre del rey', color: '#d65bff', oro: [200, 320], cartas: 70 }
};

const NOMBRES_BOT = ['Mirla', 'Torcuato', 'Nube', 'Bruma', 'Ramiro', 'Tesla', 'Gaspar', 'Lirio', 'Brasero', 'Quima',
  'Olmo', 'Nerea', 'Kiko', 'Vega', 'Celsa', 'Tadeo', 'Runa', 'Pimpi', 'Abril', 'Sauce', 'Zarza', 'Mateo'];

const MAZO_INICIAL = ['ascua', 'escarcha', 'saeta', 'chispa', 'ponzona'];
const CARTAS_INICIALES = ['ascua', 'escarcha', 'saeta', 'chispa', 'ponzona', 'yunque', 'caliz'];
const COLOR_RANGO = ['#000', '#c9d2e3', '#6fd86a', '#4fb3ff', '#b57bff', '#ffb02e', '#ff5a5a', '#ffffff'];
