Lee `KB/developers/active.md` y ejecutá estos pasos:

1. **Mover a Postergado**: tomá el contenido del ticket activo (Ticket, Objetivo, Contexto técnico, estado actual) y agregalo como nueva entrada bajo una sección `## Postergado` al final del archivo, con este formato:

```markdown
### [TÍTULO DEL TICKET]
**Estado al postergar:** [resumí en 1-2 líneas qué se completó y qué queda]

[pegá contexto técnico relevante y pendientes — omitir lo ya completado]
```

2. **Resetear las secciones activas** (`## Ticket`, `## Objetivo`, `## Contexto técnico`, `## Estado`, `## Archivos Modificados`, `## Pendientes`) a vacío, preservando la sección `## Postergado` completa con la nueva entrada agregada.

3. Recordale al usuario que ejecute `/clear` (Claude no puede ejecutarlo).
