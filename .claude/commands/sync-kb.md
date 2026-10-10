Sincronizá los Knowledge Bases del proyecto con el estado actual del código.

---

**Paso 1 — Leer el estado actual**

Leé en paralelo:
- Todos los KBs: `KB/frontend/stack.md`, `KB/frontend/architecture.md`, `KB/frontend/desk.md`, `KB/frontend/design-system.md`, `KB/frontend/storage.md`, `KB/frontend/pwa.md`, `KB/frontend/testing.md`, `KB/roadmap.md`
- El glosario de dominio: `GLOSSARY.md`
- Las decisiones: `docs/adr/*.md`
- Archivos clave del código: `src/types/index.ts`, `src/lib/storage.ts`, el store de Zustand (`src/store/`)
- Listá `src/desk/`, `src/components/`, `src/hooks/`, `src/i18n/` para ver qué existe

---

**Paso 2 — Detectar divergencias**

Compará lo documentado contra lo que existe en el código. Buscá específicamente:

- Tipos, interfaces o campos en `index.ts` que no estén documentados en `storage.md` o `architecture.md`
- Gestos, coordenadas o comportamientos del escritorio (pan, zoom, arrastre, frasco) que no coincidan con `desk.md`
- Tokens de diseño en `src/index.css` (`@theme`) que no estén en `design-system.md`
- Componentes, hooks o acciones del store que existan pero no estén mencionados
- Items del roadmap que ya fueron implementados y deben marcarse como ✅
- Cualquier decisión técnica tomada que contradiga lo documentado o un ADR

---

**Paso 3 — Actualizar los KBs afectados**

Editá solo los KBs donde hay divergencias reales. No reescribas secciones que ya están correctas.

Para cada KB modificado, reportá brevemente qué cambió y por qué.

---

**Paso 4 — Reportar**

Al terminar, listá:
- KBs actualizados y qué se cambió
- KBs que estaban al día (sin cambios)
