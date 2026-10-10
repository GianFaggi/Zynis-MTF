Procesá la creación de un nuevo ticket de desarrollo en GitHub Issues.

Los argumentos recibidos son: `$ARGUMENTS`
El argumento es la descripción corta del problema o tarea.

El ejecutable de gh está en: `"C:\Program Files\GitHub CLI\gh.exe"`
El repo es: `GianFaggi/Zynis-MTF`

---

**Paso 1 — Verificar active.md**

Lee `KB/developers/active.md`. Si ya tiene un ticket activo (contenido distinto al mensaje `— (vacío, esperando próxima tarea)`), informá al usuario y detené el proceso.

---

**Paso 2 — Auto-asignar tipo**

Analizá la descripción y asigná el tipo más apropiado:

| Tipo | Cuándo usarlo |
|------|---------------|
| `Feat` | Nueva funcionalidad o pantalla |
| `Fix` | Corrección de un bug o comportamiento roto |
| `Refactor` | Mejora interna sin cambio de comportamiento visible |
| `Chore` | Configuración, dependencias, mantenimiento |
| `Docs` | Documentación, KBs, comentarios |
| `Style` | Cambios visuales/UI sin lógica nueva |

---

**Paso 3 — Confirmar y pedir detalles**

Mostrá al usuario:

```
Ticket propuesto: [Tipo] descripción corta
```

Luego pedile:
1. **Objetivo**: ¿Qué problema resuelve o qué agrega?
2. **Criterios de aceptación**: ¿Cuándo está terminado? (mínimo 2 ítems concretos)

Esperá la respuesta antes de continuar.

---

**Paso 4 — Crear el GitHub Issue**

Con los datos completos, escribí el body en un archivo temporal y usá `--body-file`. **Nunca uses `\n` en el string del body** — se renderiza literal en GitHub.

```bash
cat > /tmp/issue_body.md << 'EOF'
## Objetivo
OBJETIVO

## Criterios de Aceptación
- [ ] criterio1
- [ ] criterio2
EOF

"C:/Program Files/GitHub CLI/gh.exe" issue create --repo GianFaggi/Zynis-MTF --title "[TIPO] descripción corta" --body-file /tmp/issue_body.md
```

La salida incluye la URL del issue (ej: `https://github.com/GianFaggi/Zynis-MTF/issues/5`). Extraé el número del issue de la URL.

---

**Paso 5 — Escribir active.md**

Sobreescribí `KB/developers/active.md` con:

```markdown
# Active Work

## Ticket
#GH_NUMBER - Tipo - descripción corta

## GitHub Issue
URL_DEL_ISSUE

## Branch
{tipo}/{número}-{slug}

## OpenSpec Change
{número}-{slug} (sin crear — próximo paso: `/opsx:propose`)

## Objetivo
[objetivo]

## Criterios de Aceptación
- [ ] [criterio 1]
- [ ] [criterio 2]

## Contexto técnico
(por completar al arrancar el trabajo)

## Estado
🔄 En curso

## Archivos Modificados
(vacío)

## Pendientes
(por completar)
```

Confirmá al usuario con la URL del issue y sugerí `/opsx:propose` como próximo paso.
