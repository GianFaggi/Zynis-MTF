Lee `KB/developers/active.md` y ejecutá estos pasos:

El ejecutable de gh está en: `"C:\Program Files\GitHub CLI\gh.exe"`
El repo es: `GianFaggi/Zynis-MTF`

0. **Verificar OpenSpec**: corré `openspec list --json`. Si el change del ticket (sección `## OpenSpec Change` de `active.md`) sigue en `changes`, avisá al usuario que primero corra `/opsx:archive` (para que las delta specs pasen a `openspec/specs/`) y detené el proceso.

1. **Obtener datos del ticket**: leé la sección `## Ticket` (ej: `#5 - Feat - descripción`) y la sección `## GitHub Issue` para obtener la URL/número del issue.

2. **Cerrar el GitHub Issue**: ejecutá via Bash:
```bash
powershell.exe -Command "& 'C:\Program Files\GitHub CLI\gh.exe' issue close NUMERO --repo GianFaggi/Zynis-MTF --comment 'Cerrado: implementación completa.'"
```

3. **Construir nombre de archivo**: con la línea del `## Ticket` (ej: `#5 - Feat - descripción corta`), construí el nombre en kebab-case: `005-feat-descripcion-corta.md`. Minúsculas, sin caracteres especiales, guiones en lugar de espacios.

4. **Archivar**: creá `KB/developers/done/[nombre].md` con el contenido del ticket de `active.md` (todo **menos** la sección `## Postergado`, que no es de este ticket), agregando `Closed: YYYY-MM-DD` como primera línea con la fecha de hoy. Actualizá `## Status` a `✅ Cerrado — …` y reemplazá los pendientes ya resueltos por notas útiles para tickets futuros (si las hay).

5. **Resetear** `KB/developers/active.md` con este contenido, **conservando la sección `## Postergado` tal cual** si existe (si no existe, solo las dos primeras líneas):

```markdown
# Active Work

— (vacío, esperando próxima tarea)

## Postergado
[entradas postergadas existentes, sin cambios]
```

6. Recordale al usuario que ejecute `/clear` (Claude no puede ejecutarlo). **No** le pidas commitear `active.md` ni `done/`: son locales y están en `.gitignore`.
