# Duelo de Runas

Juego de defensa de torres de fusión contra un rival, con los dibujos de Reino de Torres. Gratis, sin anuncios ni compras.

**Jugar:** https://adrianezd.github.io/duelo-de-runas/

## Cómo se juega

- **Invocar** pone una tropa al azar de tu mazo en una casilla libre. Cada invocación cuesta 10 de maná más.
- **Fusionar**: arrastra una tropa sobre otra igual del mismo rango. Sale una tropa al azar del mazo con un rango más (máximo 7).
- Arrastrar a una casilla vacía o sobre otra tropa las cambia de sitio.
- **Cartas de abajo**: mejoran esa tropa durante la partida (5 niveles).
- Cada 40 segundos llega un **jefe** a los dos tableros. Matar un **Emisario** le manda un Enviado al rival.
- Gana quien conserve la **muralla** más tiempo.
- **Héroe**: habilidad que se carga sola y al gastar maná.
- Atajos: espacio invoca, 1 a 5 mejoran, H héroe, P pausa.

## Progreso

Copas y 5 arenas (cada una con su tablero de Reino), cofres con oro y cartas, niveles permanentes de carta (hasta 10), 15 tropas en 4 rarezas y 4 comandantes que se desbloquean con copas. Supervivencia en solitario con récord.

## Estructura

Sin build: `index.html` carga `js/data.js` (tropas, monstruos, jefes, héroes, tableros, arenas, cofres), `js/game.js` (motor, rival, dibujo en canvas, sonido) y `js/ui.js` (pantallas, guardado, cofres, marcador). Al tocar un css o js, sube su `?v=` en `index.html`, y `APP_VERSION` y `APP_NOTES` en `js/data.js`.

## Dibujos

Salen de Reino de Torres (copiados de `asedio/assets`, ya recortados): retratos en `assets/units`, poses de reposo y ataque en `assets/units/board`, monstruos y jefes en `assets/enemies`, comandantes, disparos e impactos en `assets/fx` y los cinco tableros en `assets/boards`. Los ids internos de `RUNAS` (ascua, escarcha...) se mantienen para no romper partidas; `img` dice qué tropa de Reino es. `ponerTablero` en `js/game.js` encaja cada tablero: su cuadrícula y su camino (`TABLEROS` en `js/data.js`) se escalan para caber en el lienzo. Si un dibujo no carga, se pinta la versión vectorial.
