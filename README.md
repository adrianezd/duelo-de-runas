# Duelo de Runas

Juego de defensa de torres de fusión contra un rival. Gratis, sin anuncios ni compras.

**Jugar:** https://adrianezd.github.io/duelo-de-runas/

## Cómo se juega

- **Invocar** pone una runa al azar de tu mazo en una casilla libre. Cada invocación cuesta 10 de maná más.
- **Fusionar**: arrastra una runa sobre otra igual con los mismos puntos. Sale una runa al azar del mazo con un punto más (máximo 7).
- Arrastrar a una casilla vacía o sobre otra runa las cambia de sitio.
- **Cartas de abajo**: mejoran esa runa durante la partida (5 niveles).
- Cada 40 segundos llega un **jefe** a los dos tableros. Matar un **Emisario** le manda un Enviado al rival.
- Gana quien conserve la **muralla** más tiempo.
- **Héroe**: habilidad que se carga sola y al gastar maná.
- Atajos: espacio invoca, 1 a 5 mejoran, H héroe, P pausa.

## Progreso

Copas y 6 arenas, cofres con oro y cartas, niveles permanentes de carta (hasta 10), 15 runas en 4 rarezas y 4 héroes que se desbloquean con copas. Supervivencia en solitario con récord.

## Estructura

Sin build: `index.html` carga `js/data.js` (runas, monstruos, jefes, héroes, arenas, cofres), `js/game.js` (motor, rival, dibujo en canvas, sonido) y `js/ui.js` (pantallas, guardado, cofres, marcador). Al tocar un css o js, sube su `?v=` en `index.html`, y `APP_VERSION` y `APP_NOTES` en `js/data.js`.
