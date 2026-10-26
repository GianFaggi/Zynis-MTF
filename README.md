# MTF By Zynis — Más Tareas Fáciles

Un anotador con forma de **escritorio**. Escribís tarjetas, las dejás donde quieras y, cuando terminás algo, lo tirás al **frasco**: se va llenando y te muestra todo lo que hiciste.

Es parte de la familia **Zynis**. Funciona en el celu y en la PC, se instala como app (PWA) y anda sin internet.

## Abrí MTF

**[mtf.zynis.com.ar](https://mtf.zynis.com.ar)** — abrila en el celu o en la PC. La primera vez te recibe una tarjeta de bienvenida que te enseña a usarla.

Conviene **instalarla** (Ajustes → Instalar la app): se abre como una app, anda sin internet y tus notas están más seguras. En iPhone, Safari puede borrar los datos de las páginas que no abrís hace un tiempo, pero no los de las apps instaladas.

## La idea

- **Un solo escritorio, sin cajas.** Las áreas (de entrada Trabajo, Vida y Recordar) son zonas del escritorio, no pestañas ni listas. Cada tarjeta va donde la soltás.
- **Tarjetas simples.** Un título, texto libre y, si querés, una lista para tachar.
- **El frasco de logros.** Las tarjetas terminadas van al frasco. En **Mis logros** ves cuántas cosas hiciste en la semana, sin rachas ni culpa: los días tranquilos también cuentan.
- **Tuyo y offline.** Tus notas se guardan en tu navegador. Más adelante, un backend .NET va a sincronizar el celu y la PC.
- **Español e inglés.**

## Qué podés hacer

- Mover el escritorio, acercar y alejar: con el dedo (pellizco, mantener apretado para arrastrar) o con mouse y trackpad. De lejos se ven solo los títulos.
- Crear, editar, fijar y buscar tarjetas; **Ordenar** las acomoda dentro de su área.
- Armar tus propias áreas: crear, renombrar, cambiar de color, mover, agrandar y borrar. **Acomodar áreas** las pone en fila, en tabla o en estrella, y podés guardar tu disposición.
- Llevar las tarjetas terminadas al frasco, y si querés, tener un **frasco por área**.
- Elegir tema claro u oscuro, o el del sistema.

## Tus datos

- **No hay cuentas ni servidor.** Tus notas quedan solo en ese dispositivo y en ese navegador; MTF no las manda a ningún lado.
- **Para pasarlas a otro dispositivo**, usá Ajustes → **Exportar copia** y después **Importar copia** en el otro. Importar reemplaza todo lo que había.
- La copia es un archivo `.json` de texto: quien lo tenga puede leer tus notas. Guardalo en un lugar tuyo.

## Stack

React · TypeScript · Vite · Tailwind CSS v4 · @use-gesture/react · Zustand · vite-plugin-pwa · Vitest · Playwright · Vercel

Detalle y motivos en [KB/frontend/stack.md](KB/frontend/stack.md). Las decisiones importantes están en [docs/adr/](docs/adr/) y lo que viene en el [Roadmap](KB/roadmap.md).

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

## Cómo se trabaja

Cada cambio sigue el mismo flujo: issue en GitHub → propuesta con [OpenSpec](https://github.com/Fission-AI/OpenSpec) (`openspec/`) → implementación → archivo de la propuesta → PR con CI en verde. El contexto del proyecto está en [CLAUDE.md](CLAUDE.md) y en [KB/](KB/).

La maqueta con la que empezó el diseño sigue en [`design/mtf-mockup-desk.html`](design/mtf-mockup-desk.html): es un solo archivo, se abre en el navegador.

## Licencia

[MIT](LICENSE)
