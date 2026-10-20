# MTF By Zynis — Más Tareas Fáciles

Un anotador con forma de **escritorio**. Escribís tarjetas, las dejás donde quieras y, cuando terminás algo, lo tirás al **frasco**: se va llenando y te muestra todo lo que hiciste.

Es parte de la familia **Zynis**. Funciona en el celu y en la PC, se instala como app (PWA) y anda sin internet.

> 🚧 **En construcción.** La base técnica ya está (etapa 1); el escritorio, el frasco y las copias de seguridad llegan por etapas (ver [Roadmap](KB/roadmap.md)).

## La idea

- **Un solo escritorio, sin cajas.** Trabajo, Vida y Recordar son zonas del escritorio, no pestañas ni listas. Cada tarjeta va donde la soltás.
- **Tarjetas simples.** Un título, texto libre y, si querés, una lista para tachar.
- **El frasco de logros.** Las tarjetas terminadas van al frasco. En **Mis logros** ves cuántas cosas hiciste en la semana, sin rachas ni culpa: los días tranquilos también cuentan.
- **Tuyo y offline.** En esta primera versión tus notas se guardan en tu navegador. Más adelante, un backend .NET va a sincronizar el celu y la PC.
- **Español e inglés.**

## Abrí MTF

**[mtf.zynis.com.ar](https://mtf.zynis.com.ar)** — abrila en el celu o en la PC e instalala desde el navegador para usarla sin internet. Tus notas quedan en ese dispositivo; para pasarlas a otro, usá Ajustes → Exportar copia / Importar copia.

## Probá la maqueta

Abrí [`design/mtf-mockup-desk.html`](design/mtf-mockup-desk.html) en el navegador (es un solo archivo, no hace falta instalar nada):

- Arrastrá tarjetas a donde quieras (en el celu: mantené apretada la tarjeta).
- Hacé zoom con el pellizco o `Ctrl` + rueda; de lejos se ven solo los títulos.
- Tachá lo que falta de "Viaje a Córdoba" y llevala al frasco.

## Stack

React · TypeScript · Vite · Tailwind CSS v4 · @use-gesture/react · Zustand · vite-plugin-pwa · Vitest · Playwright · Vercel

Detalle y motivos en [KB/frontend/stack.md](KB/frontend/stack.md). Las decisiones importantes están en [docs/adr/](docs/adr/).

## Correr el proyecto

Necesitás Node 22 o más nuevo.

```bash
npm install
npx playwright install chromium   # una sola vez: el navegador de los tests e2e

npm run dev        # servidor de desarrollo (http://localhost:5173)
npm run lint       # ESLint
npm test           # tests (Vitest)
npm run test:e2e   # tests en navegador real, celu y PC (Playwright)
npm run build      # build de producción en dist/
npm run preview    # sirve el build; ahí funciona el modo sin internet
```

Hoy la app abre una pantalla de papel con la marca y los Ajustes (idioma ES · EN). El escritorio llega en la etapa 2.

## Cómo se trabaja

Cada cambio sigue el mismo flujo: issue en GitHub → propuesta con [OpenSpec](https://github.com/Fission-AI/OpenSpec) (`openspec/`) → implementación → archivo de la propuesta. El contexto del proyecto está en [CLAUDE.md](CLAUDE.md) y en [KB/](KB/).

## Licencia

[MIT](LICENSE)
