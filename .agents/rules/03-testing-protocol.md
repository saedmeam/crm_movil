# Protocolo de Pruebas (Reglas 9, 20)

## Principio: Pruebas Primero (antes de entregar)
El agente SIEMPRE ejecuta y valida las pruebas antes de reportar. Nunca se entrega código sin evidencia de prueba.

## Suite del proyecto
- Framework: **Vitest** (`vitest.config.ts`) + runner propio en `src/tests/`.
- Ubicación de pruebas: `src/tests/unit/` y `src/tests/desktop/`.
- Comandos:
```bash
npm run typecheck      # 1) Tipado estricto obligatorio
npm run test           # 2) Runner de pruebas
npm run test:vitest    # 2b) Vitest
npm run lint           # 3) ESLint
```

## Protocolo de no-regresión (Reglas 6, 8, 17, 19)
1. Ejecutar TODA la suite antes y después del cambio.
2. Comparar resultados. Cualquier test que pase de verde a rojo = regresión = BLOQUEANTE.
3. Verificar errores colaterales: imports rotos, contratos de puertos, mappers, adapters, build.
4. Reportar: qué se probó, resultado, y evidencia.

## Cobertura relevante existente
adapters, agenda, catalog-manager, config-screens, date-formatter, error-handler/http,
hl7-helper, imaging-assignment, mappers, patient-csv, permissions-and-columns, services, desktop-evaluation.
