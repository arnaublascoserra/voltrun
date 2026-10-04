# VOLTRUN

Arcade de laberintos neón para navegador. Controlas a **VOLT**, un núcleo de energía que recorre circuitos recogiendo chispas mientras esquiva a cuatro **Glitches**, cada uno con su propia IA. Con un **núcleo de sobrecarga** los Glitches se vuelven vulnerables y puedes encadenar combos.

Todos los personajes, nombres, mapas, gráficos y sonidos son originales: los gráficos se generan con formas en tiempo de ejecución y el audio se sintetiza con WebAudio. No hay ningún archivo de asset externo.

## Instalación y comandos

Requisitos: Node.js 20 o superior.

```bash
npm install
npm run dev        # servidor de desarrollo en http://localhost:5173
```

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo con recarga en caliente |
| `npm run build` | Typecheck + build de producción en `dist/` |
| `npm run preview` | Sirve el build de producción |
| `npm run typecheck` | Comprueba los tipos de TypeScript |
| `npm run lint` | ESLint (typescript-eslint) |
| `npm test` | Tests unitarios de la lógica (Vitest) |
| `npm run check` | Todo lo anterior seguido (lo que debe pasar antes de un commit) |

Atajos sólo en desarrollo: `?level=5` empieza en el nivel 5 y `?seed=123` fija la semilla aleatoria.

## Controles

| Acción | PC | Móvil / tablet |
| --- | --- | --- |
| Moverse | Flechas o WASD | Deslizar el dedo en cualquier parte de la pantalla |
| Pausa | P o Esc | Botón ⏸ |
| Silencio | M | Botón 🔊 |
| Menús | ↑/↓ + Enter, Esc para volver | Tocar los botones |

El movimiento tiene **input buffering**: si pulsas una dirección antes de llegar al cruce, el giro se guarda y se aplica al llegar. También se acepta un giro pulsado un poco tarde y puedes dar media vuelta al instante.

## Reglas

- **Chispa** +10 (el doble durante la sobrecarga), **Núcleo** +50 y activa la sobrecarga, **Prisma** +100 (están en zonas de riesgo).
- Atrapar Glitches durante una misma sobrecarga: 300 → 600 → 1200 → 2400, y +3000 si atrapas a los cuatro.
- Bonus al completar un nivel y vida extra cada 10.000 puntos.
- 3 vidas. Al completar el nivel 12 ganas la partida.

### Los Glitches

| Nombre | Rol | Comportamiento |
| --- | --- | --- |
| RAZE | Cazador | Va a tu casilla. Se enfurece (más rápido, sin retirarse) cuando quedan pocas chispas. |
| VEX | Interceptor | Apunta varias casillas por delante de ti. |
| NYX | Estratega | Ocupa los cruces cercanos hacia los que te diriges, en el lado contrario a RAZE. |
| FLUX | Impredecible | Alterna fases de persecución y de deriva aleatoria de duración variable. |

Estados: `PATROL` (se retiran a su esquina), `CHASE`, `VULNERABLE` y `RETURNING` (los ojos vuelven a casa antes de reaparecer). Internamente también existen `HOME` y `LEAVING` para la base. Una regla de separación evita que viajen apilados.

## Arquitectura

```
src/
  main.ts                 arranque: espera las fuentes y crea el juego
  game/
    createGame.ts         configuración de Phaser (escalado FIT, escenas)
    config/               TODO el equilibrio: balance, dificultad, enemigos, tema, layout
    core/                 Grid, movimiento por tiles (GridMover), direcciones — sin Phaser
    maps/                 mapas ASCII + parser/validador
    ai/                   objetivos por personalidad y elección de dirección
    entities/             Player y Enemy (lógica pura) + views.ts (sprites)
    systems/              GameWorld (simulación), GameSession (puntos/vidas),
                          AudioSystem (sintetizador), InputController (teclado/swipe)
    scenes/               Boot, Menu, HowToPlay, HighScores, Settings, Game, GameOver
    ui/                   texturas procedurales, render del laberinto, HUD, botones, efectos
    services/             localStorage seguro, ajustes, récords
      online/             contratos de la Fase 3 (cuentas, rankings, partida diaria)
    utils/                RNG con semilla, utilidades matemáticas
tests/                    tests de mapas, movimiento, IA, mundo y separación
```

Ideas clave:

- **La lógica no depende de Phaser.** `GameWorld` simula un nivel completo y produce una cola de eventos (`pickup`, `powerStart`, `enemyCaught`, `playerCaught`, `cleared`…). `GameScene` sólo lee el estado, dibuja y reacciona a los eventos con efectos y sonido. Por eso las reglas tienen tests.
- **Movimiento por tiles.** Cada entidad está en una casilla y avanza hacia la vecina; sólo puede girar en el centro de una casilla. El avance procesa varios centros en un mismo paso, así que funciona igual a cualquier velocidad o FPS.
- **Rendimiento.** El laberinto se dibuja una vez en una textura, los textos del HUD sólo se redibujan cuando cambian, las partículas y los textos flotantes usan pools, y todos los listeners se eliminan al cerrar cada escena.
- **Aleatoriedad con semilla.** Toda la aleatoriedad del juego pasa por `SeededRandom`, lo que permite partidas deterministas (por ejemplo, retos diarios).

## Cómo añadir un mapa

1. Crea `src/game/maps/miMapa.ts` con un `MapDefinition`. Leyenda:

   | Carácter | Significado |
   | --- | --- |
   | `#` | muro |
   | `.` | chispa |
   | `o` | núcleo de sobrecarga |
   | `$` | prisma (bonus) |
   | `=` | túnel: sin objeto, ralentiza a los enemigos y conecta con el borde opuesto |
   | `-` | puerta de la base enemiga (la casilla de encima debe ser transitable) |
   | `P` | salida del jugador |
   | `1`–`4` | salidas de los enemigos, dentro de la base |
   | espacio | suelo vacío |

2. Regístralo en `MAPS` dentro de `src/game/maps/index.ts`.
3. Añádelo a `MAP_PROGRESSION` o `MAP_CYCLE` en `src/game/config/difficulty.ts`.
4. Ejecuta `npm test`: el parser comprueba que las filas tengan la misma longitud, que haya exactamente un `P` y una puerta, que todos los objetos sean alcanzables y que los enemigos puedan salir de la base. Los tests recorren automáticamente todos los mapas registrados.

El tamaño del mapa es libre: el render calcula el tamaño de casilla para que quepa en pantalla (los actuales son de 21×25).

## Cómo modificar la dificultad

- `src/game/config/difficulty.ts` → `DIFFICULTY_CURVE`: cada parámetro va de `from` (nivel 1) a `to` (nivel `RAMP_LEVELS`). Incluye velocidad del jugador y de los enemigos, duración del power-up, inteligencia (probabilidad de usar el camino real en lugar de la línea recta), anticipación del Interceptor, radio del Estratega, agresividad de FLUX, huida inteligente de los vulnerables, oleadas PATROL/CHASE, salida escalonada de la base y furia del Cazador.
- `src/game/config/balance.ts`: puntos, combos, vidas, vida extra, ventana del input buffer, factores de velocidad por estado, tiempos de las transiciones y número de niveles.
- `src/game/config/enemies.ts`: nombre, color, esquina de patrulla y factor de velocidad de cada Glitch.

## Despliegue en Vercel

El proyecto es un sitio estático de Vite. Sube el repositorio a GitHub, impórtalo en Vercel y acepta la configuración detectada (build `npm run build`, salida `dist`). No hace falta ninguna variable de entorno.

## Fase 3 (online)

`src/game/services/online/types.ts` define los contratos de autenticación, ranking global/semanal/diario, perfiles y reto diario. Hoy se usa `offline.ts`, que se apoya en los récords locales. Para conectar Supabase basta con implementar esas mismas interfaces en un nuevo módulo y devolverlo desde `getOnlineServices()`. Las escenas no cambian.

## Tecnologías

TypeScript 6 · Phaser 3.90 · Vite 8 · Vitest 5 · ESLint 10 + typescript-eslint · WebAudio API
