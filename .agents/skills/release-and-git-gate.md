---
name: release-and-git-gate
description: Verificación final del Definition of Done y bloqueo de git hasta autorización explícita del usuario.
---

# Skill: RELEASE & GIT GATE

## Verificaciones previas (todas obligatorias)
- [ ] `npm run typecheck` -> sin errores.
- [ ] `npm run test` -> todo verde.
- [ ] `npm run test:vitest` -> todo verde.
- [ ] `npm run lint` -> sin errores nuevos.
- [ ] Sin regresiones vs. línea base.
- [ ] Sin comentarios con nombres de cliente/proveedor.

## Git Gate (INMUTABLE)
1. Ejecutar solo lecturas: `git status`, `git diff`, `git log --oneline -20`.
2. Preparar mensaje de commit y resumen del diff.
3. **DETENERSE**. No ejecutar `commit` ni `push`.
4. Presentar al usuario: resumen + evidencia + mensaje de commit propuesto.
5. Esperar orden textual de autorización.
6. Solo tras "puedes hacer commit/push" ejecutar la operación.

## Mensaje de commit sugerido (sin ejecutar)
```
<type>(<scope>): <descripción breve>

- <detalle 1>
- <detalle 2>

Pruebas: typecheck OK, tests OK, lint OK
```
