Procesá la creación de un nuevo ticket de desarrollo en GitHub Issues, explorando la idea antes de escribirlo.

Los argumentos recibidos son: `$ARGUMENTS`
El argumento es la idea, el problema o la tarea, dicho como le salga al usuario.

El ejecutable de gh está en: `"C:\Program Files\GitHub CLI\gh.exe"`
El repo es: `GianFaggi/Zynis-MTF`

---

**Paso 1 — Verificar active.md**

Lee `KB/developers/active.md`. Si ya tiene un ticket activo (contenido distinto al mensaje `— (vacío, esperando próxima tarea)`), informá al usuario y detené el proceso.

---

**Paso 2 — Explorar (postura de `/opsx:explore`)**

Antes de escribir nada, explorá la idea con la postura de [.claude/commands/opsx/explore.md](opsx/explore.md): sos un compañero de pensamiento, no un formulario. Por qué: el ticket sale mejor cuando el alcance se descubre mirando el código y las specs, en lugar de pedirle al usuario un Objetivo y Criterios en frío.

- **Leé antes de preguntar.** CLAUDE.md, el KB del área, las specs vivas que toca (`openspec list --specs`, `openspec show "<spec>" --type spec`), `GLOSSARY.md`, los ADRs relevantes y el código. No le preguntes al usuario lo que podés verificar vos.
- **Una pregunta enfocada a la vez**, diciendo por qué importa y qué decisión destraba. Recomendá cuando haya evidencia; no inventes prioridades del usuario.
- **Diagramas ASCII** cuando ayuden a ver el problema.
- **Llevá el registro en la conversación**: decisiones confirmadas, defaults propuestos y preguntas abiertas, separados.
- **No escribas nada en este paso**: ni código, ni archivos, ni el issue, ni `openspec new change`. El change lo crea `/opsx:propose` después.

Pará de explorar cuando el alcance esté claro para crear el ticket: qué agrega o corrige, qué queda afuera y cómo se sabe que está terminado. No hace falta agotar cada rama; lo fino del diseño se resuelve en `/opsx:propose`.

---

**Paso 3 — Proponer el ticket y confirmar**

Con lo explorado, asigná el tipo:

| Tipo | Cuándo usarlo |
|------|---------------|
| `Feat` | Nueva funcionalidad o pantalla |
| `Fix` | Corrección de un bug o comportamiento roto |
| `Refactor` | Mejora interna sin cambio de comportamiento visible |
| `Chore` | Configuración, dependencias, mantenimiento |
| `Docs` | Documentación, KBs, comentarios |
| `Style` | Cambios visuales/UI sin lógica nueva |

Mostrá el borrador completo, en español:

```
Ticket propuesto: [Tipo] descripción corta
Branch: {tipo}/{número}-{slug}   (el número lo da GitHub al crearlo)

## Objetivo
...

## Criterios de Aceptación
- [ ] ...   (mínimo 2, concretos y verificables)

Fuera de alcance: ...
```

Preguntá con un sí/no directo si se crea así, y esperá la respuesta en un mensaje aparte. Si pide cambios, ajustá y volvé a mostrar el borrador.

---

**Paso 4 — Crear el GitHub Issue**

Con el borrador confirmado, escribí el body en un archivo temporal (en el scratchpad de la sesión) y usá `--body-file`. **Nunca uses `\n` en el string del body**: se renderiza literal en GitHub.

```bash
cat > "$SCRATCH/issue_body.md" << 'EOF'
## Objetivo
OBJETIVO

## Criterios de Aceptación
- [ ] criterio1
- [ ] criterio2
EOF

"C:/Program Files/GitHub CLI/gh.exe" issue create --repo GianFaggi/Zynis-MTF --title "[TIPO] descripción corta" --body-file "$SCRATCH/issue_body.md"
```

La salida incluye la URL del issue (ej: `https://github.com/GianFaggi/Zynis-MTF/issues/5`). Extraé el número de la URL.

---

**Paso 5 — Crear el branch**

Desde un `main` actualizado (solo `git checkout`, `git pull` y `git branch` están permitidos):

```bash
git checkout main
git pull
git checkout -b {tipo}/{número}-{slug}
```

El tipo va en minúscula (`feat`, `fix`, …) y el slug es corto, en español y en kebab-case (ej: `feat/47-lapiz-tactil`). Si el árbol tiene cambios sin commitear, `git checkout -b` los lleva al branch nuevo: está bien cuando son de esta exploración (por ejemplo un mockup en `design/`), y decile al usuario cuáles pasaron. Si son de otro trabajo o `git pull` choca con ellos, avisá y no cambies de branch.

---

**Paso 6 — Escribir active.md**

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

## Exploración
**Decidido:**
- [decisiones confirmadas en el Paso 2]

**Fuera de alcance:**
- [lo que quedó afuera]

**Abierto para `/opsx:propose`:**
- [preguntas que quedaron sin resolver, o "nada"]

## Contexto técnico
[archivos, specs, KBs y ADRs relevantes encontrados al explorar]

## Estado
🔄 En curso

## Archivos Modificados
(vacío)

## Pendientes
(por completar)
```

Confirmá al usuario con la URL del issue y el branch, y sugerí `/opsx:propose` como próximo paso (que va a partir de la sección Exploración).
