---
name: bugfix-hotfix
description: Flujo incondicional para resolver bugs, fallas, excepciones o caídas de servicio siguiendo el Bloque 1 (Reglas 1-11) con 15 subagentes.
---

# Skill: BUGFIX / HOTFIX

## Disparador
Cualquier reporte de bug, falla, excepción, caída de servicio o comportamiento anómalo.

## Pasos obligatorios
1. **Intake de insumos**: recopilar logs, capturas, trazas, payloads y configuración (Reglas 1, 2).
2. **Despliegue de 15 subagentes** (Regla 3) usando los roles de `../agents/` + variantes por capa.
3. **Evidencia real**: leer código y logs; prohibido suponer (Reglas 4, 5).
4. **Diagnóstico de causa raíz** con trazas concretas (archivo:línea).
5. **Diseño de la corrección** sin romper contratos (Reglas 6, 7).
6. **Implementación** mínima y enfocada.
7. **Pruebas del agente**: `npm run typecheck`, `npm run test`, `npm run test:vitest`, `npm run lint` (Regla 9).
8. **Verificación de efectos colaterales** (Regla 8).
9. **Reporte al usuario** con evidencia. Pedir prueba local.
10. **Git bloqueado** hasta autorización (Regla 10).
11. **Comentarios limpios**, sin nombres de cliente/proveedor (Regla 11).

## Salida esperada
- Causa raíz + evidencia (logs/líneas).
- Diff de la corrección.
- Resultado de pruebas.
- Petición de confirmación local.
