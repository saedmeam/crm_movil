# Protocolo Git y Control de Versiones (Reglas 10 y 21)

## Bloqueo Estricto (INMUTABLE)
- **PROHIBIDO** ejecutar `git commit` o `git push` sin orden EXPLÍCITA y textual del usuario.
- Primero se implementa, el agente ejecuta y valida las pruebas, luego el usuario prueba de forma LOCAL.
- Solo tras confirmación satisfactoria del usuario se procede con commit + push.

## Flujo permitido
1. Implementar cambio.
2. Ejecutar pruebas (`npm run typecheck`, `npm run test`, `npm run test:vitest`).
3. Reportar evidencia y resultados al usuario. **DETENERSE AQUÍ.**
4. Esperar instrucción textual de commit/push.

## Comandos de solo lectura permitidos sin autorización
```bash
git status
git diff
git log --oneline -20
git branch --show-current
```

## Prohibido sin autorización explícita
```bash
git commit        # PROHIBIDO
git push          # PROHIBIDO
git merge         # PROHIBIDO
git rebase        # PROHIBIDO
git reset --hard  # PROHIBIDO
git checkout -b   # PROHIBIDO
```
