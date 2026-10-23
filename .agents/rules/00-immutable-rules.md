# Reglas Inmutables (22) — Cumplimiento Estricto

> Fuente de verdad: `./AGENTS.md`. Este archivo es una copia operativa para los subagentes.
> **Aplican al 100% de las interacciones. Ningún agente, skill o flujo puede omitirlas.**

---

## BLOQUE 1 — PROTOCOLO POR SOLUCIÓN DE UN ERROR (BUGFIX / HOTFIX)

*Aplica de forma inmediata e incondicional ante cualquier reporte de bug, falla, excepción, caída de servicio o comportamiento anómalo.*

1. Analizar y revisar a fondo el error que se está enviando.
2. Revisar detenidamente los insumos compartidos (logs, capturas, trazas, payloads, configuraciones) para revisar el error a fondo.
3. Utilizar 15 subagentes para la comprensión y lectura del error, y llegar a una solución óptima que cubra estos errores en su totalidad.
4. No asumir nada.
5. 100% REAL, nada de suposición. Toda afirmación o cambio debe basarse en evidencia tangible en código y logs reales.
6. No romper nada: la aplicación está en certificación con usuarios. Retrocompatibilidad y estabilidad críticas.
7. Seguir estrictamente los lineamientos y directrices del proyecto (convenciones de código, arquitectura y estándares).
8. Verificar que la solución no dé errores colaterales, transversales o secundarios provocados por la implementación.
9. Realizar primero las pruebas de la implementación (el agente) y luego el usuario las confirma localmente.
10. No hacer commit ni push antes de que el usuario lo indique (primero se prueba local; si es satisfactorio, se hace commit + push).
11. No agregar comentarios con nombres o alusiones a nombres del cliente o proveedor. Comentarios descriptivos, objetivos, directos, funcionales y de negocio.

---

## BLOQUE 2 — PROTOCOLO POR NUEVO DESARROLLO O REQUERIMIENTO (HUs / TAREAS)

*Aplica de forma incondicional ante nuevas funcionalidades, módulos, HUs, endpoints, vistas o integraciones.*

12. Analizar y revisar a fondo el nuevo requerimiento que se está enviando.
13. Revisar detenidamente todos los insumos compartidos para cubrir el 100% de lo que solicita la HU o tarea.
14. Utilizar entre 10 a 15 subagentes para la comprensión y lectura del requerimiento y llegar a una solución óptima.
15. No asumir nada.
16. 100% REAL, nada de suposición. Todo diseño responde a especificaciones reales y validadas.
17. No romper nada: cero regresiones en funcionalidades existentes.
18. Seguir estrictamente los lineamientos y directrices del proyecto actual.
19. Verificar que la solución no genere errores colaterales, transversales o secundarios.
20. Realizar primero las pruebas de la implementación y luego el usuario las confirma localmente.
21. No hacer commit ni push antes de que el usuario lo indique.
22. No agregar comentarios con nombres o alusiones a nombres del cliente o proveedor.

---

## Resumen de Cumplimiento Transversal

| Pilar | Reglas | Aplicación |
| :--- | :--- | :--- |
| Análisis e Insumos | 1, 2, 12, 13 | Revisión exhaustiva de logs, trazas, contratos y especificaciones. |
| Multi-Agente 360° | 3, 14 | Despliegue de 10–15 subagentes especializados. |
| Cero Suposiciones | 4, 5, 15, 16 | 100% basado en evidencia real de código, BD y logs. |
| Protección de Certificación | 6, 8, 17, 19 | Cero regresiones, cero errores colaterales. |
| Arquitectura y Lineamientos | 7, 18 | Respeto riguroso de estructura, patrones y convenciones. |
| Pruebas Primero | 9, 20 | El agente ejecuta y valida pruebas antes de entregar. |
| Bloqueo de Git | 10, 21 | Prohibido commit/push sin orden explícita del usuario. |
| Comentarios Limpios | 11, 22 | Cero menciones a clientes/proveedores. |
